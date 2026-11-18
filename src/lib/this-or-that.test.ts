import { describe, expect, it } from "vitest";
import { createMoradosPreferenceProfile, getDailyThisOrThatRound, getFreshThisOrThatRound, thisOrThatQuestions } from "./this-or-that";

describe("This or That question bank", () => {
  it("contains many unique prompts with two complete choices", () => {
    expect(thisOrThatQuestions.length).toBeGreaterThanOrEqual(50);
    expect(new Set(thisOrThatQuestions.map((item) => item.id)).size).toBe(thisOrThatQuestions.length);
    for (const item of thisOrThatQuestions) {
      expect(item.prompt.length).toBeGreaterThan(8);
      expect(item.a.length).toBeGreaterThan(1);
      expect(item.b.length).toBeGreaterThan(1);
      expect(item.a).not.toBe(item.b);
    }
  });

  it("returns a stable daily round for the two accounts", () => {
    const day = new Date("2026-11-14T12:00:00-03:00");
    const first = getDailyThisOrThatRound(day);
    const second = getDailyThisOrThatRound(day);
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(first).toHaveLength(15);
    expect(new Set(first.map((item) => item.id)).size).toBe(15);
  });

  it("avoids the previous round when building a fresh local round", () => {
    const first = getFreshThisOrThatRound([], 15);
    const second = getFreshThisOrThatRound(first.map((item) => item.id), 15);
    expect(second).toHaveLength(15);
    expect(second.some((item) => first.some((old) => old.id === item.id))).toBe(false);
  });
});


describe("Morados solo preference profile", () => {
  it("keeps one balanced and repeatable answer for every question in the round", () => {
    const questions = thisOrThatQuestions.slice(0, 15);
    const makeRandom = () => {
      let value = 0.37;
      return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
      };
    };

    const first = createMoradosPreferenceProfile(questions, makeRandom());
    const second = createMoradosPreferenceProfile(questions, makeRandom());
    const values = Object.values(first);

    expect(first).toEqual(second);
    expect(Object.keys(first)).toHaveLength(questions.length);
    expect(values.filter((choice) => choice === "a")).toHaveLength(8);
    expect(values.filter((choice) => choice === "b")).toHaveLength(7);
    expect(Object.keys(first).sort()).toEqual(questions.map((question) => question.id).sort());
  });
});
