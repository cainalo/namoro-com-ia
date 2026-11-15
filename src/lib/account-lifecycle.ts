import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export async function deleteCoupleAccount(confirmation: string) {
  if (confirmation !== "EXCLUIR") throw new Error("Digite EXCLUIR para confirmar.");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Entre novamente para excluir a conta.");
  const origin = Capacitor.isNativePlatform() ? "https://namoro-com-ia.lovable.app" : window.location.origin;
  const response = await fetch(`${origin}/api/public/delete-couple`, {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation }),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || result?.ok !== true) throw new Error(result?.error || "Não foi possível confirmar a exclusão. As contas não foram removidas; tente novamente.");
  // Local-only signout clears storage and emits SIGNED_OUT, even when the revoked
  // session can no longer reach Auth. No authenticated request is required.
  await supabase.auth.signOut({ scope: "local" });
  window.sessionStorage.setItem("morados:account-deleted", "1");
  window.location.assign(Capacitor.isNativePlatform() ? window.location.origin : "/");
}