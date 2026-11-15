import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { callCoupleRpc } from "./couple-rpc";

export function validateCoupleCredentials(email: string, partnerEmail: string, password: string) {
  const emails = [email, partnerEmail].map((value) => value.trim().toLowerCase());
  if (emails.some((value) => value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    throw new Error("Informe dois e-mails válidos.");
  }
  if (emails[0] === emails[1]) throw new Error("Os dois e-mails precisam ser diferentes.");
  if (password.length < 8) throw new Error("A senha compartilhada precisa ter pelo menos 8 caracteres.");
  return { email: emails[0], partnerEmail: emails[1], password };
}

export const PAIRING_NOTICE = "Solicitações de cadastro enviadas. Confirmem os dois endereços de e-mail e entrem com a senha compartilhada. O casal só será conectado após a confirmação dos dois acessos.";

// Pairing status is handled independently from individual account access.
export async function completeCouplePairing() {
  const { data: verified, error } = await supabase.auth.getUser();
  if (error || !verified.user) return { pending: false, error: null };
  const token = verified.user.user_metadata?.["morados_pair_token"];
  if (typeof token !== "string") return { pending: false, error: null };
  const result = await callCoupleRpc("complete_couple_pairing", { p_token: token });
  if (result.error) {
    return { pending: true, error: result.error.code === "PGRST202"
      ? "O pareamento ainda depende da atualização do Supabase. Nenhum casal foi confirmado."
      : result.error.message.includes("pair_waiting")
        ? "Confirmem os dois e-mails para concluir o cadastro do casal. Depois, tente novamente."
        : "Não foi possível concluir o pareamento. Confira se os dois cadastros foram concluídos; contas existentes não são vinculadas automaticamente." };
  }
  // Refresh temporary metadata in the local session after the transaction clears it.
  await supabase.auth.refreshSession();
  return { pending: false, error: null };
}

export async function submitCoupleSignups(
  client: Pick<SupabaseClient, "auth">,
  credentials: ReturnType<typeof validateCoupleCredentials>,
  token: string,
  redirect: string,
) {
  const redirectUrl = new URL(redirect);
  redirectUrl.searchParams.set("pair", token);
  const create = async (email: string, reciprocalEmail: string) => client.auth.signUp({
    email, password: credentials.password,
    options: { emailRedirectTo: redirectUrl.toString(), data: {
      morados_pair_token: token, morados_pair_email: reciprocalEmail,
    } },
  });
  const first = await create(credentials.email, credentials.partnerEmail);
  if (first.error || !first.data.user || first.data.user.identities?.length === 0) {
    throw new Error("O primeiro cadastro não foi confirmado. O e-mail pode já estar cadastrado ou houve uma falha de conexão. Nenhum pareamento foi feito.");
  }
  const second = await create(credentials.partnerEmail, credentials.email);
  if (second.error || !second.data.user || second.data.user.identities?.length === 0) {
    throw new Error("O primeiro cadastro foi solicitado, mas o segundo não foi confirmado. Não há casal conectado. Confirme o primeiro e-mail para acessar ou excluir esse acesso nas configurações; não vinculamos contas existentes automaticamente.");
  }
}

export async function registerCouple(email: string, partnerEmail: string, password: string, redirect: string) {
  const credentials = validateCoupleCredentials(email, partnerEmail, password);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  // An isolated client never persists/changes the app session during either signup.
  const isolated = createClient(supabase.supabaseUrl, supabase.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  await submitCoupleSignups(isolated, credentials, token, redirect);
  const { error } = await supabase.auth.signInWithPassword({ email: credentials.email, password });
  if (error) {
    if (error.code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed")) return PAIRING_NOTICE;
    throw new Error("As solicitações foram enviadas, mas não foi possível entrar. Confirme os dois e-mails e tente entrar novamente; o casal ainda não foi confirmado.");
  }
  return PAIRING_NOTICE;
}