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

function stateWith(board: CheckersBoard): CheckersGameState {
  return {
    board,
    turn: "white",
    status: "active",
    winner: null,
    turnNumber: 1,
  };
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
