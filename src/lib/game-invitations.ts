import { supabase } from "@/integrations/supabase/client";

export type OnlineInviteMode = "competitive" | "cooperative";

export type OnlineGameLaunch = {
  invitationId: string;
  gameKey: string;
  mode: OnlineInviteMode;
  matchId: string | null;
};

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type LooseRpc = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
};

const rpc = supabase as unknown as LooseRpc;

export async function createGameInvitation(gameKey: string, mode: OnlineInviteMode) {
  return rpc.rpc("create_couple_game_invitation", {
    p_game_key: gameKey,
    p_game_mode: mode,
  });
}

export async function respondToGameInvitation(invitationId: string, accept: boolean) {
  return rpc.rpc("respond_couple_game_invitation", {
    p_invitation_id: invitationId,
    p_accept: accept,
  });
}

export async function cancelGameInvitation(invitationId: string) {
  return rpc.rpc("cancel_couple_game_invitation", {
    p_invitation_id: invitationId,
  });
}

export function invitationLaunch(row: Record<string, unknown>): OnlineGameLaunch | null {
  if (
    typeof row.id !== "string" ||
    typeof row.game_key !== "string" ||
    (row.game_mode !== "competitive" && row.game_mode !== "cooperative")
  ) return null;

  return {
    invitationId: row.id,
    gameKey: row.game_key,
    mode: row.game_mode,
    matchId: typeof row.match_id === "string" ? row.match_id : null,
  };
}

export function onlineGameInvitationError(message: string, code?: string) {
  if (message.includes("invitation_already_pending") || code === "23505") {
    return "Já existe um convite de partida aguardando resposta. Cancele-o ou espere a resposta antes de enviar outro.";
  }
  if (message.includes("active_match_exists")) {
    return "Já existe uma partida deste jogo em andamento. Retome-a em vez de iniciar outra.";
  }
  if (message.includes("active_couple_required") || message.includes("invalid_couple_members")) {
    return "O espaço compartilhado ainda não está pronto para partidas online.";
  }
  if (message.includes("invitation_not_pending") || message.includes("invitation_expired")) {
    return "Este convite já foi encerrado ou expirou.";
  }
  if (message.includes("not_invitation_recipient")) {
    return "Somente a pessoa convidada pode responder a este convite.";
  }
  if (code === "PGRST202" || code === "42883" || message.includes("could not find the function")) {
    return "O serviço de convites ainda está sendo publicado. Tente novamente em instantes.";
  }
  return "Não foi possível concluir o convite. Verifique a conexão e tente novamente.";
}
