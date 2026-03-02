import type { StorageAdapter } from "../../core/platform/storage";

export const webStorageAdapter: StorageAdapter = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
