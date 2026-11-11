// Resilient storage for Supabase auth in normal browsers and embedded Lovable previews.
export interface PreviewAuthStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

type BrokerRequestType =
  | "lovable-preview-auth:get"
  | "lovable-preview-auth:set"
  | "lovable-preview-auth:remove";

interface BrokerRequest {
  type: BrokerRequestType;
  requestId: string;
  projectId: string;
  key: string;
  value?: string;
}

interface BrokerReply {
  ok: boolean;
  value: string | null;
}

const RESULT = "lovable-preview-auth:result";

function readBrokerReply(data: unknown, requestId: string): BrokerReply | null {
  if (typeof data !== "object" || data === null) return null;
  if (!("type" in data) || data.type !== RESULT) return null;
  if (!("requestId" in data) || data.requestId !== requestId) return null;

  return {
    ok: "ok" in data && Boolean(data.ok),
    value: "value" in data && typeof data.value === "string" ? data.value : null,
  };
}

function createSafeStorage(): PreviewAuthStorage {
  // Some embedded browsers block even reading window.localStorage. Keep the app
  // usable with an in-memory fallback rather than failing during module startup.
  const memory = new Map<string, string>();

  const getStorage = (): Storage | null => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  const read = (key: string): string | null => {
    const storage = getStorage();
    if (storage) {
      try {
        const value = storage.getItem(key);
        if (value !== null) {
          memory.set(key, value);
          return value;
        }
      } catch {
        // Fall through to memory storage.
      }
    }
    return memory.get(key) ?? null;
  };

  const write = (key: string, value: string): void => {
    memory.set(key, value);
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      // The in-memory value remains available for this page session.
    }
  };

  const remove = (key: string): void => {
    memory.delete(key);
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // The in-memory value is already cleared.
    }
  };

  return { getItem: read, setItem: write, removeItem: remove };
}

/**
 * On Lovable preview surfaces, share auth state with the editor when its
 * message broker is available. Every storage operation still has a safe local
 * fallback, so a blocked iframe or unavailable broker cannot freeze the app.
 */
export function brokeredPreviewStorage(): PreviewAuthStorage | undefined {
  if (typeof window === "undefined") return undefined;

  const safeStorage = createSafeStorage();
  const host = window.location.hostname;
  const previewZones = [
    "lovableproject.com",
    "lovableproject-dev.com",
    "lovable.app",
    "gpt-eng.com",
    "gptengineer.run",
  ];
  const onPreviewZone = previewZones.some(
    (zone) => host === zone || host.endsWith("." + zone),
  );

  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const projectId = onPreviewZone
    ? (
        new RegExp(
          "^(?:id-preview(?:-[a-z0-9]+)?|project)--(" + uuid + ")(?:-dev)?(?=\\.|$)",
          "i",
        ).exec(host)?.[1] ??
        new RegExp("^live--(" + uuid + ")(?:-thr_[a-z0-9]+)?(?=\\.|$)", "i").exec(host)?.[1] ??
        new RegExp("^(" + uuid + ")(?=[.-])", "i").exec(host)?.[1]
      )
    : undefined;

  const parentWindow = window.parent;
  const framed = parentWindow !== window;
  if (!projectId || !framed) return safeStorage;

  const dev =
    host.endsWith(".lovableproject-dev.com") || host.endsWith(".gpt-eng.com");
  const editorPattern = dev
    ? /^https:\/\/([a-z0-9-]+\.)*(lovable\.dev|gptengineer\.app)$|^http:\/\/localhost:3000$/
    : /^https:\/\/([a-z0-9-]+\.)*(lovable\.dev|gptengineer\.app)$/;

  let ancestor = "";
  try {
    const origins = window.location.ancestorOrigins;
    ancestor = origins?.[0] ?? "";
  } catch {
    // Some WebViews do not expose ancestorOrigins.
  }
  if (!ancestor && document.referrer) {
    try {
      ancestor = new URL(document.referrer).origin;
    } catch {
      ancestor = "";
    }
  }

  const editorOrigins =
    ancestor && editorPattern.test(ancestor)
      ? [ancestor]
      : dev
        ? ["https://lovable.dev", "http://localhost:3000"]
        : ["https://lovable.dev"];

  const timeoutMs = 1600;
  const newId = () =>
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  const request = (
    type: BrokerRequestType,
    key: string,
    value?: string,
  ): Promise<BrokerReply | null> =>
    new Promise((resolve) => {
      const requestId = newId();
      let done = false;

      const finish = (reply: BrokerReply | null) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        resolve(reply);
      };

      const onMessage = (event: MessageEvent<unknown>) => {
        if (!editorOrigins.includes(event.origin)) return;
        const reply = readBrokerReply(event.data, requestId);
        if (reply) finish(reply);
      };

      window.addEventListener("message", onMessage);
      const timer = window.setTimeout(() => finish(null), timeoutMs);
      const message: BrokerRequest = { type, requestId, projectId, key };
      if (value !== undefined) message.value = value;

      for (const origin of editorOrigins) {
        try {
          parentWindow.postMessage(message, origin);
        } catch {
          // The local storage fallback remains available.
        }
      }
    });

  let firstGet = true;
  const retryDelayMs = 200;

  return {
    getItem: async (key) => {
      const localValue = safeStorage.getItem(key);
      let reply = await request(
        "lovable-preview-auth:get",
        key,
        localValue ?? undefined,
      );

      if (!reply && firstGet) {
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, retryDelayMs),
        );
        reply = await request(
          "lovable-preview-auth:get",
          key,
          safeStorage.getItem(key) ?? undefined,
        );
      }
      firstGet = false;

      if (reply?.ok && reply.value !== null) {
        if (reply.value === "") {
          safeStorage.removeItem(key);
          return null;
        }
        if (localValue === null) safeStorage.setItem(key, reply.value);
        return reply.value;
      }

      return safeStorage.getItem(key);
    },

    setItem: async (key, value) => {
      safeStorage.setItem(key, value);
      const reply = await request("lovable-preview-auth:set", key, value);
      if (reply?.ok && reply.value !== null) {
        if (reply.value === "") safeStorage.removeItem(key);
        else safeStorage.setItem(key, reply.value);
      }
    },

    removeItem: async (key) => {
      const localValue = safeStorage.getItem(key);
      safeStorage.removeItem(key);
      await request(
        "lovable-preview-auth:remove",
        key,
        localValue ?? undefined,
      );
    },
  };
}
