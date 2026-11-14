import { useEffect, useMemo, useState } from "react";
import { Undo2, Trophy } from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";
import {
  createInitialCheckersGame,
  getLegalCheckersMoves,
  playCheckersMove,
  type CheckersGameState,
  type CheckersMove,
} from "@/lib/checkers";

const COLUMN_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function hasPathPrefix(path: number[], prefix: number[]) {
  return prefix.every((square, index) => path[index] === square);
}

function playerLabel(player: "white" | "black") {
  return player === "white" ? "Claras" : "Verdes";
}

export function CheckersGame({ solo = false }: { solo?: boolean }) {
  const [game, setGame, sync] = useGameState<CheckersGameState>(() => createInitialCheckersGame(), {
    turnSeat: (state) => (state.turn === "white" ? 0 : 1),
    outcome: (state) =>
      state.status === "finished"
        ? state.winner
          ? { kind: "win", winnerSeat: state.winner === "white" ? 0 : 1 }
          : { kind: "draw" }
        : null,
  });
  const [history, setHistory] = useState<CheckersGameState[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);

  useEffect(() => {
    if (!solo || sync.online || game.status !== "active" || game.turn !== "black") return;
    const timer = window.setTimeout(() => {
      const moves = getLegalCheckersMoves(game.board, "black");
      if (!moves.length) return;
      const ranked = moves.map((move) => {
        const destination = move.path[move.path.length - 1];
        const row = Math.floor(destination / 8);
        const capturedValue = move.captures.reduce((sum, square) => {
          const piece = game.board[square];
          return sum + (piece?.king ? 95 : 60);
        }, 0);
        const promotes = row === 7 && !game.board[move.from]?.king;
        const center = 3.5 - Math.abs(3.5 - (destination % 8));
        const advancement = row * 1.8;
        const score = capturedValue + (promotes ? 85 : 0) + center * 2 + advancement + Math.random() * 5;
        return { move, score };
      }).sort((a, b) => b.score - a.score);
      const next = playCheckersMove(game, ranked[0].move);
      setHistory((current) => [...current, game].slice(-50));
      setGame(next);
      setSelectedFrom(null);
      setSelectedPath([]);
    }, 560);
    return () => window.clearTimeout(timer);
  }, [solo, sync.online, game, setGame]);

  const legalMoves = useMemo(
    () =>
      game.status === "active"
        ? getLegalCheckersMoves(game.board, game.turn)
        : [],
    [game],
  );

  const selectedMoves = useMemo(
    () =>
      selectedFrom === null
        ? []
        : legalMoves.filter(
            (move) =>
              move.from === selectedFrom &&
              hasPathPrefix(move.path, selectedPath),
          ),
    [legalMoves, selectedFrom, selectedPath],
  );

  const nextDestinations = useMemo(
    () =>
      new Set(
        selectedMoves
          .map((move) => move.path[selectedPath.length])
          .filter((square): square is number => square !== undefined),
      ),
    [selectedMoves, selectedPath.length],
  );

  const displayBoard = useMemo(() => {
    const board = game.board.slice();

    if (selectedFrom === null || selectedPath.length === 0) return board;

    const previewMove = selectedMoves[0];
    const movingPiece = game.board[selectedFrom];

    if (!previewMove || !movingPiece) return board;

    board[selectedFrom] = null;
    for (const captured of previewMove.captures.slice(0, selectedPath.length)) {
      board[captured] = null;
    }
    board[selectedPath[selectedPath.length - 1]] = movingPiece;

    return board;
  }, [game.board, selectedFrom, selectedPath, selectedMoves]);

  const movableSquares = useMemo(
    () => new Set(legalMoves.map((move) => move.from)),
    [legalMoves],
  );

  const whiteCount = displayBoard.filter(
    (piece) => piece?.player === "white",
  ).length;
  const blackCount = displayBoard.filter(
    (piece) => piece?.player === "black",
  ).length;
  const captureRequired = legalMoves.some((move) => move.captures.length > 0);
  const selectedPosition =
    selectedPath.length > 0
      ? selectedPath[selectedPath.length - 1]
      : selectedFrom;

  function clearSelection() {
    setSelectedFrom(null);
    setSelectedPath([]);
  }

  function handleSquareClick(index: number) {
    if (game.status !== "active") return;

    const clickedPiece = game.board[index];

    if (selectedFrom === null) {
      if (
        clickedPiece?.player === game.turn &&
        movableSquares.has(index)
      ) {
        setSelectedFrom(index);
      }
      return;
    }

    if (selectedPath.length === 0 && index === selectedFrom) {
      clearSelection();
      return;
    }

    const matchingMoves = selectedMoves.filter(
      (move) => move.path[selectedPath.length] === index,
    );

    if (matchingMoves.length > 0) {
      const nextPath = [...selectedPath, index];
      const continuedMoves = matchingMoves.filter((move) =>
        hasPathPrefix(move.path, nextPath),
      );
      const completedMove = continuedMoves.find(
        (move) => move.path.length === nextPath.length,
      );
      const hasMoreSteps = continuedMoves.some(
        (move) => move.path.length > nextPath.length,
      );

      if (completedMove && !hasMoreSteps) {
        setHistory((current) => [...current, game].slice(-50));
        setGame((current) => playCheckersMove(current, completedMove));
        clearSelection();
      } else {
        setSelectedPath(nextPath);
      }
      return;
    }

    if (
      selectedPath.length === 0 &&
      clickedPiece?.player === game.turn &&
      movableSquares.has(index)
    ) {
      setSelectedFrom(index);
      return;
    }
  }

  function undoLastMove() {
    const steps = solo && history.length >= 2 ? 2 : 1;
    const previous = history[history.length - steps];
    if (!previous) return;
    setGame(previous);
    setHistory((current) => current.slice(0, -steps));
    clearSelection();
  }

  function startNewGame() {
    setGame(createInitialCheckersGame());
    setHistory([]);
    clearSelection();
  }

  const statusText =
    game.status === "finished"
      ? game.winner
        ? `${solo ? (game.winner === "white" ? "Você" : "Morados") : playerLabel(game.winner)} venceu a partida.`
        : "Empate. A partida terminou sem vencedor."
      : solo && game.turn === "black"
        ? "Morados estão analisando o tabuleiro…"
        : selectedPath.length > 0
          ? "Continue a sequência de captura."
          : captureRequired
            ? `Vez das ${playerLabel(game.turn).toLowerCase()}. Captura obrigatória: escolha uma peça que possa capturar.`
            : `Vez das ${playerLabel(game.turn).toLowerCase()}.`;

  return (
    <section className={"checkers-game" + (solo ? " is-solo" : "")} aria-labelledby="checkers-title">
      <header className="connect-four-heading">
        <div>
          <p className="date-kicker">Estratégia · {solo ? "contra Morados" : "2 jogadores"}</p>
          <h2 id="checkers-title">Damas brasileiras</h2>
        </div>
        <span className="checkers-mode-label">{solo ? "Você × Morados" : "Mesmo aparelho"}</span>
      </header>

      <div className="checkers-match">
        <div className="checkers-match-summary">
          <p className="connect-four-turn" role="status" aria-live="polite">
            {statusText}
          </p>
          <div className="checkers-score" aria-label="Peças restantes">
            <span><i className="checkers-piece is-white" /> {solo ? "Você" : "Claras"} <strong>{whiteCount}</strong></span>
            <span><i className="checkers-piece is-black" /> {solo ? "Morados" : "Verdes"} <strong>{blackCount}</strong></span>
          </div>
        </div>

        <div className="checkers-board" role="group" aria-label="Tabuleiro de damas brasileiras">
          {displayBoard.map((piece, index) => {
            const row = Math.floor(index / 8);
            const column = index % 8;
            const playableSquare = (row + column) % 2 === 1;
            const isSelected = selectedPosition === index;
            const isDestination = nextDestinations.has(index);
            const canSelectOwnPiece =
              game.status === "active" &&
              selectedPath.length === 0 &&
              piece?.player === game.turn &&
              movableSquares.has(index);
            const squareLabel = `Casa ${COLUMN_LABELS[column]}${8 - row}`;
            const pieceLabel = piece
              ? `, peça ${piece.player === "white" ? "clara" : "verde"}${piece.king ? ", dama" : ""}`
              : "";

            return (
              <button
                key={index}
                type="button"
                className={[
                  "checkers-square",
                  playableSquare ? "is-playable" : "is-light",
                  isSelected ? "is-selected" : "",
                  isDestination ? "is-destination" : "",
                  canSelectOwnPiece ? "can-select-piece" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => handleSquareClick(index)}
                disabled={!playableSquare || game.status === "finished" || (solo && game.turn === "black") }
                aria-label={squareLabel + pieceLabel + (isDestination ? ", destino permitido" : "")}
                aria-pressed={isSelected}
              >
                {piece && (
                  <span
                    className={[
                      "checkers-piece",
                      piece.player === "white" ? "is-white" : "is-black",
                      piece.king ? "is-king" : "",
                    ].filter(Boolean).join(" ")}
                    aria-hidden="true"
                  >
                    {piece.king ? "D" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="checkers-actions">
          <div className="checkers-action-info">
            <p className="checkers-instructions">
              Toque em uma peça para selecioná-la e depois escolha uma casa marcada. As jogadas permitidas ficam destacadas. {solo ? "Os Morados respondem automaticamente após sua jogada." : "Ao jogar no mesmo aparelho, alternem as vezes."}
            </p>
            <span className="checkers-move-count">
              {history.length} {history.length === 1 ? "jogada concluída" : "jogadas concluídas"}
            </span>
          </div>
          <div className="checkers-action-buttons">
            <button
              type="button"
              className="inline-action"
              onClick={undoLastMove}
              disabled={history.length === 0 || sync.online}
            >
              <Undo2 aria-hidden="true" />
              Desfazer
            </button>
            <button
              type="button"
              className="inline-action"
              onClick={startNewGame}
            >
              Reiniciar partida
            </button>
          </div>
        </div>
      </div>
      {game.status === "finished" && (
        <div className="quiz-finish game-mode-victory-panel" role="status" aria-live="polite">
          <span><Trophy aria-hidden="true"/></span>
          <p className="date-kicker">FIM DA PARTIDA</p>
          <h3>{game.winner ? `${solo ? (game.winner === "white" ? "Você" : "Morados") : playerLabel(game.winner)} venceram!` : "Empate!"}</h3>
          <p>{history.length} jogadas concluídas. As peças e o resultado ficaram registrados nesta tela.</p>
          <button type="button" className="primary-action" onClick={startNewGame}><RotateCcw aria-hidden="true"/> Jogar novamente</button>
        </div>
      )}
    </section>
  );
}
