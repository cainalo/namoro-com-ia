import { describe, expect, it } from "vitest";
import { applyAuthKey, normalizeAuthEmail } from "./auth-keyboard";

describe("Morados custom authentication keyboard", () => {
  it("appends characters without exceeding the field limit", () => {
    expect(applyAuthKey("caina", "o", 6)).toBe("cainao");
    expect(applyAuthKey("cainao", "x", 6)).toBe("cainao");
  });

  it("removes one character with backspace", () => {
    expect(applyAuthKey("cainao", "BACKSPACE", 254)).toBe("caina");
    expect(applyAuthKey("", "BACKSPACE", 254)).toBe("");
  });

  it("supports symbols and spaces entered by the virtual keyboard", () => {
    expect(applyAuthKey("caina", "@", 254)).toBe("caina@");
    expect(applyAuthKey("primeira", " ", 128)).toBe("primeira ");
  });

  it("normalizes e-mail before authentication", () => {
    expect(normalizeAuthEmail("  Caina@Exemplo.COM ")).toBe("caina@exemplo.com");
  });
});
