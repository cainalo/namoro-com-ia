import { useId, useState } from "react";
import { ChevronDown, Settings, Trash2 } from "lucide-react";
import { deleteCoupleAccount } from "@/lib/account-lifecycle";

export function AppGeneralSettings() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeSettings() {
    if (busy) return;
    setOpen(false);
    setConfirming(false);
    setConfirmation("");
    setError(null);
  }

  return (
    <section className="app-general-settings">
      <button
        type="button"
        className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open) {
            closeSettings();
          } else {
            setOpen(true);
            setConfirming(false);
            setConfirmation("");
            setError(null);
          }
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
          Configurações gerais do app
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Configurações gerais do app"
          className="mt-3 grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="grid gap-1">
            <h2 className="text-base font-semibold text-foreground">Conta e dados do casal</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Gerencie sua conta e o espaço compartilhado.
            </p>
          </div>

          {!confirming ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              onClick={() => {
                setConfirming(true);
                setError(null);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Excluir conta do casal
            </button>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <h3 className="font-semibold text-destructive">Excluir permanentemente</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  As duas contas e todas as publicações, mensagens, mídias, memórias, planos,
                  partidas e estados de jogos, preferências e demais dados do casal serão
                  apagados permanentemente. Os dois e-mails ficarão livres para um novo
                  cadastro. Não é possível desfazer. Se esta conta ainda não tem casal,
                  somente ela será excluída.
                </p>
              </div>

              <label className="grid gap-2 text-sm font-medium text-foreground">
                Digite EXCLUIR
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={busy}
                  autoComplete="off"
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                />
              </label>

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="min-h-10 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                  onClick={() => {
                    setConfirming(false);
                    setConfirmation("");
                    setError(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy || confirmation !== "EXCLUIR"}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await deleteCoupleAccount(confirmation);
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : "Não foi possível excluir.");
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {busy ? "Excluindo…" : "Excluir definitivamente"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
