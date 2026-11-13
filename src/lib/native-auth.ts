import { registerPlugin } from "@capacitor/core";

export type NativeAuthMode = "signin" | "signup";

export interface NativeAuthCredentials {
  cancelled: boolean;
  email?: string;
  password?: string;
}

interface NativeAuthPlugin {
  showCredentialsDialog(options: { mode: NativeAuthMode }): Promise<NativeAuthCredentials>;
}

export const NativeAuth = registerPlugin<NativeAuthPlugin>("NativeAuth");
