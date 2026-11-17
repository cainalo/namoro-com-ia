import { describe, expect, it } from "vitest";
import { parseCoupleCallSignal } from "./couple-call-signaling";

const base = {
  callId: "call-00000001",
  fromUserId: "member-a",
  toUserId: "member-b",
};

describe("parseCoupleCallSignal", () => {
  it("accepts a valid audio or video invitation with an SDP offer", () => {
    const signal = parseCoupleCallSignal({
      ...base,
      action: "invite",
      kind: "video",
      description: { type: "offer", sdp: "v=0\\r\\n" },
    });

    expect(signal).toEqual({
      ...base,
      action: "invite",
      kind: "video",
      description: { type: "offer", sdp: "v=0\\r\\n" },
    });
  });

  it("accepts a valid SDP answer", () => {
    expect(parseCoupleCallSignal({
      ...base,
      action: "answer",
      description: { type: "answer", sdp: "v=0\\r\\n" },
    })).toMatchObject({ action: "answer", callId: base.callId });
  });

  it("normalizes call-end reasons", () => {
    expect(parseCoupleCallSignal({ ...base, action: "end", reason: "declined" }))
      .toMatchObject({ action: "end", reason: "declined" });
    expect(parseCoupleCallSignal({ ...base, action: "end", reason: "unexpected" }))
      .toMatchObject({ action: "end", reason: "ended" });
  });

  it.each([
    null,
    {},
    { ...base, action: "invite", kind: "video", description: { type: "offer", sdp: "" } },
    { ...base, action: "invite", kind: "video", description: { type: "offer", sdp: "x".repeat(100_001) } },
    { ...base, toUserId: base.fromUserId, action: "end" },
    { ...base, fromUserId: "", action: "end" },
    { ...base, action: "invite", kind: "screen", description: { type: "offer", sdp: "v=0" } },
    { ...base, action: "unknown" },
  ])("rejects malformed or unsupported signal payloads", (payload) => {
    expect(parseCoupleCallSignal(payload)).toBeNull();
  });
});
