import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { callCoupleRpc } from "@/lib/couple-rpc";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Convite | Namoro" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: InvitationRoute,
});

function InvitationRoute() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acceptInvitation() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const { data, error: rpcError } = await callCoupleRpc(
        "accept_couple_invitation",
        { p_token: token },
      );

      if (rpcError) {
        const message = rpcError.message.toLowerCase();
        setError(
          message.includes("account_already_linked")
            ? "Esta conta já está vinculada a outro espaço."
            : "Este convite não está mais disponível.",
        );
        return;
      }

      if (typeof data !== "string" || !data) {
        setError("Este convite não está mais disponível.");
        return;
      }

      await navigate({ to: "/", replace: true });
    } catch {
      setError("Não foi possível aceitar o convite. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate emailRedirectTo={() => window.location.href}>
      {() => (
        <main className="auth-shell">
          <section className="auth-panel invite-panel" aria-labelledby="invite-title">
            <div className="auth-brand">
              <span className="pair-mark auth-mark" aria-hidden="true">
                <span />
                <span />
              </span>
              <span>namoro</span>
            </div>

            <h1 id="invite-title">Convite para o espaço de vocês</h1>
            <p className="invite-copy">Entre com sua conta para aceitar o convite.</p>

            {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}

            <button type="button" className="auth-submit" onClick={acceptInvitation} disabled={busy}>
              <span>{busy ? "Aguarde…" : "Aceitar convite"}</span>
              <ArrowRight aria-hidden="true" />
            </button>

            <button
              type="button"
              className="invite-back"
              onClick={() => void navigate({ to: "/", replace: true })}
              disabled={busy}
            >
              Agora não
            </button>
          </section>
        </main>
      )}
    </AuthGate>
  );
}
