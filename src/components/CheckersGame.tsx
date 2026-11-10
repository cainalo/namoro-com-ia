import { useMemo, useState } from "react";
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

export function CheckersGame() {
  const [game, setGame] = useState<CheckersGameState>(() =>
    createInitialCheckersGame(),
  );
  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);

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

  function startNewGame() {
    setGame(createInitialCheckersGame());
    clearSelection();
  }

  const statusText =
    game.status === "finished"
      ? `${playerLabel(game.winner ?? game.turn)} venceram a partida.`
      : selectedPath.length > 0
        ? "Continue a sequência de captura."
        : captureRequired
          ? `Vez das ${playerLabel(game.turn).toLowerCase()}. Captura obrigatória: escolha uma peça que possa capturar.`
          : `Vez das ${playerLabel(game.turn).toLowerCase()}.`;

  return (
    <section className="checkers-game" aria-labelledby="checkers-title">
      <header className="connect-four-heading">
        <div>
          <p className="date-kicker">Estratégia · prévia local para 2 jogadores</p>
          <h2 id="checkers-title">Damas brasileiras</h2>
        </div>
        <span className="checkers-mode-label">Mesmo aparelho</span>
      </header>

      <div className="checkers-match">
        <div className="checkers-match-summary">
          <p className="connect-four-turn" role="status" aria-live="polite">
            {statusText}
          </p>
          <div className="checkers-score" aria-label="Peças restantes">
            <span><i className="checkers-piece is-white" /> Claras <strong>{whiteCount}</strong></span>
            <span><i className="checkers-piece is-black" /> Verdes <strong>{blackCount}</strong></span>
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
                disabled={!playableSquare || game.status === "finished"}
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
          <p className="checkers-instructions">
            Toque em uma peça para selecioná-la e depois escolha uma casa marcada. As jogadas permitidas ficam destacadas.
          </p>
          <button
            type="button"
            className="inline-action"
            onClick={startNewGame}
          >
            Reiniciar partida
          </button>
        </div>
      </div>
    </section>
  );
}
