import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Heart, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function startNewConversation() {
    if (loading) return;
    setMessages([]);
    setInput("");
    setError(null);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "A IA não conseguiu responder agora.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
      }
      if (!reply) throw new Error("A IA não respondeu. Tente novamente.");
    } catch (err) {
      setMessages((prev) =>
        prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev,
      );
      setInput((current) => current || text);
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="love"
        size="icon"
        aria-label="Conversar com a IA"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full"
      >
        <Heart className="h-6 w-6" fill="currentColor" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-5 text-left">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="font-display text-2xl tracking-[0.2em]">MORADOS · IA</SheetTitle>
              <button
                type="button"
                className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                onClick={startNewConversation}
                disabled={loading || messages.length === 0}
              >
                Nova conversa
              </button>
            </div>
            <SheetDescription>Pergunte quando quiser uma ajuda para pensar, planejar ou conversar.</SheetDescription>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {messages.length === 0 && (
              <p className="pt-10 text-center text-sm text-muted-foreground">
                Diga oi para começar a conversa.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                    : "mr-auto rounded-bl-md bg-muted text-foreground",
                )}
              >
                {m.content || <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            ))}
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
          </div>

          <form onSubmit={send} className="flex items-end gap-2 border-t px-4 py-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Escreva sua mensagem…"
              aria-label="Mensagem"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-ring"
            />
            <Button
              type="submit"
              variant="love"
              size="icon"
              aria-label="Enviar"
              disabled={loading || !input.trim()}
              className="h-11 w-11 shrink-0 rounded-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
