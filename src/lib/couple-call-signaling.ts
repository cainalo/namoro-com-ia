import type { RealtimeChannel } from "@supabase/supabase-js";

export type CoupleCallKind = "audio" | "video";

type CallSignalBase = {
  callId: string;
  fromUserId: string;
  toUserId: string;
};

export type CoupleCallSignal =
  | (CallSignalBase & {
      action: "invite";
      kind: CoupleCallKind;
      description: RTCSessionDescriptionInit;
    })
  | (CallSignalBase & {
      action: "answer";
      description: RTCSessionDescriptionInit;
    })
  | (CallSignalBase & {
      action: "end";
      reason?: "declined" | "ended" | "unavailable";
    });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDescription(value: unknown): value is RTCSessionDescriptionInit {
  if (!isRecord(value)) return false;
  return (value.type === "offer" || value.type === "answer") && typeof value.sdp === "string";
}

export function parseCoupleCallSignal(value: unknown): CoupleCallSignal | null {
  if (!isRecord(value)) return null;
  if (typeof value.callId !== "string" || !value.callId ||
      typeof value.fromUserId !== "string" || typeof value.toUserId !== "string") return null;

  const base = {
    callId: value.callId,
    fromUserId: value.fromUserId,
    toUserId: value.toUserId,
  };

  if (value.action === "invite" && (value.kind === "audio" || value.kind === "video") && isDescription(value.description) && value.description.type === "offer") {
    return { ...base, action: "invite", kind: value.kind, description: value.description };
  }

  if (value.action === "answer" && isDescription(value.description) && value.description.type === "answer") {
    return { ...base, action: "answer", description: value.description };
  }

  if (value.action === "end") {
    const reason = value.reason === "declined" || value.reason === "unavailable" ? value.reason : "ended";
    return { ...base, action: "end", reason };
  }

  return null;
}

export function createCoupleCallId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const randomPart = Math.random().toString(36).slice(2);
  return Date.now().toString(36) + "-" + randomPart;
}

export async function waitForIceGatheringComplete(
  peer: RTCPeerConnection,
  timeoutMs = 7000,
): Promise<void> {
  if (peer.iceGatheringState === "complete") return;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      peer.removeEventListener("icegatheringstatechange", onStateChange);
      resolve();
    };
    const onStateChange = () => {
      if (peer.iceGatheringState === "complete") finish();
    };
    const timeout = window.setTimeout(finish, timeoutMs);
    peer.addEventListener("icegatheringstatechange", onStateChange);
    onStateChange();
  });
}

export async function sendCoupleCallSignal(
  channel: RealtimeChannel,
  signal: CoupleCallSignal,
): Promise<void> {
  const status = await channel.send({
    type: "broadcast",
    event: "call-signal",
    payload: signal,
  });

  if (status !== "ok") {
    throw new Error("Não foi possível enviar o sinal da chamada pelo Morados Realtime.");
  }
}
