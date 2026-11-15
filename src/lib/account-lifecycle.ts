import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

type DeleteFunctionResponse = {
  ok?: boolean;
  error?: string;
};

async function getDeleteFunctionError(error: unknown): Promise<Error> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof context === "object" && "clone" in context) {
    const response = context as Response;
    const payload = await response.clone().json().catch(() => null) as DeleteFunctionResponse | null;
    if (payload?.error) return new Error(payload.error);
  }

  const message = error instanceof Error ? error.message : "";
  if (/fetch|network|connection/i.test(message)) {
    return new Error("Não foi possível conectar ao serviço seguro de exclusão. Verifique sua internet e tente novamente.");
  }
  return new Error(message || "Não foi possível concluir a exclusão. As contas continuam ativas; tente novamente.");
}

export async function deleteCoupleAccount(confirmation: string) {
  if (confirmation !== "EXCLUIR") throw new Error("Digite EXCLUIR para confirmar.");

  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error("Não foi possível verificar sua sessão. Entre novamente e tente excluir a conta.");
  if (!data.session) throw new Error("Entre novamente para excluir a conta.");

  // Calling Supabase directly avoids a request from the Android WebView to the
  // Lovable website origin (which is not the account-deletion backend).
  const { data: result, error } = await supabase.functions.invoke<DeleteFunctionResponse>(
    "delete-couple",
    { body: { confirmation } },
  );

  if (error) throw await getDeleteFunctionError(error);
  if (result?.ok !== true) {
    throw new Error(result?.error || "Não foi possível concluir a exclusão. As contas continuam ativas; tente novamente.");
  }

  // The database transaction has already removed both accounts and their data.
  // A local-only signout does not depend on the now-revoked Auth session.
  await supabase.auth.signOut({ scope: "local" });
  window.sessionStorage.setItem("morados:account-deleted", "1");
  window.location.assign(Capacitor.isNativePlatform() ? window.location.origin : "/");
}
