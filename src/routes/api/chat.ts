import { createFileRoute } from "@tanstack/react-router";
import { streamResponse, GatewayError, PaymentRequiredError, RateLimitError } from "@lovable.dev/ai-gateway";
import type { ResponsesInputItem } from "@lovable.dev/ai-gateway";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

const INSTRUCTIONS =
  "Você é a IA do NAMORO: uma conselheira gentil, bem-humorada e sincera sobre namoro, relacionamentos e romance. " +
  "Responda sempre em português do Brasil, de forma curta, calorosa e prática. Use parágrafos curtos. " +
  "Escreva apenas texto simples: nunca use markdown, asteriscos, negrito, títulos ou listas com hífen.";

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function createNetlifyAiResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL?.replace(/\\/+$/, "");

  if (!apiKey || !baseUrl) {
    return jsonError(
      "O assistente de IA ainda não está ativo neste ambiente. Aguarde a ativação do Netlify AI Gateway após o primeiro deploy de produção.",
      503,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-6-astra",
        messages: [
          { role: "system", content: INSTRUCTIONS },
          ...messages,
        ],
        stream: true,
      }),
    });
  } catch (error) {
    console.error("Netlify AI Gateway connection failed", error);
    return jsonError("Não foi possível conectar ao assistente de IA agora.", 502);
  }

  if (!upstream.ok) {
    const status = upstream.status;
    console.error("Netlify AI Gateway returned an error", { status });
    if (status === 429) {
      return jsonError("O limite de uso do assistente foi atingido. Tente novamente mais tarde.", 429);
    }
    if (status === 402) {
      return jsonError("Os créditos de IA do site acabaram. Verifique o uso no Netlify.", 402);
    }
    return jsonError("O assistente de IA não conseguiu responder agora. Tente novamente.", 502);
  }

  if (!upstream.body) {
    return jsonError("O assistente de IA não iniciou a resposta.", 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      let eventData: string[] = [];
      let finished = false;

      function emitEvent() {
        if (eventData.length === 0) return;
        const payload = eventData.join("\\n");
        eventData = [];
        if (!payload || payload === "[DONE]") {
          finished = payload === "[DONE]";
          return;
        }

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: unknown } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          // Ignore non-JSON SSE events; text deltas are handled above.
        }
      }

      try {
        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf("\\n");

          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).replace(/\\r$/, "");
            buffer = buffer.slice(newlineIndex + 1);

            if (line === "") {
              emitEvent();
              if (finished) break;
            } else if (line.startsWith("data:")) {
              eventData.push(line.slice(5).trimStart());
            }

            newlineIndex = buffer.indexOf("\\n");
          }
        }

        if (!finished) {
          buffer += decoder.decode();
          if (buffer.startsWith("data:")) eventData.push(buffer.slice(5).trimStart());
          emitEvent();
        }

        controller.close();
      } catch (error) {
        console.error("Netlify AI Gateway stream failed", error);
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

        if (!accessToken) {
          return jsonError("Autenticação necessária.", 401);
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(accessToken);

        if (authError || !user) {
          return jsonError("Sessão inválida. Entre novamente.", 401);
        }

        const parsed = BodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonError("Mensagem inválida.", 400);

        if (process.env.OPENAI_API_KEY && process.env.OPENAI_BASE_URL) {
          return createNetlifyAiResponse(parsed.data.messages);
        }

        if (!process.env.LOVABLE_API_KEY) {
          return jsonError(
            "O assistente de IA não está configurado neste ambiente.",
            503,
          );
        }

        const input: ResponsesInputItem[] = parsed.data.messages.map((m) =>
          m.role === "user"
            ? { role: "user", content: m.content }
            : {
                role: "assistant",
                content: [{ type: "output_text", text: m.content, annotations: [] }],
              },
        );

        let stream;
        try {
          stream = await streamResponse({
            model: "openai/gpt-6-astra",
            instructions: INSTRUCTIONS,
            input,
          });
        } catch (error) {
          console.error("chat start failed", error);
          if (error instanceof PaymentRequiredError)
            return jsonError("Os créditos de IA acabaram. Adicione créditos para continuar.", 402);
          if (error instanceof RateLimitError)
            return jsonError("Muitas mensagens de uma vez. Tente de novo em instantes.", 429);
          if (error instanceof GatewayError)
            return jsonError("A IA não conseguiu responder agora. Tente novamente.", 502);
          return jsonError("Algo deu errado. Tente novamente.", 500);
        }

        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const event of stream) {
                if (event.type === "response.output_text.delta") {
                  controller.enqueue(encoder.encode(event.delta));
                }
              }
              controller.close();
            } catch (error) {
              console.error("chat stream failed", error);
              controller.error(error);
            }
          },
        });

        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-cache",
          },
        });
      },
    },
  },
});
