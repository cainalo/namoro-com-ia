import { describe, expect, it } from "vitest";
import {
  createInitialCheckersBoard,
  createInitialCheckersGame,
  getCheckersCoordinates,
  getLegalCheckersMoves,
  playCheckersMove,
  toCheckersIndex,
  type CheckersBoard,
  type CheckersGameState,
  type CheckersPlayer,
} from "./checkers";

function emptyBoard(): CheckersBoard {
  return Array.from({ length: 64 }, () => null);
}

function place(
  board: CheckersBoard,
  row: number,
  column: number,
  player: CheckersPlayer,
  king = false,
) {
  board[toCheckersIndex(row, column)] = { player, king };
}

function stateWith(
  board: CheckersBoard,
  overrides: Partial<CheckersGameState> = {},
): CheckersGameState {
  const key = "white:" + board.map((piece) => {
    if (!piece) return ".";
    return (piece.player === "white" ? "W" : "B") + (piece.king ? "D" : "P");
  }).join("");

  return {
    board,
    turn: "white",
    status: "active",
    winner: null,
    turnNumber: 1,
    positionCounts: { [key]: 1 },
    quietKingMoves: 0,
    specialEndgameMoves: null,
    ...overrides,
  };
}

function playBetween(
  state: CheckersGameState,
  from: [number, number],
  to: [number, number],
): CheckersGameState {
  const fromIndex = toCheckersIndex(from[0], from[1]);
  const toIndex = toCheckersIndex(to[0], to[1]);
  const move = getLegalCheckersMoves(state.board, state.turn).find(
    (candidate) => candidate.from === fromIndex && candidate.path[0] === toIndex,
  );
  if (!move) throw new Error("test_move_not_found");
  return playCheckersMove(state, move);
}

describe("Damas brasileiras — posição inicial", () => {
  it("monta 12 peças para cada lado e deixa as brancas começarem", () => {
    const board = createInitialCheckersBoard();
    const whitePieces = board.filter((piece) => piece?.player === "white");
    const blackPieces = board.filter((piece) => piece?.player === "black");

    expect(board).toHaveLength(64);
    expect(whitePieces).toHaveLength(12);
    expect(blackPieces).toHaveLength(12);
    expect(getLegalCheckersMoves(board, "white")).toHaveLength(7);
    expect(createInitialCheckersGame().turn).toBe("white");
  });
});

describe("Damas brasileiras — regras de movimento", () => {
  it("permite que uma pedra capture para trás", () => {
    const board = emptyBoard();
    place(board, 3, 2, "white");
    place(board, 4, 3, "black");

    const moves = getLegalCheckersMoves(board, "white");

    expect(moves).toHaveLength(1);
    expect(moves[0].path).toEqual([toCheckersIndex(5, 4)]);
    expect(moves[0].captures).toEqual([toCheckersIndex(4, 3)]);
  });

  it("obriga a escolher a sequência que captura mais peças", () => {
    const board = emptyBoard();
    place(board, 5, 0, "white");
    place(board, 4, 1, "black");
    place(board, 5, 4, "white");
    place(board, 4, 5, "black");
    place(board, 2, 5, "black");

    const moves = getLegalCheckersMoves(board, "white");

    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe(toCheckersIndex(5, 4));
    expect(moves[0].path).toEqual([
      toCheckersIndex(3, 6),
      toCheckersIndex(1, 4),
    ]);
    expect(moves[0].captures).toHaveLength(2);
  });

  it("permite que uma dama capture à distância e escolha onde pousar", () => {
    const board = emptyBoard();
    place(board, 5, 0, "white", true);
    place(board, 3, 2, "black");

    const moves = getLegalCheckersMoves(board, "white");
    const destinations = moves.map((move) => move.path[0]);

    expect(moves).toHaveLength(3);
    expect(destinations).toEqual([
      toCheckersIndex(2, 3),
      toCheckersIndex(1, 4),
      toCheckersIndex(0, 5),
    ]);
    expect(moves.every((move) => move.captures.length === 1)).toBe(true);
  });

  it("só promove quando a pedra termina o lance na última fileira", () => {
    const board = emptyBoard();
    place(board, 2, 1, "white");
    place(board, 1, 2, "black");
    place(board, 1, 4, "black");

    const moves = getLegalCheckersMoves(board, "white");
    expect(moves).toHaveLength(1);
    expect(moves[0].path).toEqual([
      toCheckersIndex(0, 3),
      toCheckersIndex(2, 5),
    ]);

    const next = playCheckersMove(stateWith(board), moves[0]);
    expect(next.board[toCheckersIndex(2, 5)]).toEqual({
      player: "white",
      king: false,
    });
  });

  it("promove a pedra que termina na fileira de coroação", () => {
    const board = emptyBoard();
    place(board, 1, 2, "white");
    place(board, 7, 0, "black");

    const move = getLegalCheckersMoves(board, "white").find(
      (candidate) => candidate.path[0] === toCheckersIndex(0, 1),
    );

    expect(move).toBeDefined();
    const next = playCheckersMove(stateWith(board), move!);

    expect(next.board[toCheckersIndex(0, 1)]).toEqual({
      player: "white",
      king: true,
    });
  });

  it("encerra a partida quando o adversário não tem jogadas", () => {
    const board = emptyBoard();
    place(board, 2, 1, "white");
    place(board, 7, 0, "black");

    const move = getLegalCheckersMoves(board, "white")[0];
    const next = playCheckersMove(stateWith(board), move);

    expect(next.status).toBe("finished");
    expect(next.winner).toBe("white");
    expect(next.turn).toBe("black");
  });

  it("declara empate quando a mesma posição retorna pela terceira vez com o mesmo lado a jogar", () => {
    const board = emptyBoard();
    place(board, 5, 0, "white", true);
    place(board, 2, 7, "black", true);
    let state = stateWith(board);

    for (let cycle = 0; cycle < 2; cycle += 1) {
      state = playBetween(state, [5, 0], [4, 1]);
      state = playBetween(state, [2, 7], [3, 6]);
      state = playBetween(state, [4, 1], [5, 0]);
      state = playBetween(state, [3, 6], [2, 7]);
    }

    expect(state.status).toBe("finished");
    expect(state.winner).toBeNull();
    expect(state.drawReason).toBe("threefold-repetition");
  });

  it("declara empate após vinte lances por lado só com damas e sem captura", () => {
    const board = emptyBoard();
    place(board, 5, 0, "white", true);
    place(board, 2, 7, "black", true);
    const state = stateWith(board, { quietKingMoves: 39 });

    const next = playBetween(state, [5, 0], [4, 1]);

    expect(next.status).toBe("finished");
    expect(next.winner).toBeNull();
    expect(next.quietKingMoves).toBe(40);
    expect(next.drawReason).toBe("twenty-king-moves");
  });

  it("zera a contagem de lances tranquilos quando uma pedra se move", () => {
    const board = emptyBoard();
    place(board, 5, 0, "white");
    place(board, 2, 7, "black");
    const state = stateWith(board, { quietKingMoves: 39 });

    const next = playBetween(state, [5, 0], [4, 1]);

    expect(next.status).toBe("active");
    expect(next.quietKingMoves).toBe(0);
  });

  it("zera a contagem de lances tranquilos após uma captura", () => {
    const board = emptyBoard();
    place(board, 5, 0, "white", true);
    place(board, 4, 1, "black");
    place(board, 2, 7, "black");
    const state = stateWith(board, { quietKingMoves: 39 });

    const next = playBetween(state, [5, 0], [3, 2]);

    expect(next.status).toBe("active");
    expect(next.quietKingMoves).toBe(0);
  });

  it("aplica o limite de cinco lances por lado nos finais regulamentados", () => {
    const board = emptyBoard();
    place(board, 5, 0, "white", true);
    place(board, 5, 2, "white", true);
    place(board, 2, 7, "black", true);
    const state = stateWith(board, { specialEndgameMoves: 9 });

    const next = playBetween(state, [5, 0], [4, 1]);

    expect(next.status).toBe("finished");
    expect(next.winner).toBeNull();
    expect(next.specialEndgameMoves).toBe(10);
    expect(next.drawReason).toBe("limited-endgame");
  });

  it("rejeita uma jogada que não respeita as opções legais", () => {
    const state = createInitialCheckersGame();

    expect(() =>
      playCheckersMove(state, {
        from: toCheckersIndex(5, 0),
        path: [toCheckersIndex(4, 1)],
        captures: [toCheckersIndex(4, 1)],
      }),
    ).toThrow("illegal_checkers_move");
  });

  it("converte índices e coordenadas sem inverter linhas e colunas", () => {
    const index = toCheckersIndex(6, 3);

    expect(getCheckersCoordinates(index)).toEqual({ row: 6, column: 3 });
  });
});
