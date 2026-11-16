import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

test("convites globais: só cria partida após aceite, com simetria e controle de acesso", async () => {
  const db = new PGlite();
  const A = "11111111-1111-1111-1111-111111111111";
  const B = "22222222-2222-2222-2222-222222222222";
  const X = "33333333-3333-3333-3333-333333333333";
  const Y = "44444444-4444-4444-4444-444444444444";
  const C = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  await db.exec(readFileSync(here("../../supabase/tests/online-games.base.sql"), "utf8"));
  await db.exec(readFileSync(here("../../supabase/tests/online-games.live-lig4.sql"), "utf8"));
  await db.exec(readFileSync(here("../../supabase/migrations/20261114000000_generic_online_game_matches.sql"), "utf8"));
  await db.exec(readFileSync(here("../../supabase/migrations/20261114170000_add_cave_expedition_online_game.sql"), "utf8"));
  await db.exec(readFileSync(here("../../supabase/migrations/20261116010000_global_couple_game_invitations.sql"), "utf8"));

  async function as<T = any>(uid: string | null, sql: string, params: unknown[] = []) {
    try {
      await db.exec("BEGIN");
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid ?? ""]);
      await db.exec(uid ? "SET LOCAL ROLE authenticated" : "SET LOCAL ROLE anon");
      const result = await db.query<T>(sql, params);
      await db.exec("COMMIT");
      return { rows: result.rows };
    } catch (error: any) {
      await db.exec("ROLLBACK");
      return { error };
    }
  }

  const created = await as<{ create_couple_game_invitation: string }>(
    A,
    "select public.create_couple_game_invitation($1,$2)",
    ["quiz", "competitive"],
  );
  const invitationId = created.rows?.[0]?.create_couple_game_invitation;
  expect(invitationId).toBeTruthy();

  // O pedido não cria partida nem libera um tabuleiro antes do aceite.
  const before = await db.query(
    "select count(*)::int as total from public.couple_game_matches where couple_id=$1 and game_key='quiz' and status='active'",
    [C],
  );
  expect(before.rows[0]?.total).toBe(0);

  // Só o destinatário pode aceitar.
  const senderCannotAccept = await as(A, "select * from public.respond_couple_game_invitation($1,true)", [invitationId]);
  expect(senderCannotAccept.error?.message).toContain("not_invitation_recipient");

  const receiverSeesInvite = await as<{ status: string }>(
    B,
    "select status from public.couple_game_invitations where id=$1",
    [invitationId],
  );
  expect(receiverSeesInvite.rows?.[0]?.status).toBe("pending");

  const accepted = await as<{
    invitation_status: string;
    match_id: string;
    game_key: string;
    game_mode: string;
  }>(B, "select * from public.respond_couple_game_invitation($1,true)", [invitationId]);

  expect(accepted.rows?.[0]?.invitation_status).toBe("accepted");
  expect(accepted.rows?.[0]?.game_key).toBe("quiz");
  expect(accepted.rows?.[0]?.game_mode).toBe("competitive");
  expect(accepted.rows?.[0]?.match_id).toBeTruthy();

  const match = await db.query(
    "select couple_id,game_key,player_one_id,player_two_id,status from public.couple_game_matches where id=$1",
    [accepted.rows![0]!.match_id],
  );
  expect(match.rows[0]).toMatchObject({
    couple_id: C,
    game_key: "quiz",
    status: "active",
  });
  expect(new Set([match.rows[0]?.player_one_id, match.rows[0]?.player_two_id])).toEqual(new Set([A, B]));

  // Convite recusado: não cria partida.
  const declineInvite = await as<{ create_couple_game_invitation: string }>(
    B,
    "select public.create_couple_game_invitation($1,$2)",
    ["cave-expedition", "cooperative"],
  );
  const declineId = declineInvite.rows?.[0]?.create_couple_game_invitation;
  expect(declineId).toBeTruthy();
  const declined = await as<{ invitation_status: string; match_id: string | null }>(
    A,
    "select * from public.respond_couple_game_invitation($1,false)",
    [declineId],
  );
  expect(declined.rows?.[0]?.invitation_status).toBe("declined");
  expect(declined.rows?.[0]?.match_id).toBeNull();
  const noCaveMatch = await db.query(
    "select count(*)::int as total from public.couple_game_matches where couple_id=$1 and game_key='cave-expedition' and status='active'",
    [C],
  );
  expect(noCaveMatch.rows[0]?.total).toBe(0);

  // Cancelamento pelo remetente e bloqueio de convites paralelos.
  const pending = await as<{ create_couple_game_invitation: string }>(
    A,
    "select public.create_couple_game_invitation($1,$2)",
    ["battleship", "competitive"],
  );
  const pendingId = pending.rows?.[0]?.create_couple_game_invitation;
  expect(pendingId).toBeTruthy();

  const duplicate = await as(B, "select public.create_couple_game_invitation($1,$2)", ["domino", "competitive"]);
  expect(duplicate.error?.message).toContain("invitation_already_pending");

  const strangerCancel = await as(B, "select public.cancel_couple_game_invitation($1)", [pendingId]);
  expect(strangerCancel.error?.message).toContain("invitation_not_cancellable");

  const cancelled = await as(A, "select public.cancel_couple_game_invitation($1)", [pendingId]);
  expect(cancelled.rows?.[0]?.cancel_couple_game_invitation).toBe(true);
  const cancelledRow = await as<{ status: string }>(
    B,
    "select status from public.couple_game_invitations where id=$1",
    [pendingId],
  );
  expect(cancelledRow.rows?.[0]?.status).toBe("cancelled");

  // Ex-membros e não membros não conseguem emitir convites.
  const formerMember = await as(X, "select public.create_couple_game_invitation($1,$2)", ["quiz", "competitive"]);
  expect(formerMember.error).toBeTruthy();
  const stranger = await as(Y, "select public.create_couple_game_invitation($1,$2)", ["quiz", "competitive"]);
  expect(stranger.error).toBeTruthy();

  // O cliente não pode escrever diretamente na tabela.
  const directWrite = await as(A,
    "insert into public.couple_game_invitations(couple_id,game_key,game_mode,from_user_id,to_user_id) values($1,'quiz','competitive',$2,$3)",
    [C, A, B],
  );
  expect(directWrite.error).toBeTruthy();
}, 60000);
