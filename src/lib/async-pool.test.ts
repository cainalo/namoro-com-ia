import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./async-pool";

describe("mapWithConcurrency", () => {
  it("preserves input order while respecting the concurrency limit", async () => {
    let active = 0;
    let maximum = 0;
    const result = await mapWithConcurrency([4, 3, 2, 1], 2, async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    });
    expect(result).toEqual([8, 6, 4, 2]);
    expect(maximum).toBeLessThanOrEqual(2);
    expect(maximum).toBeGreaterThan(1);
  });

  it("returns immediately for an empty list", async () => {
    let calls = 0;
    await expect(mapWithConcurrency([], 4, async (value: number) => { calls += 1; return value; })).resolves.toEqual([]);
    expect(calls).toBe(0);
  });

  it("stops scheduling new work after a failure", async () => {
    const started: number[] = [];
    await expect(mapWithConcurrency([0, 1, 2, 3, 4], 2, async (value) => {
      started.push(value);
      if (value === 1) throw new Error("broken");
      await new Promise((resolve) => setTimeout(resolve, 2));
      return value;
    })).rejects.toThrow("broken");
    expect(started.length).toBeLessThan(5);
  });
});
