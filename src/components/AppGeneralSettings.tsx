import { useState } from "react";
import { Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteCoupleAccount } from "@/lib/account-lifecycle";

export function AppGeneralSettings() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><Settings /> Configurações gerais do app</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); setConfirming(false); setConfirmation(""); setError(null); } }}>
      <DialogContent>
        <DialogTitle>Configurações gerais do app</DialogTitle>
        <DialogDescription>Conta e dados do espaço de vocês.</DialogDescription>
        {!confirming ? <Button variant="destructive" onClick={() => setConfirming(true)}><Trash2 /> Excluir conta do casal</Button> : <div className="grid gap-4">
          <h2 className="font-semibold text-destructive">Excluir permanentemente</h2>
          <p className="text-sm text-muted-foreground">As duas contas e todas as publicações, mensagens, mídias, memórias, planos, partidas e estados de jogos, preferências e demais dados do casal serão apagados permanentemente. Os dois e-mails ficarão livres para um novo cadastro. Não é possível desfazer. Se esta conta ainda não tem casal, somente ela será excluída.</p>
          <label className="grid gap-2 text-sm">Digite EXCLUIR<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={busy || confirmation !== "EXCLUIR"} onClick={async () => {
              setBusy(true); setError(null);
              try { await deleteCoupleAccount(confirmation); }
              catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir."); setBusy(false); }
            }}><Trash2 /> {busy ? "Excluindo…" : "Excluir definitivamente"}</Button>
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}