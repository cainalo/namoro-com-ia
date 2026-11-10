import { supabase } from "@/integrations/supabase/client";

export type RpcError = {
  code?: string;
  message: string;
};

type RpcResponse = {
  data: unknown;
  error: RpcError | null;
};

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResponse>;
};

// Invitation RPCs are generated in the database migration. The generated
// Supabase Database type is refreshed separately by the official generator.
const rpcClient = supabase as unknown as RpcClient;

export function callCoupleRpc(
  name: string,
  args?: Record<string, unknown>,
): Promise<RpcResponse> {
  return Promise.resolve(rpcClient.rpc(name, args));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
