import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  refreshSession: vi.fn(),
  callCoupleRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      refreshSession: mocks.refreshSession,
    },
  },
}));

vi.mock("@/lib/couple-rpc", () => ({
  callCoupleRpc: mocks.callCoupleRpc,
  isRecord: (value: unknown) => typeof value === "object" && value !== null && !Array.isArray(value),
}));

import { completeCouplePairing } from "@/lib/couple-registration";

describe("completeCouplePairing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          user_metadata: {
            morados_pair_token: "a".repeat(64),
            morados_pair_email: "partner@example.com",
          },
        },
      },
      error: null,
    });
    mocks.refreshSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("keeps the first verified account available while the partner is pending", async () => {
    mocks.callCoupleRpc.mockResolvedValue({
      data: {
        status: "pending",
        reason: "awaiting_partner_email",
        couple_id: "couple-1",
      },
      error: null,
    });

    const result = await completeCouplePairing();

    expect(result.pending).toBe(true);
    expect(result.active).toBe(false);
    expect(result.error).toBeNull();
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes the session only after both accounts are paired", async () => {
    mocks.callCoupleRpc.mockResolvedValue({
      data: {
        status: "active",
        reason: "both_emails_verified",
        couple_id: "couple-1",
      },
      error: null,
    });

    const result = await completeCouplePairing();

    expect(result.pending).toBe(false);
    expect(result.active).toBe(true);
    expect(result.error).toBeNull();
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("does not block personal access if the pairing RPC is temporarily unavailable", async () => {
    mocks.callCoupleRpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "function not found" },
    });

    const result = await completeCouplePairing();

    expect(result.pending).toBe(true);
    expect(result.active).toBe(false);
    expect(result.error).toContain("acesso individual");
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("does nothing for an account without a pairing token", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1", user_metadata: {} } },
      error: null,
    });

    const result = await completeCouplePairing();

    expect(result.pending).toBe(false);
    expect(result.active).toBe(false);
    expect(mocks.callCoupleRpc).not.toHaveBeenCalled();
  });
});
