import { useEffect, useState } from "react";
import { Brain, EyeOff, Layers, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";
import { chooseMemoryBotPair, createMemoryDeck, isSequencePrefix, MEMORY_SYMBOLS, SEQUENCE_TOKEN_IDS, type SequenceToken } from "@/lib/new-game-logic";

type MemoryState = {
  deck: string[];
  matched: number[];
  revealed: number[];
  scores: [number, number];
  turn: 0 | 1;
  attempts: number;
  known: Record<number, string>;
  phase: "playing" | "finished";
};

function newMemoryState(): MemoryState {
  return { deck: createMemoryDeck(), matched: [], revealed: [], scores: [0, 0], turn: 0, attempts: 0, known: {}, phase: "playing" };
}

function memoryOutcome(state: MemoryState) {
  if (state.phase !== "finished") return null;
  if (state.scores[0] === state.scores[1]) return { kind: "draw" as const };
  return { kind: "win" as const, winnerSeat: state.scores[0] > state.scores[1] ? 0 as const : 1 as const };
}

export function MemoryMatchGame({ solo = false }: { solo?: boolean }) {
  const [game, setGame, sync] = useGameState<MemoryState>(newMemoryState, {
    onlineInitial: newMemoryState(),
    turnSeat: (state) => state.turn,
    outcome: memoryOutcome,
  });
  const mismatch = game.revealed.length === 2 && game.deck[game.revealed[0]] !== game.deck[game.revealed[1]];
  const totalPairs = MEMORY_SYMBOLS.length;
  const completePairs = game.matched.length / 2;
  const canFlip = game.phase === "playing" && game.revealed.length < 2 && (!sync.online || sync.canAct) && !(solo && game.turn === 1);

  useEffect(() => {
    if (!mismatch || game.phase !== "playing" || (sync.online && !sync.canAct)) return;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (current.revealed.length !== 2 || current.deck[current.revealed[0]] === current.deck[current.revealed[1]]) return current;
        return { ...current, revealed: [], turn: current.turn === 0 ? 1 : 0, attempts: current.attempts + 1 };
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [mismatch, game.phase, game.revealed, game.deck, solo, sync.online, sync.canAct, setGame]);

  useEffect(() => {
    if (!solo || sync.online || game.phase !== "playing" || game.turn !== 1 || game.revealed.length > 0) return;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (current.turn !== 1 || current.phase !== "playing" || current.revealed.length > 0) return current;
        const pair = chooseMemoryBotPair(current.deck, current.matched, current.known);
        if (!pair) return { ...current, phase: "finished" };
        const [first, second] = pair;
        const known = { ...current.known, [first]: current.deck[first], [second]: current.deck[second] };
        if (current.deck[first] === current.deck[second]) {
          const matched = [...current.matched, first, second];
          const scores: [number, number] = [current.scores[0], current.scores[1] + 1];
          return { ...current, known, matched, scores, attempts: current.attempts + 1, phase: matched.length === current.deck.length ? "finished" : "playing" };
        }
        return { ...current, known, revealed: [first, second] };
      });
    }, 620);
    return () => window.clearTimeout(timer);
  }, [solo, sync.online, game.phase, game.turn, game.revealed, game.matched, game.known, game.deck, setGame]);

  function flip(index: number) {
    if (!canFlip || game.matched.includes(index) || game.revealed.includes(index)) return;
    const known = { ...game.known, [index]: game.deck[index] };
    if (game.revealed.length === 0) {
      setGame({ ...game, known, revealed: [index] });
      return;
    }
    const first = game.revealed[0];
    if (game.deck[first] === game.deck[index]) {
      const matched = [...game.matched, first, index];
      const scores = [...game.scores] as [number, number];
      scores[game.turn] += 1;
      setGame({ ...game, known, matched, revealed: [], scores, attempts: game.attempts + 1, phase: matched.length === game.deck.length ? "finished" : "playing" });
      return;
    }
    setGame({ ...game, known, revealed: [first, index] });
  }

  function restart() {
    setGame(newMemoryState());
  }

  const winner = game.scores[0] === game.scores[1] ? "Empate" : game.scores[0] > game.scores[1] ? (solo ? "Você" : "Pessoa 1") : (solo ? "Morados" : "Pessoa 2");

  return (
    <section className="morados-game-surface memory-match-game">
      <header className="morados-game-hero memory-hero">
        <span className="morados-game-eyebrow"><Sparkles aria-hidden="true" /> JOGO DE MEMÓRIA</span>
        <h2>{solo ? "Encontre todos os pares" : "Quem encontra mais pares?"}</h2>
        <p>{solo ? "Revele duas cartas por vez, memorize suas posições e conclua o tabuleiro com o menor número de tentativas." : "Encontrem pares iguais. Cada acerto mantém a vez; quando errar, a vez passa para a outra pessoa."}</p>
        <div className="morados-game-hero-art" aria-hidden="true"><span>🌙</span><span>🌸</span><span>⭐</span><span>🍃</span></div>
      </header>
      <div className="morados-game-score-row">
        <div className={game.turn === 0 ? "is-active" : ""}><span className="memory-player-mark is-one"/> {solo ? "Você" : "Pessoa 1"} <strong>{game.scores[0]}</strong></div>
        {!solo && <span className="morados-score-separator">×</span>}
        <div className={game.turn === 1 ? "is-active" : ""}><span className="memory-player-mark is-two"/> {solo ? "Morados" : "Pessoa 2"} <strong>{solo ? game.scores[1] : game.scores[1]}</strong></div>
      </div>
      <div className="memory-progress-row">
        <span><Layers aria-hidden="true"/> {completePairs}/{totalPairs} pares encontrados</span>
        <span><Brain aria-hidden="true"/> {game.attempts} tentativas</span>
      </div>
      <div className="memory-grid" aria-label="Cartas do jogo da memória">
        {game.deck.map((symbol, index) => {
          const isMatched = game.matched.includes(index);
          const isRevealed = game.revealed.includes(index);
          const visible = isMatched || isRevealed;
          return (
            <button key={index} type="button" className={"memory-card" + (visible ? " is-flipped" : "") + (isMatched ? " is-matched" : "")} onClick={() => flip(index)} disabled={!canFlip || visible} aria-label={visible ? `Carta ${index + 1}: ${symbol}` : `Revelar carta ${index + 1}`}>
              <span className="memory-card-inner">
                <span className="memory-card-back"><EyeOff aria-hidden="true"/></span>
                <span className="memory-card-front">{symbol}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="morados-game-status" role="status" aria-live="polite">
        {game.phase === "finished" ? (solo ? "Tabuleiro concluído. Muito bem!" : `${winner} venceu a partida!`) :
          solo && game.turn === 1 ? "Morados estão lembrando das cartas…" :
          game.revealed.length === 2 ? "Observem as duas cartas…" :
          game.revealed.length === 1 ? "Escolha mais uma carta." :
          `Vez de ${solo ? "você" : "Pessoa " + (game.turn + 1)}.`}
      </div>
      {game.phase === "finished" && (
        <div className="morados-game-result">
          <span><Trophy aria-hidden="true"/></span>
          <p className="morados-game-eyebrow">PARTIDA CONCLUÍDA</p>
          <h3>{solo ? "Todos os pares encontrados!" : `${winner} venceu!`}</h3>
          <p>{completePairs} pares em {game.attempts} tentativas. {solo ? "Tente superar seu próprio recorde." : "Vamos para uma revanche?"}</p>
          <button type="button" className="morados-game-primary" onClick={restart}><RotateCcw aria-hidden="true"/> Jogar novamente</button>
        </div>
      )}
      <footer className="morados-game-footer"><span>{solo ? "Desafio individual" : sync.online ? "Partida sincronizada" : "Dois jogadores · mesmo aparelho"}</span><button type="button" onClick={restart}><RotateCcw aria-hidden="true"/> Reiniciar</button></footer>
    </section>
  );
}

const SEQUENCE_TOKENS = [
  { id: "moon", emoji: "🌙", label: "Lua" },
  { id: "leaf", emoji: "🍃", label: "Folha" },
  { id: "fire", emoji: "🔥", label: "Fogo" },
  { id: "water", emoji: "💧", label: "Água" },
  { id: "star", emoji: "⭐", label: "Estrela" },
  { id: "flower", emoji: "🌸", label: "Flor" },
] as const;
type SequenceState = {
  phase: "showing" | "input" | "turn-end" | "finished";
  turn: 0 | 1;
  sequence: SequenceToken[];
  input: SequenceToken[];
  scores: [number | null, number | null];
  completed: [boolean, boolean];
};

export function isSequencePrefix(target: SequenceToken[], input: SequenceToken[]) {
  return input.length <= target.length && input.every((token, index) => target[index] === token);
}

function newSequenceState(): SequenceState {
  return { phase: "showing", turn: 0, sequence: Array.from({ length: 3 }, () => SEQUENCE_TOKEN_IDS[Math.floor(Math.random() * SEQUENCE_TOKEN_IDS.length)]), input: [], scores: [null, null], completed: [false, false] };
}

function sequenceOutcome(state: SequenceState) {
  if (state.phase !== "finished") return null;
  const first = state.scores[0] ?? 0, second = state.scores[1] ?? 0;
  if (first === second) return { kind: "draw" as const };
  return { kind: "win" as const, winnerSeat: first > second ? 0 as const : 1 as const };
}

export function SymbolSequenceGame({ solo = false }: { solo?: boolean }) {
  const [game, setGame, sync] = useGameState<SequenceState>(newSequenceState, {
    onlineInitial: newSequenceState(),
    turnSeat: (state) => state.turn,
    outcome: sequenceOutcome,
  });

  useEffect(() => {
    if (game.phase !== "showing" || (sync.online && !sync.canAct)) return;
    const timer = window.setTimeout(() => setGame((current) => current.phase === "showing" ? { ...current, phase: "input", input: [] } : current), 1250 + game.sequence.length * 230);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.sequence, sync.online, sync.canAct, setGame]);

  function finishTurn(score: number) {
    const scores = [...game.scores] as [number | null, number | null];
    scores[game.turn] = score;
    const completed = [...game.completed] as [boolean, boolean];
    completed[game.turn] = true;
    setGame({ ...game, scores, completed, phase: solo || game.turn === 1 ? "finished" : "turn-end" });
  }

  function pressToken(token: SequenceToken) {
    if (game.phase !== "input" || (sync.online && !sync.canAct)) return;
    const input = [...game.input, token];
    if (!isSequencePrefix(game.sequence, input)) {
      finishTurn(game.sequence.length - 1);
      return;
    }
    if (input.length === game.sequence.length) {
      if (game.sequence.length >= 9) {
        finishTurn(9);
      } else {
        const nextToken = SEQUENCE_TOKEN_IDS[Math.floor(Math.random() * SEQUENCE_TOKEN_IDS.length)];
        setGame({ ...game, sequence: [...game.sequence, nextToken], input: [], phase: "showing" });
      }
      return;
    }
    setGame({ ...game, input });
  }

  function nextPlayer() {
    if (game.phase !== "turn-end") return;
    const sequence = Array.from({ length: 3 }, () => SEQUENCE_TOKEN_IDS[Math.floor(Math.random() * SEQUENCE_TOKEN_IDS.length)]);
    setGame({ ...game, turn: 1, sequence, input: [], phase: "showing" });
  }

  function restart() {
    setGame(newSequenceState());
  }

  const activePlayer = solo ? "Você" : `Pessoa ${game.turn + 1}`;
  const winner = (game.scores[0] ?? 0) === (game.scores[1] ?? 0) ? "Empate" : (game.scores[0] ?? 0) > (game.scores[1] ?? 0) ? (solo ? "Você" : "Pessoa 1") : (solo ? "Morados" : "Pessoa 2");

  return (
    <section className="morados-game-surface symbol-sequence-game">
      <header className="morados-game-hero sequence-hero">
        <span className="morados-game-eyebrow"><Brain aria-hidden="true"/> MEMÓRIA E ATENÇÃO</span>
        <h2>{solo ? "Até onde vai sua memória?" : "Quem memoriza mais?"}</h2>
        <p>{solo ? "Observe a sequência, repita na ordem certa e tente alcançar o nível mais alto." : "Cada pessoa recebe sua própria sequência. Vence quem conseguir repetir a maior quantidade de símbolos."}</p>
        <div className="sequence-hero-art" aria-hidden="true"><span>🌙</span><span>⭐</span><span>🔥</span></div>
      </header>
      <div className="morados-game-score-row">
        <div className={game.turn === 0 ? "is-active" : ""}><span className="memory-player-mark is-one"/> {solo ? "Você" : "Pessoa 1"} <strong>{game.scores[0] ?? "—"}</strong></div>
        {!solo && <span className="morados-score-separator">×</span>}
        {!solo && <div className={game.turn === 1 ? "is-active" : ""}><span className="memory-player-mark is-two"/> Pessoa 2 <strong>{game.scores[1] ?? "—"}</strong></div>}
        {solo && <span className="sequence-level-pill">Nível {game.sequence.length}</span>}
      </div>
      <div className="sequence-display-card">
        <div className="sequence-display-heading"><span>{game.phase === "showing" ? "MEMORIZE A SEQUÊNCIA" : game.phase === "input" ? "REPITA NA MESMA ORDEM" : game.phase === "turn-end" ? "TENTATIVA CONCLUÍDA" : "RESULTADO FINAL"}</span><strong>{game.phase === "input" ? `${game.input.length}/${game.sequence.length}` : game.phase === "showing" ? `${game.sequence.length} símbolos` : " "}</strong></div>
        <div className="sequence-slots">
          {game.sequence.map((token, index) => {
            const item = SEQUENCE_TOKENS.find((entry) => entry.id === token)!;
            const visible = game.phase === "showing" || index < game.input.length;
            return <span key={index} className={"sequence-slot" + (visible ? " is-visible" : "")}>{visible ? item.emoji : "?"}</span>;
          })}
        </div>
        <p>{game.phase === "showing" ? "Preste atenção. Os símbolos vão desaparecer em seguida." : game.phase === "input" ? "Toque nos símbolos abaixo para reconstruir a sequência." : game.phase === "turn-end" ? `Pontuação: ${game.scores[0] ?? 0}. A outra pessoa terá uma nova sequência.` : solo ? `Você chegou ao nível ${game.scores[0] ?? 0}.` : `${winner} na partida.`}</p>
      </div>
      {game.phase === "input" && (
        <div className="sequence-pad">
          {SEQUENCE_TOKENS.map((token, index) => <button key={token.id} type="button" className={"sequence-token-button tone-" + index} onClick={() => pressToken(token.id)} disabled={sync.online && !sync.canAct}><span>{token.emoji}</span><small>{token.label}</small></button>)}
        </div>
      )}
      {game.phase === "turn-end" && (
        <div className="morados-game-result">
          <span><Trophy aria-hidden="true"/></span><h3>Pessoa 1: {game.scores[0]} pontos</h3><p>Agora é a vez da Pessoa 2. Uma nova sequência será apresentada.</p>
          <button type="button" className="morados-game-primary" onClick={nextPlayer}>Passar a vez</button>
        </div>
      )}
      {game.phase === "finished" && (
        <div className="morados-game-result">
          <span><Trophy aria-hidden="true"/></span>
          <p className="morados-game-eyebrow">DESAFIO CONCLUÍDO</p>
          <h3>{solo ? `Você chegou ao nível ${game.scores[0]}!` : `${winner} venceu!`}</h3>
          <p>{solo ? "Tente superar sua melhor sequência na próxima rodada." : `Pessoa 1: ${game.scores[0]} · Pessoa 2: ${game.scores[1]}`}</p>
          <button type="button" className="morados-game-primary" onClick={restart}><RotateCcw aria-hidden="true"/> Jogar novamente</button>
        </div>
      )}
      <footer className="morados-game-footer"><span>{solo ? "Desafio individual" : sync.online ? "Partida sincronizada" : "Dois jogadores · mesmo aparelho"}</span><button type="button" onClick={restart}><RotateCcw aria-hidden="true"/> Reiniciar</button></footer>
    </section>
  );
}
