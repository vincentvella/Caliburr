export interface SyncStorage {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
}

const noopStorage: SyncStorage = {
  getString: () => undefined,
  set: () => {},
  delete: () => {},
};

// SSR / Node.js — no persistent storage available
export const storage: SyncStorage =
  typeof window === 'undefined'
    ? noopStorage
    : {
        getString: (key) => window.localStorage.getItem(key) ?? undefined,
        set: (key, value) => window.localStorage.setItem(key, value),
        delete: (key) => window.localStorage.removeItem(key),
      };

// Async adapter satisfying Supabase's storage interface (and AsyncStorage's shape).
// Wraps synchronous calls in resolved promises — no I/O, no useEffect needed.
export const asyncStorageAdapter = {
  getItem: (key: string): Promise<string | null> => Promise.resolve(storage.getString(key) ?? null),
  setItem: (key: string, value: string): Promise<void> => {
    storage.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    storage.delete(key);
    return Promise.resolve();
  },
};
