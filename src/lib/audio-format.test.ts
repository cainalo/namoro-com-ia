import { describe, expect, it } from "vitest";
import { formatAudioTime } from "./audio-format";

describe("formatAudioTime", () => {
  it("formats minutes and seconds with two-digit seconds", () => {
    expect(formatAudioTime(0)).toBe("0:00");
    expect(formatAudioTime(8)).toBe("0:08");
    expect(formatAudioTime(65)).toBe("1:05");
    expect(formatAudioTime(125.9)).toBe("2:05");
  });

  it("includes hours for long recordings", () => {
    expect(formatAudioTime(3600)).toBe("1:00:00");
    expect(formatAudioTime(3665)).toBe("1:01:05");
  });

  it("safely handles negative and non-finite values", () => {
    expect(formatAudioTime(-1)).toBe("0:00");
    expect(formatAudioTime(Number.NaN)).toBe("0:00");
    expect(formatAudioTime(Number.POSITIVE_INFINITY)).toBe("0:00");
  });
});
