import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "couple-media";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

type DeletionResult = {
  ok?: boolean;
  deleted_couple_ids?: string[];
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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Método não permitido." });
  }

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

    // First commit the account and relational-data deletion. A transient database
    // failure must never destroy stored media while leaving the accounts active.
    const { data: deletion, error: deletionError } = await admin.rpc<DeletionResult>(
      "delete_couple_account_bundle",
      { p_actor_id: authData.user.id },
    );

    if (deletionError || deletion?.ok !== true) {
      console.error("[delete-couple] Database erasure failed:", deletionError?.message ?? "unexpected RPC result");
      return jsonResponse(500, {
        ok: false,
        error: "Não foi possível concluir a exclusão. As contas e as mídias continuam preservadas; tente novamente.",
      });
    }

    const coupleIds = Array.isArray(deletion.deleted_couple_ids)
      ? deletion.deleted_couple_ids.filter((id): id is string => typeof id === "string")
      : [];

    // Media removal happens only after the database confirms the account erasure.
    // If Storage is temporarily unavailable, the objects stay in a private bucket
    // and are inaccessible to normal users because their couple memberships are gone.
    const mediaCleanupComplete = await retryMediaCleanup(admin, coupleIds);
    if (!mediaCleanupComplete) {
      return jsonResponse(200, {
        ok: true,
        mediaCleanupPending: true,
        warning: "A conta foi excluída, mas alguns arquivos privados não puderam ser removidos agora. Eles permanecem privados e inacessíveis pelo aplicativo.",
      });
    }

    return jsonResponse(200, { ok: true, mediaCleanupPending: false });
  } catch (error) {
    console.error("[delete-couple] Request failed:", error);
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "Não foi possível concluir a exclusão. Tente novamente.",
    });
  }
});
