import { describe, expect, it } from "vitest";
import { canUseCoupleWorkspace } from "./couple-access";

describe("canUseCoupleWorkspace", () => {
  it("allows the creator to use a pending couple workspace", () => {
    expect(canUseCoupleWorkspace("pending")).toBe(true);
  });

  it("keeps active couple workspaces available", () => {
    expect(canUseCoupleWorkspace("active")).toBe(true);
  });

  it.each(["archived", "deleted", null, undefined, "", "unknown"])(
    "does not unlock a couple with status %s",
    (status) => {
      expect(canUseCoupleWorkspace(status)).toBe(false);
    },
  );
});
