import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function createTurnCredential(
  sharedSecret: string,
  username: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sharedSecret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(username));
  return toBase64(new Uint8Array(digest));
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse(405, { ok: false, error: "Método não permitido." });

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) return jsonResponse(401, { ok: false, error: "Entre novamente para iniciar a chamada." });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !anonKey) {
      console.error("[get-call-ice-servers] Supabase public configuration is missing.");
      return jsonResponse(503, { ok: false, error: "A configuração segura das chamadas não está disponível." });
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: "Bearer " + accessToken } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const { data: authData, error: authError } = await client.auth.getUser(accessToken);
    if (authError || !authData.user) return jsonResponse(401, { ok: false, error: "Sua sessão expirou. Entre novamente." });

    const body = await request.json().catch(() => null) as { coupleId?: unknown } | null;
    if (!body || !isUuid(body.coupleId)) return jsonResponse(400, { ok: false, error: "Vínculo do casal inválido." });

    const { data: couple, error: coupleError } = await client
      .from("couples")
      .select("id")
      .eq("id", body.coupleId)
      .eq("status", "active")
      .maybeSingle();

    if (coupleError || !couple) return jsonResponse(403, { ok: false, error: "Somente integrantes de um casal ativo podem iniciar chamadas." });

    const { data: memberships, error: membersError } = await client
      .from("couple_members")
      .select("user_id")
      .eq("couple_id", body.coupleId)
      .is("ended_at", null);

    const memberIds = [...new Set((memberships ?? []).map((member) => member.user_id))];
    if (membersError || memberIds.length !== 2 || !memberIds.includes(authData.user.id)) {
      return jsonResponse(403, { ok: false, error: "A chamada está disponível somente para os dois integrantes atuais do casal." });
    }

    const urls = (Deno.env.get("TURN_URLS") ?? "")
      .split(",")
      .map((url) => url.trim())
      .filter((url) => /^turns?:/i.test(url));

    const sharedSecret = Deno.env.get("TURN_SHARED_SECRET");
    if (urls.length === 0 || !sharedSecret) {
      return jsonResponse(200, {
        ok: true,
        iceServers: STUN_SERVERS,
        turnConfigured: false,
        credentialExpiresAt: null,
      });
    }

    // Coturn's TURN REST API: short-lived HMAC-SHA1 credentials.
    // The shared secret remains in Supabase and is never sent to the app.
    const ttlSeconds = 12 * 60 * 60;
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = expiresAt + ":" + authData.user.id;
    const credential = await createTurnCredential(sharedSecret, username);

    const turnServer: RTCIceServer = {
      urls,
      username,
      credential,
    };

    return jsonResponse(200, {
      ok: true,
      iceServers: [...STUN_SERVERS, turnServer],
      turnConfigured: true,
      credentialExpiresAt: new Date(expiresAt * 1000).toISOString(),
    });
  } catch (error) {
    console.error("[get-call-ice-servers] Request failed:", error);
    return jsonResponse(500, { ok: false, error: "Não foi possível preparar a conexão da chamada." });
  }
});
