import { describe, expect, it } from "vitest";
import {
  advanceIslandTutorial,
  islandTutorialProgress,
  type IslandTutorialStep,
} from "./island-survival-tutorial";

describe("island survival guided tutorial", () => {
  it("unlocks one lesson only after the matching task is completed", () => {
    const sequence: Array<[IslandTutorialStep, Parameters<typeof advanceIslandTutorial>[1], IslandTutorialStep]> = [
      ["story", "begin", "forage"],
      ["forage", "forage", "water"],
      ["water", "water", "shelter"],
      ["shelter", "shelter", "night"],
      ["night", "night", "forest"],
      ["forest", "forest", "wreck"],
      ["wreck", "wreck", "signal"],
      ["signal", "signal", "free"],
    ];
    for (const [current, completed, expected] of sequence) {
      expect(advanceIslandTutorial(current, completed)).toBe(expected);
    }
  });

  it("does not skip a lesson when a different task is reported", () => {
    expect(advanceIslandTutorial("forage", "water")).toBe("forage");
    expect(advanceIslandTutorial("shelter", "forest")).toBe("shelter");
    expect(advanceIslandTutorial("free", "signal")).toBe("free");
  });

  it("reports no chapter progress before starting and full progress after the final repair", () => {
    expect(islandTutorialProgress("story")).toBe(0);
    expect(islandTutorialProgress("free")).toBe(100);
  });
});
