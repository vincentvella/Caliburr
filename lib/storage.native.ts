import { createMMKV } from 'react-native-mmkv';

export interface SyncStorage {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
}

const mmkv = createMMKV();

export const storage: SyncStorage = {
  getString: (key) => mmkv.getString(key),
  set: (key, value) => mmkv.set(key, value),
  delete: (key) => mmkv.remove(key),
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
