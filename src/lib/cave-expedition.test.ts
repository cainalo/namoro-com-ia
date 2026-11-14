import { describe, expect, it } from "vitest";
import { CAVE_FLOORS, caveCell, caveFloorIsValid, isAdjacent, revealCave } from "./cave-expedition";

describe("cave expedition maps", () => {
  it("provides three valid dungeon floor layouts", () => {
    expect(CAVE_FLOORS).toHaveLength(3);
    CAVE_FLOORS.forEach((floor) => expect(caveFloorIsValid(floor)).toBe(true));
  });
  it("keeps walls outside the map and reports floor tiles", () => {
    expect(caveCell(CAVE_FLOORS[0].map, { x: 0, y: 0 })).toBe("#");
    expect(caveCell(CAVE_FLOORS[0].map, { x: 1, y: 1 })).toBe(".");
  });
  it("reveals a local area around both explorers", () => {
    const map = CAVE_FLOORS[0].map.map((row) => row.replace("P", "."));
    const seen = revealCave(map, [{ x: 1, y: 1 }, { x: 1, y: 2 }]);
    expect(seen).toContain("1,1");
    expect(seen).toContain("1,2");
    expect(seen).not.toContain("8,6");
  });
  it("allows only orthogonally adjacent tile moves", () => {
    expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 2 })).toBe(true);
    expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(false);
  });
});
