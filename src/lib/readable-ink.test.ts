import { describe, expect, it } from "vitest";
import { DARK_INK, LIGHT_INK, contrastRatio, readableInk } from "./readable-ink";

describe("readableInk", () => {
  it("uses light text on the dark green own bubble", () => {
    expect(readableInk("#555f36", DARK_INK)).toBe(LIGHT_INK);
  });
  it("keeps the chosen text color when it is readable", () => {
    expect(readableInk("#fffdfa", "#342d24")).toBe("#342d24");
  });
  it("falls back to dark text on light bubbles", () => {
    expect(readableInk("#faece5", "#ffffff")).toBe(DARK_INK);
  });
  it("computes the WCAG ratio for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});
