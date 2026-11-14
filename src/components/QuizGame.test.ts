import { describe, expect, it } from "vitest";
import { questionBank } from "./QuizGame";

describe("Quiz question bank", () => {
  it("contains at least eighty questions with unique identifiers", () => {
    expect(questionBank.length).toBeGreaterThanOrEqual(80);
    expect(new Set(questionBank.map((item) => item.id)).size).toBe(questionBank.length);
  });

  it("has four distinct options and a valid answer for every question", () => {
    for (const item of questionBank) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(4);
      expect(item.explanation.length).toBeGreaterThan(15);
    }
  });

  it("covers the four main categories", () => {
    expect(new Set(questionBank.map((item) => item.category))).toEqual(new Set(["Ciência", "Natureza", "Geografia", "Cultura"]));
  });
});
