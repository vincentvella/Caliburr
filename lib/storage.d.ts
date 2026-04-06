// Type shim — Metro resolves `./storage` to `./storage.native.ts` or `./storage.web.ts`.
// TypeScript resolves this file for type checking.

export interface SyncStorage {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
}

export declare const storage: SyncStorage;

export declare const asyncStorageAdapter: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
