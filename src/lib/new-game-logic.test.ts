import { describe, expect, it } from "vitest";
import { chooseMemoryBotPair, createMemoryDeck, isSequencePrefix, MEMORY_SYMBOLS } from "./new-game-logic";

describe("memory match rules", () => {
  it("creates exactly two cards for each symbol", () => {
    const deck = createMemoryDeck(() => 0.42);
    expect(deck).toHaveLength(MEMORY_SYMBOLS.length * 2);
    for (const symbol of MEMORY_SYMBOLS) {
      expect(deck.filter((card) => card === symbol)).toHaveLength(2);
    }
  });

  it("lets the memory opponent use a pair it has already seen", () => {
    const deck = ["🌙", "🍃", "🌙", "🍃"];
    expect(chooseMemoryBotPair(deck, [], { 0: "🌙", 2: "🌙", 1: "🍃" })).toEqual([0, 2]);
  });

  it("never selects an already matched card", () => {
    const pair = chooseMemoryBotPair(["🌙", "🍃", "🌙"], [0], {}, () => 0);
    expect(pair).not.toBeNull();
    expect(pair).toHaveLength(2);
    expect(pair?.every((index) => index !== 0)).toBe(true);
  });
});

describe("symbol sequence rules", () => {
  it("accepts a correct partial sequence", () => {
    expect(isSequencePrefix(["moon", "fire", "leaf"], ["moon", "fire"])).toBe(true);
  });

  it("rejects a wrong symbol or an input that is too long", () => {
    expect(isSequencePrefix(["moon", "fire"], ["moon", "leaf"])).toBe(false);
    expect(isSequencePrefix(["moon"], ["moon", "fire"])).toBe(false);
  });
});
