import { registerPlugin } from "@capacitor/core";

export type NativeAuthMode = "signin" | "signup";

export interface NativeAuthCredentials {
  cancelled: boolean;
  email?: string;
  password?: string;
}

export interface NativeTextInputResult {
  cancelled: boolean;
  text?: string;
}

export interface NativeTextInputOptions {
  title: string;
  hint: string;
  initialValue?: string;
  confirmText?: string;
  maxLength?: number;
}

interface NativeAuthPlugin {
  showCredentialsDialog(options: { mode: NativeAuthMode }): Promise<NativeAuthCredentials>;
  showTextInputDialog(options: NativeTextInputOptions): Promise<NativeTextInputResult>;
}

export const NativeAuth = registerPlugin<NativeAuthPlugin>("NativeAuth");
