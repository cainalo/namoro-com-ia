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
