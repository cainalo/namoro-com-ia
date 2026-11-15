import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "couple-media";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function readDefaultKey(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.default === "string") return parsed.default;
    const values = Object.values(parsed).filter((value): value is string => typeof value === "string");
    return values.length === 1 ? values[0] : null;
  } catch {
    return raw;
  }
}

async function collectFiles(
  admin: ReturnType<typeof createClient>,
  prefix: string,
  files: string[],
): Promise<void> {
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw new Error("Não foi possível listar os arquivos privados do casal.");

    for (const entry of data ?? []) {
      const path = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.id) {
        files.push(path);
      } else {
        await collectFiles(admin, path, files);
      }
    }

    if (!data || data.length < 1000) break;
    offset += data.length;
  }
}

async function removeCoupleFiles(
  admin: ReturnType<typeof createClient>,
  coupleIds: string[],
): Promise<void> {
  const files: string[] = [];
  for (const coupleId of coupleIds) {
    await collectFiles(admin, coupleId, files);
  }

  for (let index = 0; index < files.length; index += 100) {
    const batch = files.slice(index, index + 100);
    const { error } = await admin.storage.from(BUCKET).remove(batch);
    if (error) throw new Error("Não foi possível remover todos os arquivos privados do casal.");
  }
}

async function retryMediaCleanup(
  admin: ReturnType<typeof createClient>,
  coupleIds: string[],
): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await removeCoupleFiles(admin, coupleIds);
      return true;
    } catch (error) {
      console.error("[delete-couple] Storage cleanup attempt failed:", {
        attempt: attempt + 1,
        message: error instanceof Error ? error.message : "unknown error",
      });
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return false;
}

async function getDeletionScope(
  admin: ReturnType<typeof createClient>,
  actorId: string,
): Promise<string[]> {
  const { data: ownCurrentMemberships, error: ownMembershipError } = await admin
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", actorId)
    .is("ended_at", null);

  if (ownMembershipError) throw new Error("Não foi possível consultar a relação do casal.");

  const activeCoupleIds = [...new Set((ownCurrentMemberships ?? []).map((row) => row.couple_id as string))];
  if (activeCoupleIds.length > 1) {
    throw new Error("A conta possui mais de um vínculo atual; a exclusão foi interrompida por segurança.");
  }

  const { data: currentMembers, error: membersError } = activeCoupleIds.length
    ? await admin.from("couple_members")
        .select("user_id")
        .eq("couple_id", activeCoupleIds[0])
        .is("ended_at", null)
    : { data: [], error: null };

  if (membersError) throw new Error("Não foi possível consultar os integrantes do casal.");

  const targetUserIds = [...new Set([
    actorId,
    ...(currentMembers ?? []).map((row) => row.user_id as string),
  ])];

  const { data: memberships, error: historyError } = await admin
    .from("couple_members")
    .select("couple_id")
    .in("user_id", targetUserIds);

  if (historyError) throw new Error("Não foi possível consultar o histórico do casal.");

  const { data: createdCouples, error: createdError } = await admin
    .from("couples")
    .select("id")
    .in("created_by", targetUserIds);

  if (createdError) throw new Error("Não foi possível consultar os espaços criados pela conta.");

  const coupleIds = new Set<string>(activeCoupleIds);
  for (const row of memberships ?? []) {
    if (typeof row.couple_id === "string") coupleIds.add(row.couple_id);
  }
  for (const row of createdCouples ?? []) {
    if (typeof row.id === "string") coupleIds.add(row.id);
  }

  return [...coupleIds];
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Método não permitido." });
  }

  let mediaCleanupSucceeded = false;
  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) {
      return jsonResponse(401, { ok: false, error: "Entre novamente para confirmar a exclusão." });
    }

    const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;
    if (body?.confirmation !== "EXCLUIR") {
      return jsonResponse(400, { ok: false, error: "Digite EXCLUIR para confirmar." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      readDefaultKey(Deno.env.get("SUPABASE_SECRET_KEYS"));

    if (!supabaseUrl || !secretKey) {
      console.error("[delete-couple] Supabase server credentials are unavailable.");
      return jsonResponse(503, {
        ok: false,
        error: "O serviço seguro de exclusão ainda não está configurado. Nenhuma conta foi removida.",
      });
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return jsonResponse(401, { ok: false, error: "Sua sessão expirou. Entre novamente e tente excluir a conta." });
    }

    const coupleIds = await getDeletionScope(admin, authData.user.id);
    const hadCoupleScope = coupleIds.length > 0;

    // Supabase prevents deleting an Auth user who still owns Storage objects.
    // Remove the private couple files first, then perform the relational erasure.
    const mediaCleanupComplete = await retryMediaCleanup(admin, coupleIds);
    if (!mediaCleanupComplete) {
      return jsonResponse(500, {
        ok: false,
        error: "A remoção dos anexos não foi concluída. Alguns arquivos podem já ter sido removidos, mas as contas e os demais dados continuam preservados. Tente novamente.",
      });
    }
    mediaCleanupSucceeded = true;

    const { data: deletion, error: deletionError } = await admin.rpc(
      "delete_couple_account_bundle",
      { p_actor_id: authData.user.id },
    );

    if (deletionError || deletion?.ok !== true) {
      console.error("[delete-couple] Database erasure failed after Storage cleanup:", deletionError?.message ?? "unexpected RPC result");
      return jsonResponse(500, {
        ok: false,
        mediaCleanupAttempted: hadCoupleScope,
        error: hadCoupleScope
          ? "A limpeza dos arquivos dos vínculos identificados foi concluída, mas a exclusão das contas e dos demais dados não foi confirmada. As contas e os dados continuam preservados; tente novamente. Um convite aceito durante o processo pode exigir uma nova tentativa."
          : "A exclusão das contas não foi concluída. Como não havia arquivos de vínculo para limpar, as contas, os dados e as mídias permanecem preservados. Tente novamente.",
      });
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    console.error("[delete-couple] Request failed:", error);
    if (mediaCleanupSucceeded) {
      return jsonResponse(500, {
        ok: false,
        mediaAlreadyRemoved: true,
        error: "A limpeza dos arquivos dos vínculos identificados foi concluída, mas a exclusão das contas e dos demais dados não foi confirmada. As contas e os dados continuam preservados. Tente novamente.",
      });
    }
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "Não foi possível concluir a exclusão. Tente novamente.",
    });
  }
});
