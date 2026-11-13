import { supabase } from "@/integrations/supabase/client";

export type ConversationWallpaper = "paper" | "petals" | "confetti" | "night" | "photo";
export type ConversationMessageFont = "system" | "serif" | "rounded";

export type ConversationAppearance = {
  wallpaper: ConversationWallpaper;
  backgroundImagePath: string | null;
  backgroundBrightness: number;
  backgroundOpacity: number;
  ownBubbleColor: string;
  otherBubbleColor: string;
  messageTextColor: string;
  bubbleRadius: number;
  messageFont: ConversationMessageFont;
};

export type ConversationNotificationPreferences = {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  previews: boolean;
};

export const DEFAULT_CONVERSATION_APPEARANCE: ConversationAppearance = {
  wallpaper: "paper",
  backgroundImagePath: null,
  backgroundBrightness: 100,
  backgroundOpacity: 100,
  ownBubbleColor: "#556b2f",
  otherBubbleColor: "#fffdf8",
  messageTextColor: "#292c25",
  bubbleRadius: 18,
  messageFont: "system",
};

export const DEFAULT_CONVERSATION_NOTIFICATIONS: ConversationNotificationPreferences = {
  enabled: true,
  sound: true,
  vibration: true,
  previews: true,
};

type SettingsError = { message?: string } | null;
type AppearanceRow = { appearance: unknown } | null;
type PreferencesRow = { preferences: unknown } | null;

type ConversationSettingsClient = {
  from: (table: "couple_conversation_settings") => {
    select: (columns: string) => {
      eq: (column: "couple_id", value: string) => {
        maybeSingle: () => PromiseLike<{ data: AppearanceRow; error: SettingsError }>;
      };
    };
    upsert: (
      values: { couple_id: string; appearance: ConversationAppearance; updated_by: string },
      options: { onConflict: "couple_id" },
    ) => PromiseLike<{ error: SettingsError }>;
  };
};

type MemberSettingsClient = {
  from: (table: "couple_conversation_member_settings") => {
    select: (columns: string) => {
      eq: (column: "couple_id" | "user_id", value: string) => {
        maybeSingle: () => PromiseLike<{ data: PreferencesRow; error: SettingsError }>;
      };
    };
    upsert: (
      values: { couple_id: string; user_id: string; preferences: ConversationNotificationPreferences },
      options: { onConflict: "couple_id,user_id" },
    ) => PromiseLike<{ error: SettingsError }>;
  };
};

const appearanceClient = supabase as unknown as ConversationSettingsClient;
const memberClient = supabase as unknown as MemberSettingsClient;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function normalizeConversationAppearance(value: unknown): ConversationAppearance {
  const source = isRecord(value) ? value : {};
  const wallpaper = source.wallpaper;
  const messageFont = source.messageFont;
  const brightness = typeof source.backgroundBrightness === "number" && Number.isFinite(source.backgroundBrightness)
    ? Math.min(160, Math.max(40, Math.round(source.backgroundBrightness)))
    : DEFAULT_CONVERSATION_APPEARANCE.backgroundBrightness;
  const opacity = typeof source.backgroundOpacity === "number" && Number.isFinite(source.backgroundOpacity)
    ? Math.min(100, Math.max(0, Math.round(source.backgroundOpacity)))
    : DEFAULT_CONVERSATION_APPEARANCE.backgroundOpacity;
  const radius = typeof source.bubbleRadius === "number" && Number.isFinite(source.bubbleRadius)
    ? Math.min(30, Math.max(10, Math.round(source.bubbleRadius)))
    : DEFAULT_CONVERSATION_APPEARANCE.bubbleRadius;

  return {
    wallpaper:
      wallpaper === "paper" || wallpaper === "petals" || wallpaper === "confetti" ||
      wallpaper === "night" || wallpaper === "photo"
        ? wallpaper
        : DEFAULT_CONVERSATION_APPEARANCE.wallpaper,
    backgroundImagePath: typeof source.backgroundImagePath === "string" ? source.backgroundImagePath : null,
    backgroundBrightness: brightness,
    backgroundOpacity: opacity,
    ownBubbleColor: validColor(source.ownBubbleColor, DEFAULT_CONVERSATION_APPEARANCE.ownBubbleColor),
    otherBubbleColor: validColor(source.otherBubbleColor, DEFAULT_CONVERSATION_APPEARANCE.otherBubbleColor),
    messageTextColor: validColor(source.messageTextColor, DEFAULT_CONVERSATION_APPEARANCE.messageTextColor),
    bubbleRadius: radius,
    messageFont: messageFont === "system" || messageFont === "serif" || messageFont === "rounded"
      ? messageFont
      : DEFAULT_CONVERSATION_APPEARANCE.messageFont,
  };
}

export function normalizeConversationNotifications(value: unknown): ConversationNotificationPreferences {
  const source = isRecord(value) ? value : {};
  return {
    enabled: typeof source.enabled === "boolean" ? source.enabled : true,
    sound: typeof source.sound === "boolean" ? source.sound : true,
    vibration: typeof source.vibration === "boolean" ? source.vibration : true,
    previews: typeof source.previews === "boolean" ? source.previews : true,
  };
}

function readLocal<T>(key: string, normalize: (value: unknown) => T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? normalize(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or storage quotas must not block the conversation UI.
  }
}

export function readLocalConversationAppearance(coupleId: string) {
  return readLocal(
    "morados-conversation-appearance:" + coupleId,
    normalizeConversationAppearance,
    DEFAULT_CONVERSATION_APPEARANCE,
  );
}

export function readLocalConversationNotifications(coupleId: string, userId: string) {
  return readLocal(
    "morados-conversation-notifications:" + coupleId + ":" + userId,
    normalizeConversationNotifications,
    DEFAULT_CONVERSATION_NOTIFICATIONS,
  );
}

export async function loadConversationAppearance(coupleId: string) {
  const fallback = readLocalConversationAppearance(coupleId);
  try {
    const { data, error } = await appearanceClient
      .from("couple_conversation_settings")
      .select("appearance")
      .eq("couple_id", coupleId)
      .maybeSingle();
    if (error) return fallback;
    if (!data) return fallback;
    const appearance = normalizeConversationAppearance(data.appearance);
    writeLocal("morados-conversation-appearance:" + coupleId, appearance);
    return appearance;
  } catch {
    return fallback;
  }
}

export async function saveConversationAppearance(
  coupleId: string,
  userId: string,
  appearance: ConversationAppearance,
) {
  writeLocal("morados-conversation-appearance:" + coupleId, appearance);
  try {
    const { error } = await appearanceClient
      .from("couple_conversation_settings")
      .upsert(
        { couple_id: coupleId, appearance, updated_by: userId },
        { onConflict: "couple_id" },
      );
    return !error;
  } catch {
    return false;
  }
}

export async function loadConversationNotifications(coupleId: string, userId: string) {
  const key = "morados-conversation-notifications:" + coupleId + ":" + userId;
  const fallback = readLocalConversationNotifications(coupleId, userId);
  try {
    const { data, error } = await memberClient
      .from("couple_conversation_member_settings")
      .select("preferences")
      .eq("couple_id", coupleId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return fallback;
    const preferences = normalizeConversationNotifications(data.preferences);
    writeLocal(key, preferences);
    return preferences;
  } catch {
    return fallback;
  }
}

export async function saveConversationNotifications(
  coupleId: string,
  userId: string,
  preferences: ConversationNotificationPreferences,
) {
  writeLocal("morados-conversation-notifications:" + coupleId + ":" + userId, preferences);
  try {
    const { error } = await memberClient
      .from("couple_conversation_member_settings")
      .upsert(
        { couple_id: coupleId, user_id: userId, preferences },
        { onConflict: "couple_id,user_id" },
      );
    return !error;
  } catch {
    return false;
  }
}
