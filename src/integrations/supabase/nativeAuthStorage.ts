/**
 * Durable storage for Supabase Auth inside the native Capacitor WebView.
 * localStorage remains the fast path; IndexedDB is a persistence fallback
 * for devices/WebViews that reject localStorage access.
 */
const DB_NAME = "morados-native-auth";
const STORE_NAME = "auth";
let databasePromise: Promise<IDBDatabase | null> | null = null;

function openAuthDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return databasePromise;
}

function readIndexedDb(db: IDBDatabase, key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeIndexedDb(db: IDBDatabase, key: string, value: string | null): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      if (value === null) store.delete(key);
      else store.put(value, key);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export function createNativeAuthStorage() {
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const value = window.localStorage.getItem(key);
        if (value !== null) return value;
      } catch {
        // Try the independent IndexedDB store below.
      }
      const db = await openAuthDatabase();
      if (!db) return null;
      const value = await readIndexedDb(db, key);
      if (value !== null) {
        try { window.localStorage.setItem(key, value); } catch { /* IndexedDB remains the source of truth. */ }
      }
      return value;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      let localSaved = false;
      try {
        window.localStorage.setItem(key, value);
        localSaved = true;
      } catch {
        // Continue with IndexedDB.
      }
      const db = await openAuthDatabase();
      const databaseSaved = db ? await writeIndexedDb(db, key, value) : false;
      if (!localSaved && !databaseSaved) {
        throw new Error("Não foi possível salvar a sessão neste dispositivo.");
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try { window.localStorage.removeItem(key); } catch { /* Clear the secondary store too. */ }
      const db = await openAuthDatabase();
      if (db) await writeIndexedDb(db, key, null);
    },
  };
}
