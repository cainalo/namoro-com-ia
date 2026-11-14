import { describe, expect, it } from "vitest";
import { normalizeWaveform } from "./audio-waveform";

describe("normalizeWaveform", () => {
  it("clamps waveform peaks to the supported visual range", () => {
    expect(normalizeWaveform([-2, 0, 0.25, 0.555, 1, 3])).toEqual([
      0.07, 0.07, 0.25, 0.56, 1, 1,
    ]);
  });

  it("discards non-finite values and returns an empty list when nothing is usable", () => {
    expect(normalizeWaveform([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])).toEqual([]);
  });

  it("limits the waveform to 96 bars", () => {
    expect(normalizeWaveform(Array.from({ length: 120 }, () => 0.5))).toHaveLength(96);
  });
});
