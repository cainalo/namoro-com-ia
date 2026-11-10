/**
 * Núcleo de regras para Damas brasileiras (tabuleiro 8×8).
 *
 * As funções são puras: não acessam Supabase, React, relógio ou estado global.
 * A interface e a persistência online serão conectadas em etapas separadas.
 */

export const CHECKERS_BOARD_SIZE = 8;
export const CHECKERS_RULESET_ID = "brazilian-8x8" as const;

export type CheckersPlayer = "white" | "black";

export type CheckersPiece = {
  player: CheckersPlayer;
  king: boolean;
};

export type CheckersBoard = Array<CheckersPiece | null>;

export type CheckersMove = {
  /** Índice da casa de origem (linha * 8 + coluna). */
  from: number;
  /** Casas de pouso, na ordem em que a peça percorre a jogada. */
  path: number[];
  /** Índices das peças capturadas, na ordem da captura. */
  captures: number[];
};

export type CheckersGameState = {
  board: CheckersBoard;
  turn: CheckersPlayer;
  status: "active" | "finished";
  winner: CheckersPlayer | null;
  turnNumber: number;
};

type Direction = readonly [row: number, column: number];

const DIAGONALS: Direction[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function assertBoard(board: CheckersBoard): void {
  if (!Array.isArray(board) || board.length !== CHECKERS_BOARD_SIZE ** 2) {
    throw new Error("invalid_checkers_board");
  }

  for (const piece of board) {
    if (
      piece !== null &&
      (typeof piece !== "object" ||
        (piece.player !== "white" && piece.player !== "black") ||
        typeof piece.king !== "boolean")
    ) {
      throw new Error("invalid_checkers_piece");
    }
  }
}

function isInsideBoard(row: number, column: number): boolean {
  return (
    row >= 0 &&
    row < CHECKERS_BOARD_SIZE &&
    column >= 0 &&
    column < CHECKERS_BOARD_SIZE
  );
}

export function toCheckersIndex(row: number, column: number): number {
  if (!isInsideBoard(row, column)) {
    throw new Error("checkers_position_out_of_bounds");
  }

  return row * CHECKERS_BOARD_SIZE + column;
}

export function getCheckersCoordinates(index: number): {
  row: number;
  column: number;
} {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= CHECKERS_BOARD_SIZE ** 2
  ) {
    throw new Error("checkers_index_out_of_bounds");
  }

  return {
    row: Math.floor(index / CHECKERS_BOARD_SIZE),
    column: index % CHECKERS_BOARD_SIZE,
  };
}

export function createInitialCheckersBoard(): CheckersBoard {
  const board: CheckersBoard = Array.from(
    { length: CHECKERS_BOARD_SIZE ** 2 },
    () => null,
  );

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < CHECKERS_BOARD_SIZE; column += 1) {
      if ((row + column) % 2 === 1) {
        board[toCheckersIndex(row, column)] = {
          player: "black",
          king: false,
        };
      }
    }
  }

  for (let row = 5; row < CHECKERS_BOARD_SIZE; row += 1) {
    for (let column = 0; column < CHECKERS_BOARD_SIZE; column += 1) {
      if ((row + column) % 2 === 1) {
        board[toCheckersIndex(row, column)] = {
          player: "white",
          king: false,
        };
      }
    }
  }

  return board;
}

export function createInitialCheckersGame(): CheckersGameState {
  return {
    board: createInitialCheckersBoard(),
    turn: "white",
    status: "active",
    winner: null,
    turnNumber: 1,
  };
}

function getCaptureSteps(
  board: CheckersBoard,
  from: number,
  piece: CheckersPiece,
): Array<{ landing: number; captured: number }> {
  const { row, column } = getCheckersCoordinates(from);
  const steps: Array<{ landing: number; captured: number }> = [];

  if (!piece.king) {
    // Pedras capturam para frente e para trás, sempre saltando uma casa.
    for (const [rowDirection, columnDirection] of DIAGONALS) {
      const capturedRow = row + rowDirection;
      const capturedColumn = column + columnDirection;
      const landingRow = row + rowDirection * 2;
      const landingColumn = column + columnDirection * 2;

      if (
        !isInsideBoard(capturedRow, capturedColumn) ||
        !isInsideBoard(landingRow, landingColumn)
      ) {
        continue;
      }

      const captured = toCheckersIndex(capturedRow, capturedColumn);
      const landing = toCheckersIndex(landingRow, landingColumn);
      const target = board[captured];

      if (target && target.player !== piece.player && board[landing] === null) {
        steps.push({ landing, captured });
      }
    }

    return steps;
  }

  // Damas voadoras: podem pousar em qualquer casa livre depois da peça capturada.
  for (const [rowDirection, columnDirection] of DIAGONALS) {
    let scanRow = row + rowDirection;
    let scanColumn = column + columnDirection;
    let captured: number | null = null;

    while (isInsideBoard(scanRow, scanColumn)) {
      const index = toCheckersIndex(scanRow, scanColumn);
      const occupant = board[index];

      if (occupant) {
        if (captured !== null || occupant.player === piece.player) {
          break;
        }

        captured = index;
      } else if (captured !== null) {
        steps.push({ landing: index, captured });
      }

      scanRow += rowDirection;
      scanColumn += columnDirection;
    }
  }

  return steps;
}

function collectCaptureSequences(
  board: CheckersBoard,
  from: number,
  current: number,
  piece: CheckersPiece,
  path: number[],
  captures: number[],
  result: CheckersMove[],
): void {
  const steps = getCaptureSteps(board, current, piece);

  if (steps.length === 0) {
    if (captures.length > 0) {
      result.push({ from, path, captures });
    }
    return;
  }

  for (const step of steps) {
    const nextBoard = board.slice();
    nextBoard[current] = null;
    // A peça capturada sai do cálculo da sequência e não pode ser capturada de novo.
    nextBoard[step.captured] = null;
    nextBoard[step.landing] = piece;

    collectCaptureSequences(
      nextBoard,
      from,
      step.landing,
      piece,
      [...path, step.landing],
      [...captures, step.captured],
      result,
    );
  }
}

function getQuietMovesForPiece(
  board: CheckersBoard,
  from: number,
  piece: CheckersPiece,
): CheckersMove[] {
  const { row, column } = getCheckersCoordinates(from);
  const moves: CheckersMove[] = [];

  if (!piece.king) {
    const forward = piece.player === "white" ? -1 : 1;

    for (const columnDirection of [-1, 1]) {
      const targetRow = row + forward;
      const targetColumn = column + columnDirection;

      if (!isInsideBoard(targetRow, targetColumn)) continue;

      const target = toCheckersIndex(targetRow, targetColumn);
      if (board[target] === null) {
        moves.push({ from, path: [target], captures: [] });
      }
    }

    return moves;
  }

  for (const [rowDirection, columnDirection] of DIAGONALS) {
    let targetRow = row + rowDirection;
    let targetColumn = column + columnDirection;

    while (isInsideBoard(targetRow, targetColumn)) {
      const target = toCheckersIndex(targetRow, targetColumn);
      if (board[target] !== null) break;

      moves.push({ from, path: [target], captures: [] });
      targetRow += rowDirection;
      targetColumn += columnDirection;
    }
  }

  return moves;
}

function sameNumbers(left: number[], right: number[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Retorna todas as jogadas permitidas. Se houver captura, aplica a captura
 * obrigatória e a lei da maioria antes de devolver as opções.
 */
export function getLegalCheckersMoves(
  board: CheckersBoard,
  player: CheckersPlayer,
): CheckersMove[] {
  assertBoard(board);

  const captures: CheckersMove[] = [];

  for (let from = 0; from < board.length; from += 1) {
    const piece = board[from];
    if (!piece || piece.player !== player) continue;

    collectCaptureSequences(
      board,
      from,
      from,
      piece,
      [],
      [],
      captures,
    );
  }

  if (captures.length > 0) {
    const maximumCaptures = Math.max(
      ...captures.map((move) => move.captures.length),
    );

    return captures.filter(
      (move) => move.captures.length === maximumCaptures,
    );
  }

  const quietMoves: CheckersMove[] = [];

  for (let from = 0; from < board.length; from += 1) {
    const piece = board[from];
    if (!piece || piece.player !== player) continue;
    quietMoves.push(...getQuietMovesForPiece(board, from, piece));
  }

  return quietMoves;
}

/**
 * Aplica uma jogada completa, incluindo toda a sequência de capturas.
 * A jogada precisa corresponder exatamente a uma opção legal do estado atual.
 */
export function playCheckersMove(
  state: CheckersGameState,
  move: CheckersMove,
): CheckersGameState {
  if (state.status !== "active") {
    throw new Error("checkers_game_finished");
  }

  assertBoard(state.board);

  const legalMoves = getLegalCheckersMoves(state.board, state.turn);
  const selectedMove = legalMoves.find(
    (candidate) =>
      candidate.from === move.from &&
      sameNumbers(candidate.path, move.path) &&
      sameNumbers(candidate.captures, move.captures),
  );

  if (!selectedMove || selectedMove.path.length === 0) {
    throw new Error("illegal_checkers_move");
  }

  const piece = state.board[selectedMove.from];
  if (!piece || piece.player !== state.turn) {
    throw new Error("invalid_checkers_mover");
  }

  const board = state.board.slice();
  const destination = selectedMove.path[selectedMove.path.length - 1];

  board[selectedMove.from] = null;
  for (const capturedIndex of selectedMove.captures) {
    board[capturedIndex] = null;
  }

  const destinationRow = getCheckersCoordinates(destination).row;
  const reachesCrowningRow =
    (piece.player === "white" && destinationRow === 0) ||
    (piece.player === "black" && destinationRow === CHECKERS_BOARD_SIZE - 1);

  board[destination] = {
    ...piece,
    // A promoção só acontece se a peça terminar o lance na última fileira.
    king: piece.king || reachesCrowningRow,
  };

  const nextTurn = state.turn === "white" ? "black" : "white";
  const nextPlayerHasPieces = board.some(
    (candidate) => candidate?.player === nextTurn,
  );
  const nextPlayerCanMove =
    nextPlayerHasPieces && getLegalCheckersMoves(board, nextTurn).length > 0;
  const finished = !nextPlayerCanMove;

  return {
    board,
    turn: nextTurn,
    status: finished ? "finished" : "active",
    winner: finished ? state.turn : null,
    turnNumber: state.turnNumber + 1,
  };
}
