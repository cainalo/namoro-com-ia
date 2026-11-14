import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
const here = (f: string) => fileURLToPath(new URL(f, import.meta.url));
test("partidas online: migration, Lig 4, turnos, versões, privacidade", async () => {
const db = new PGlite();
const A='11111111-1111-1111-1111-111111111111', B='22222222-2222-2222-2222-222222222222', X='33333333-3333-3333-3333-333333333333', Y='44444444-4444-4444-4444-444444444444', C='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
await db.exec(readFileSync(here("../../supabase/tests/online-games.base.sql"),"utf8"));
// live function body (from production), to reproduce
await db.exec(readFileSync(here("../../supabase/tests/online-games.live-lig4.sql"),"utf8"));
let pass=0, fail=0; // eslint-disable-line prefer-const
const ok=(n:string,c:boolean,extra='')=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(extra?' — '+extra:''));};
async function as<T=any>(uid:string|null, sql:string, params:any[]=[]):Promise<{rows?:any[];err?:any}>{
  try{ await db.exec('BEGIN'); await db.query(`select set_config('request.jwt.claim.sub',$1,true)`,[uid??'']);
    await db.exec(uid?'SET LOCAL ROLE authenticated':'SET LOCAL ROLE anon');
    const r=await db.query(sql,params); await db.exec('COMMIT'); return {rows:r.rows}; }
  catch(e:any){ await db.exec('ROLLBACK'); return {err:e}; } }
const r0=await as(A,'select public.create_connect_four_match($1) id',[C]);
ok('reproduz erro atual do Lig 4 (42883)', r0.err?.code==='42883', r0.err?.message);
await db.exec(readFileSync(here("../../supabase/migrations/20261114000000_generic_online_game_matches.sql"),"utf8"));
ok('migration aplica sem erro', true);
const c4=await as(A,'select public.create_connect_four_match($1) id',[C]); ok('Lig 4: criar partida', !!c4.rows?.[0]?.id, c4.err?.message);
const m=c4.rows![0].id;
ok('Lig 4: retomar a mesma partida', (await as(B,'select public.create_connect_four_match($1) id',[C])).rows?.[0]?.id===m);
const mv=await as(A,'select * from public.play_connect_four_move($1,3,0)',[m]); ok('Lig 4: jogada 1', mv.rows?.[0]?.turn_number===1, mv.err?.message);
ok('Lig 4: jogada fora da vez bloqueada', (await as(A,'select * from public.play_connect_four_move($1,3,1)',[m])).err?.message==='not_your_turn');
ok('Lig 4: turno repetido bloqueado', (await as(B,'select * from public.play_connect_four_move($1,3,0)',[m])).err?.message==='stale_turn');
ok('Lig 4: B joga', (await as(B,'select * from public.play_connect_four_move($1,4,1)',[m])).rows?.[0]?.turn_number===2);
// generic
const keys=['checkers','this-or-that','daily-challenge','investigation','investigation-train','chess','battleship','domino','truco','quiz','escape-room','island-survival'];
for (const k of keys){ const mode=['investigation','investigation-train','escape-room','island-survival','daily-challenge','this-or-that'].includes(k)?'cooperative':'competitive';
  const r=await as(A,'select public.start_game_match($1,$2,$3) id',[C,k,mode]); const r2=await as(B,'select public.start_game_match($1,$2,$3) id',[C,k,mode]);
  ok(`${k}: criar e retomar mesma partida`, !!r.rows?.[0]?.id && r.rows[0].id===r2.rows?.[0]?.id, r.err?.message||r2.err?.message); }
const chess=(await as(A,`select id from public.couple_game_matches where game_key='chess' and status='active'`)).rows![0].id;
ok('xadrez: A grava v0 e passa vez', (await as(A,'select public.submit_game_state($1,0,$2,1) v',[chess,{fen:'x'}])).rows?.[0]?.v===1);
ok('xadrez: A tenta jogar de novo (fora da vez)', (await as(A,'select public.submit_game_state($1,1,$2,1) v',[chess,{fen:'y'}])).err?.message==='not_your_turn');
ok('xadrez: B com versão velha rejeitado', (await as(B,'select public.submit_game_state($1,0,$2,0) v',[chess,{fen:'y'}])).err?.message==='stale_version');
ok('xadrez: B joga v1', (await as(B,'select public.submit_game_state($1,1,$2,0) v',[chess,{fen:'z'}])).rows?.[0]?.v===2);
const st=(await as(B,'select state from public.couple_game_matches where id=$1',[chess])).rows?.[0]; ok('xadrez: B lê estado sincronizado', st?.state?.fen==='z');
const win=await as(A,`select public.submit_game_state($1,2,$2,null,'win',0) v`,[chess,{fen:'m'}]); ok('xadrez: vitória finaliza', win.rows?.[0]?.v===3, win.err?.message);
const fin=(await as(A,'select status,winner_id from public.couple_game_matches where id=$1',[chess])).rows?.[0]; ok('xadrez: finished + winner A', fin?.status==='finished'&&fin.winner_id===A);
const nc=await as(A,'select public.start_game_match($1,$2,$3) id',[C,'chess','competitive']); ok('xadrez: nova partida após finalizar (histórico preservado)', !!nc.rows?.[0]?.id && nc.rows[0].id!==chess);
ok('xadrez: histórico conta 2', (await as(A,`select count(*)::int n from public.couple_game_matches where game_key='chess'`)).rows?.[0]?.n===2);
const nw=await as(A,`select public.submit_game_state($1,0,'{}'::jsonb,null,'win',null) v`,[nc.rows![0].id]); ok('win sem vencedor rejeitado', nw.err?.message==='invalid_winner', nw.err?.message);
// cooperative: both act without turn
const inv=(await as(A,`select id from public.couple_game_matches where game_key='investigation' and status='active'`)).rows![0].id;
ok('coop: A grava', (await as(A,'select public.submit_game_state($1,0,$2) v',[inv,{clues:[1]}])).rows?.[0]?.v===1);
ok('coop: A grava de novo (sem turno)', (await as(A,'select public.submit_game_state($1,1,$2) v',[inv,{clues:[1,2]}])).rows?.[0]?.v===2);
ok('coop: B grava v2', (await as(B,'select public.submit_game_state($1,2,$2) v',[inv,{clues:[1,2,3]}])).rows?.[0]?.v===3);
ok('coop: sobrescrita concorrente rejeitada', (await as(A,'select public.submit_game_state($1,2,$2) v',[inv,{clues:[9]}])).err?.message==='stale_version');
const done=await as(B,`select public.submit_game_state($1,3,$2,null,'complete') v`,[inv,{clues:[1,2,3],solved:true}]); ok('coop: concluir', done.rows?.[0]?.v===4, done.err?.message);
// private
const dom=(await as(A,`select id from public.couple_game_matches where game_key='domino' and status='active'`)).rows![0].id;
const tiles=[];for(let i=0;i<=6;i++)for(let j=i;j<=6;j++)tiles.push([i,j]);
ok('dominó: embaralhar monte (28)', (await as(A,'select public.reset_game_pile($1,$2) n',[dom,JSON.stringify(tiles)])).rows?.[0]?.n===28);
const ha=await as(A,`select public.draw_game_pile($1,7,'d1',true) d`,[dom]); const hb=await as(B,`select public.draw_game_pile($1,7,'d1',true) d`,[dom]);
ok('dominó: cada um recebe 7', ha.rows?.[0]?.d?.hand?.length===7 && hb.rows?.[0]?.d?.hand?.length===7);
const seen=(await as(A,'select user_id from public.couple_game_private_state where match_id=$1',[dom])).rows!;
ok('privado: A só vê a própria mão', seen.length===1 && seen[0].user_id===A);
ok('privado: monte ilegível pelo cliente', !!(await as(A,'select * from public.couple_game_piles')).err);
ok('privado: escrita direta proibida', !!(await as(A,`insert into public.couple_game_private_state(match_id,user_id) values($1,$2)`,[dom,B])).err);
const sa=(new Set([...ha.rows![0].d.hand,...hb.rows![0].d.hand].map((t:any)=>t.join()))).size; ok('dominó: mãos sem peças repetidas', sa===14);
ok('monte restante 14', (await db.query(`select jsonb_array_length(items) n from public.couple_game_piles where match_id=$1`,[dom])).rows[0] as any && ((await db.query(`select jsonb_array_length(items) n from public.couple_game_piles where match_id=$1`,[dom])).rows[0] as any).n===14);
// access control: X já pertenceu ao casal, mas ended_at não é NULL; Y nunca pertenceu.
await db.query('INSERT INTO public.couple_game_private_state(match_id,user_id,data) VALUES ($1,$2,$3)',[dom,X,JSON.stringify({fleet:['secret']})]);
ok('anon sem execução', !!(await as(null,'select public.start_game_match($1,$2,$3)',[C,'quiz','competitive'])).err);
ok('ex-membro bloqueado no RPC', (await as(X,'select public.start_game_match($1,$2,$3)',[C,'quiz','competitive'])).err?.message==='invalid_couple_members');
ok('ex-membro não lê partidas, mesmo com can_view_couple legado', (await as(X,'select count(*)::int n from public.couple_game_matches')).rows?.[0]?.n===0);
ok('não-membro não lê partidas', (await as(Y,'select count(*)::int n from public.couple_game_matches')).rows?.[0]?.n===0);
ok('ex-membro não lê nem seu antigo estado privado', (await as(X,'select data from public.couple_game_private_state where match_id=$1',[dom])).rows?.length===0);
ok('ex-membro não grava estado', (await as(X,'select public.set_game_private_state($1,$2)',[dom,{fleet:['tampered']}])).err?.message==='not_current_couple_member');
ok('não-membro não grava estado', (await as(Y,'select public.submit_game_state($1,0,$2)',[inv,{}])).err?.message==='not_current_couple_member');
ok('UPDATE direto proibido', !!(await as(A,`update public.couple_game_matches set state='{}'`)).err);
ok('INSERT direto proibido', !!(await as(A,`insert into public.couple_game_matches(couple_id,game_key,player_one_id,player_two_id,board,current_turn) values($1,'quiz',$2,$3,'[]',$2)`,[C,A,B])).err);
ok('helper interno não exposto', !!(await as(A,'select public.game_lock_match_for_member($1)',[inv])).err);
ok('connect-four não usa RPC genérica', (await as(A,'select public.submit_game_state($1,2,$2)',[m,{}])).err?.message==='wrong_game');
const ab=await as(B,'select public.abandon_game_match($1)',[nc.rows![0].id]); ok('abandonar partida', !ab.err, ab.err?.message);
console.log(`${pass} passed, ${fail} failed`);
expect(fail).toBe(0);
}, 60000);
