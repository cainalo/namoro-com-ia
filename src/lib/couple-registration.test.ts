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
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "test-key",
  },
}));

vi.mock("./couple-rpc", () => ({
  callCoupleRpc: mocks.callCoupleRpc,
}));

import { completeCouplePairing } from "./couple-registration";

describe("completeCouplePairing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { user_metadata: { morados_pair_token: "a".repeat(64) } } },
      error: null,
    });
    mocks.refreshSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("keeps the creator usable while the partner account is still awaiting confirmation", async () => {
    mocks.callCoupleRpc.mockResolvedValue({
      data: [{ result_status: "waiting_for_partner", couple_id: "pending-couple-123" }],
      error: null,
    });

    const result = await completeCouplePairing();

    expect(result).toEqual({ pending: true, connected: false, error: null });
    expect(mocks.callCoupleRpc).toHaveBeenCalledWith("complete_couple_pairing", {
      p_token: "a".repeat(64),
    });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes the session after the second verified account creates the couple", async () => {
    mocks.callCoupleRpc.mockResolvedValue({
      data: [{ result_status: "connected", couple_id: "couple-123" }],
      error: null,
    });

    const result = await completeCouplePairing();

    expect(result).toEqual({ pending: false, connected: true, error: null });
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("does not make a missing backend function an authentication failure", async () => {
    mocks.callCoupleRpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Function not found" },
    });

    const result = await completeCouplePairing();

    expect(result.pending).toBe(true);
    expect(result.connected).toBe(false);
    expect(result.error).toContain("Function not found");
  });
});
