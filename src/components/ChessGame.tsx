import { useEffect, useMemo, useState } from "react";
import { useGameState } from "@/components/OnlineGameHost";
import type { GameOutcome } from "@/lib/online-game";
import { RotateCcw, Undo2 } from "lucide-react";

type Color = "w" | "b";
type Kind = "K" | "Q" | "R" | "B" | "N" | "P";
type Piece = { color: Color; kind: Kind };
type Move = { from: number; to: number; promotion?: Kind; enPassant?: boolean; castle?: "king" | "queen" };
type Position = {
  board: Array<Piece | null>;
  turn: Color;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: number | null;
  halfMoves: number;
  fullMoves: number;
};
const files = "abcdefgh";
const startRank: Kind[] = ["R","N","B","Q","K","B","N","R"];
const glyph: Record<Color,Record<Kind,string>> = {
  w: {K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙"},
  b: {K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"},
};
const offsetsKnight = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const offsetsKing = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const diagonals = [[-1,-1],[-1,1],[1,-1],[1,1]];
const straights = [[-1,0],[1,0],[0,-1],[0,1]];
const inside = (r:number,c:number) => r>=0&&r<8&&c>=0&&c<8;
const idx = (r:number,c:number) => r*8+c;
const coords = (square:number) => [Math.floor(square/8),square%8] as const;
const opposite = (color:Color):Color => color==="w"?"b":"w";
const squareName = (square:number) => {const [r,c]=coords(square);return files[c]+(8-r);};

function initialPosition(): Position {
  const board:Array<Piece|null>=Array(64).fill(null);
  for(let c=0;c<8;c++){
    board[c]={color:"b",kind:startRank[c]};
    board[8+c]={color:"b",kind:"P"};
    board[48+c]={color:"w",kind:"P"};
    board[56+c]={color:"w",kind:startRank[c]};
  }
  return {board,turn:"w",castling:{wK:true,wQ:true,bK:true,bQ:true},enPassant:null,halfMoves:0,fullMoves:1};
}

function isSquareAttacked(board:Array<Piece|null>, square:number, by:Color):boolean {
  const [r,c]=coords(square);
  const pawnSourceRow=r+(by==="w"?1:-1);
  for(const dc of [-1,1]){
    if(inside(pawnSourceRow,c+dc)){
      const p=board[idx(pawnSourceRow,c+dc)];
      if(p?.color===by&&p.kind==="P")return true;
    }
  }
  for(const [dr,dc] of offsetsKnight){
    if(inside(r+dr,c+dc)){const p=board[idx(r+dr,c+dc)];if(p?.color===by&&p.kind==="N")return true;}
  }
  for(const [dr,dc] of offsetsKing){
    if(inside(r+dr,c+dc)){const p=board[idx(r+dr,c+dc)];if(p?.color===by&&p.kind==="K")return true;}
  }
  for(const [dr,dc] of diagonals){
    let rr=r+dr,cc=c+dc,steps=1;
    while(inside(rr,cc)){
      const p=board[idx(rr,cc)];
      if(p){if(p.color===by&&(p.kind==="B"||p.kind==="Q"||(steps===1&&p.kind==="K")))return true;break;}
      rr+=dr;cc+=dc;steps++;
    }
  }
  for(const [dr,dc] of straights){
    let rr=r+dr,cc=c+dc,steps=1;
    while(inside(rr,cc)){
      const p=board[idx(rr,cc)];
      if(p){if(p.color===by&&(p.kind==="R"||p.kind==="Q"||(steps===1&&p.kind==="K")))return true;break;}
      rr+=dr;cc+=dc;steps++;
    }
  }
  return false;
}

function findKing(board:Array<Piece|null>,color:Color) {
  return board.findIndex(p=>p?.color===color&&p.kind==="K");
}

function inCheck(position:Position,color:Color) {
  const king=findKing(position.board,color);
  return king<0||isSquareAttacked(position.board,king,opposite(color));
}

function applyMove(position:Position,move:Move):Position {
  const board=position.board.slice();
  const piece=board[move.from];
  if(!piece)return position;
  const [fromRow,fromCol]=coords(move.from);
  const [toRow,toCol]=coords(move.to);
  const captured=board[move.to];
  board[move.from]=null;
  if(move.enPassant)board[idx(fromRow,toCol)]=null;
  board[move.to]={...piece,kind:move.promotion??piece.kind};
  if(move.castle==="king"){
    const rookFrom=idx(fromRow,7),rookTo=idx(fromRow,5);
    board[rookTo]=board[rookFrom];board[rookFrom]=null;
  }else if(move.castle==="queen"){
    const rookFrom=idx(fromRow,0),rookTo=idx(fromRow,3);
    board[rookTo]=board[rookFrom];board[rookFrom]=null;
  }
  const castling={...position.castling};
  if(piece.kind==="K"){if(piece.color==="w"){castling.wK=false;castling.wQ=false;}else{castling.bK=false;castling.bQ=false;}}
  if(piece.kind==="R"){
    if(move.from===56)castling.wQ=false;
    if(move.from===63)castling.wK=false;
    if(move.from===0)castling.bQ=false;
    if(move.from===7)castling.bK=false;
  }
  if(captured?.kind==="R"){
    if(move.to===56)castling.wQ=false;
    if(move.to===63)castling.wK=false;
    if(move.to===0)castling.bQ=false;
    if(move.to===7)castling.bK=false;
  }
  const enPassant=piece.kind==="P"&&Math.abs(toRow-fromRow)===2?idx((toRow+fromRow)/2,fromCol):null;
  return {
    board,
    turn:opposite(position.turn),
    castling,
    enPassant,
    halfMoves:piece.kind==="P"||captured||move.enPassant?0:position.halfMoves+1,
    fullMoves:position.fullMoves+(piece.color==="b"?1:0),
  };
}

function pseudoMoves(position:Position,from:number):Move[] {
  const piece=position.board[from];
  if(!piece)return [];
  const [r,c]=coords(from), moves:Move[]=[];
  const add=(rr:number,cc:number,extra:Partial<Move>={})=>{
    if(!inside(rr,cc))return;
    const target=position.board[idx(rr,cc)];
    if(target?.color===piece.color)return;
    if(target?.kind==="K")return;
    moves.push({from,to:idx(rr,cc),...extra});
  };
  if(piece.kind==="P"){
    const direction=piece.color==="w"?-1:1;
    const one=r+direction;
    if(inside(one,c)&&!position.board[idx(one,c)]){
      add(one,c,one===0||one===7?{promotion:"Q"}:{});
      const two=r+direction*2;
      const home=piece.color==="w"?6:1;
      if(r===home&&!position.board[idx(two,c)])add(two,c);
    }
    for(const dc of [-1,1]){
      const rr=r+direction,cc=c+dc;
      if(!inside(rr,cc))continue;
      const target=position.board[idx(rr,cc)];
      if(target&&target.color!==piece.color&&target.kind!=="K")add(rr,cc,rr===0||rr===7?{promotion:"Q"}:{});
      else if(position.enPassant===idx(rr,cc))moves.push({from,to:idx(rr,cc),enPassant:true});
    }
  }else if(piece.kind==="N"){
    for(const [dr,dc] of offsetsKnight)add(r+dr,c+dc);
  }else if(piece.kind==="K"){
    for(const [dr,dc] of offsetsKing)add(r+dr,c+dc);
    const home=piece.color==="w"?7:0;
    const enemy=opposite(piece.color);
    if(r===home&&c===4&&!inCheck(position,piece.color)){
      const kingSide=piece.color==="w"?position.castling.wK:position.castling.bK;
      const queenSide=piece.color==="w"?position.castling.wQ:position.castling.bQ;
      const rookK=position.board[idx(home,7)];
      const rookQ=position.board[idx(home,0)];
      if(kingSide&&rookK?.color===piece.color&&rookK.kind==="R"&&!position.board[idx(home,5)]&&!position.board[idx(home,6)]&&!isSquareAttacked(position.board,idx(home,5),enemy)&&!isSquareAttacked(position.board,idx(home,6),enemy)){
        moves.push({from,to:idx(home,6),castle:"king"});
      }
      if(queenSide&&rookQ?.color===piece.color&&rookQ.kind==="R"&&!position.board[idx(home,1)]&&!position.board[idx(home,2)]&&!position.board[idx(home,3)]&&!isSquareAttacked(position.board,idx(home,3),enemy)&&!isSquareAttacked(position.board,idx(home,2),enemy)){
        moves.push({from,to:idx(home,2),castle:"queen"});
      }
    }
  }else{
    const directions=piece.kind==="B"?diagonals:piece.kind==="R"?straights:[...diagonals,...straights];
    for(const [dr,dc] of directions){
      let rr=r+dr,cc=c+dc;
      while(inside(rr,cc)){
        const target=position.board[idx(rr,cc)];
        if(!target){add(rr,cc);}
        else {if(target.color!==piece.color&&target.kind!=="K")add(rr,cc);break;}
        rr+=dr;cc+=dc;
      }
    }
  }
  return moves;
}

function legalMovesFor(position:Position,color:Color,from?:number):Move[] {
  const moves:Move[]=[];
  const start=from??0,end=from===undefined?64:from+1;
  for(let square=start;square<end;square++){
    if(position.board[square]?.color!==color)continue;
    for(const move of pseudoMoves(position,square)){
      const next=applyMove(position,move);
      if(!inCheck(next,color))moves.push(move);
    }
  }
  return moves;
}

function positionKey(p:Position) {
  return p.board.map(x=>x?x.color+x.kind:"--").join("")+"|"+p.turn+"|"+Object.values(p.castling).map(Boolean).join("")+"|"+p.enPassant;
}
function insufficientMaterial(p:Position) {
  const pieces=p.board.filter(Boolean) as Piece[];
  if(pieces.some(x=>x.kind==="P"||x.kind==="Q"||x.kind==="R"))return false;
  const minors=pieces.filter(x=>x.kind==="B"||x.kind==="N");
  return minors.length<=1;
}
function moveLabel(position:Position,move:Move) {
  const piece=position.board[move.from];
  if(move.castle==="king")return "O-O";
  if(move.castle==="queen")return "O-O-O";
  const capture=Boolean(position.board[move.to]||move.enPassant);
  return (piece?.kind==="P"?"":piece?.kind)+squareName(move.from)+(capture?"×":"–")+squareName(move.to)+(move.promotion?"=D":"");
}

type ChessShared={position:Position;history:Position[];notation:string[]};
function chessOutcome(s:ChessShared):GameOutcome|null{
  const p=s.position;
  const moves=legalMovesFor(p,p.turn);
  if(moves.length===0)return inCheck(p,p.turn)?{kind:"win",winnerSeat:p.turn==="w"?1:0}:{kind:"draw"};
  if(p.halfMoves>=100||insufficientMaterial(p))return {kind:"draw"};
  return null;
}

export function ChessGame({ solo = false }: { solo?: boolean }) {
  const [chess,setChess,sync]=useGameState<ChessShared>(()=>({position:initialPosition(),history:[],notation:[]}),{turnSeat:(s)=>s.position.turn==="w"?0:1,outcome:chessOutcome});
  const {position,history,notation}=chess;
  const [selected,setSelected]=useState<number|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const moves=useMemo(()=>position.turn==="w"?legalMovesFor(position,"w"):legalMovesFor(position,"b"),[position]);
  const available=useMemo(()=>new Set(moves.filter(m=>m.from===selected).map(m=>m.to)),[moves,selected]);
  const check=inCheck(position,position.turn);
  const winner=position.turn==="w"?(solo?"Morados":"Pessoa 2"):(solo?"Você":"Pessoa 1");
  const finished=moves.length===0||position.halfMoves>=100||insufficientMaterial(position);
  const status=moves.length===0?(check?`Xeque-mate! ${winner} venceu.`:"Empate por afogamento.") : position.halfMoves>=100?"Empate pela regra dos 50 lances.":insufficientMaterial(position)?"Empate por material insuficiente.":check?"Xeque! Proteja o rei.":solo&&position.turn==="b"?"Morados estão pensando…":`Vez de ${solo?(position.turn==="w"?"você":"Morados"):"Pessoa "+(position.turn==="w"?1:2)}.`;

  useEffect(() => {
    if (!solo || sync.online || position.turn !== "b" || finished) return;
    const timer = window.setTimeout(() => {
      const candidates = legalMovesFor(position, "b");
      if (!candidates.length) return;
      const values: Record<Kind, number> = { P: 100, N: 320, B: 335, R: 500, Q: 900, K: 20000 };
      const material = (board: Array<Piece | null>) => board.reduce((sum, piece) => {
        if (!piece) return sum;
        return sum + (piece.color === "b" ? 1 : -1) * values[piece.kind];
      }, 0);
      const ranked = candidates.map((move) => {
        const next = applyMove(position, move);
        const piece = position.board[move.from];
        const captured = position.board[move.to] ?? (move.enPassant ? position.board[idx(coords(move.from)[0], coords(move.to)[1])] : null);
        const checkWhite = inCheck(next, "w");
        const whiteReplies = legalMovesFor(next, "w");
        const mate = whiteReplies.length === 0 && checkWhite;
        const [row, column] = coords(move.to);
        let score = material(next.board) * 0.12;
        if (captured) score += values[captured.kind] * 0.9 - (piece ? values[piece.kind] * 0.08 : 0);
        if (move.promotion) score += 800;
        if (move.castle) score += 35;
        if (checkWhite) score += 32;
        if (mate) score += 100000;
        score += (3.5 - Math.abs(3.5 - column)) * 2 + (3.5 - Math.abs(3.5 - row)) * 1.3;
        if (isSquareAttacked(next.board, move.to, "w") && piece && !captured) score -= values[piece.kind] * 0.18;
        score += Math.random() * 0.8;
        return { move, score };
      }).sort((a, b) => b.score - a.score);
      const best = ranked[0]?.move;
      if (!best) return;
      setChess((current) => current.position.turn !== "b" ? current : ({
        position: applyMove(current.position, best),
        history: [...current.history, current.position].slice(-60),
        notation: [...current.notation, moveLabel(current.position, best)],
      }));
    }, 620);
    return () => window.clearTimeout(timer);
  }, [solo, sync.online, position, finished, setChess]);

  function clickSquare(square:number){
    if(finished || (solo && position.turn === "b"))return;
    const piece=position.board[square];
    if(selected!==null&&available.has(square)){
      const move=moves.find(m=>m.from===selected&&m.to===square);
      if(!move)return;
      setChess({position:applyMove(position,move),history:[...history,position].slice(-60),notation:[...notation,moveLabel(position,move)]});
      setSelected(null);
      setMessage(null);
      return;
    }
    if(piece?.color===position.turn){setSelected(square);setMessage(null);}
    else {setSelected(null);setMessage("Selecione uma peça da sua cor.");}
  }
  function undo(){
    const steps = solo && history.length >= 2 ? 2 : 1;
    const previous=history[history.length-steps];if(!previous)return;
    setChess({position:previous,history:history.slice(0,-steps),notation:notation.slice(0,-steps)});setSelected(null);setMessage(null);
  }
  function restart(){setChess({position:initialPosition(),history:[],notation:[]});setSelected(null);setMessage(null);}

  return (
    <section className={"chess-game" + (solo ? " is-solo" : "")} aria-label="Xadrez">
      <div className="chess-statusbar">
        <span className={position.turn==="w"?"is-active":""}><i className="chess-player-dot is-white"/> {solo ? "Você · Brancas" : "Pessoa 1 · Brancas"}</span>
        <span className={position.turn==="b"?"is-active":""}><i className="chess-player-dot is-black"/> {solo ? "Morados · Pretas" : "Pessoa 2 · Pretas"}</span>
      </div>
      <div className={"chess-status"+(check?" is-check":"")} role="status" aria-live="polite">{status}</div>
      <div className="chess-board" role="grid" aria-label="Tabuleiro de xadrez">
        {position.board.map((piece,square)=>{
          const [r,c]=coords(square);
          return <button key={square} type="button" role="gridcell"
            className={["chess-square",(r+c)%2?"is-dark":"is-light",selected===square?"is-selected":"",available.has(square)?"is-legal":"",check&&piece?.kind==="K"&&piece.color===position.turn?"is-king-check":""].filter(Boolean).join(" ")}
            onClick={()=>clickSquare(square)} disabled={finished || (solo && position.turn === "b")}
            aria-label={`${files[c]}${8-r}: ${piece?(piece.color==="w"?"branca ":"preta ")+({K:"rei",Q:"dama",R:"torre",B:"bispo",N:"cavalo",P:"peão"}[piece.kind]):"vazia"}`}
            aria-pressed={selected===square}>
            {piece&&<span className={"chess-piece "+(piece.color==="w"?"is-white":"is-black")} aria-hidden="true">{glyph[piece.color][piece.kind]}</span>}
            {available.has(square)&&<span className="chess-legal-dot" aria-hidden="true"/>}
          </button>;
        })}
      </div>
      <div className="chess-actions">
        <span>{notation.length} lances · {position.fullMoves}ª rodada</span>
        <div><button type="button" className="inline-action" onClick={undo} disabled={!history.length}><Undo2/> Desfazer</button><button type="button" className="inline-action" onClick={restart}><RotateCcw/> Reiniciar</button></div>
      </div>
      {message&&<p className="couple-game-error" role="alert">{message}</p>}
      <details className="chess-history">
        <summary>Histórico de lances</summary>
        <ol>{notation.map((move,i)=><li key={i}>{i+1}. {move}</li>)}</ol>
      </details>
      {finished&&<div className="chess-end-panel"><strong>{status}</strong><button type="button" className="primary-action" onClick={restart}>Nova partida</button></div>}
      <p className="chess-note">{solo ? "Você joga com as brancas contra os Morados. " : "Modo local para duas pessoas no mesmo aparelho. "}A promoção de peão é automática para dama.</p>
    </section>
  );
}
