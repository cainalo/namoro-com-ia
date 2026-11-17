/**
 * A creator may use the couple workspace while it is awaiting the second member.
 * Archived or unknown states must never unlock the workspace.
 */
export function canUseCoupleWorkspace(status: unknown): status is "active" | "pending" {
  return status === "active" || status === "pending";
}
