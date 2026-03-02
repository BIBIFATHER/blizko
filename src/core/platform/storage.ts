export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let adapter: StorageAdapter | null = null;

/**
 * Sets the platform storage implementation.
 * Web should set localStorage adapter; Expo will set AsyncStorage adapter later.
 */
export function setStorageAdapter(next: StorageAdapter) {
  adapter = next;
}

export function getItem(key: string): string | null {
  return adapter ? adapter.getItem(key) : null;
}

export function setItem(key: string, value: string): void {
  adapter?.setItem(key, value);
}

export function removeItem(key: string): void {
  adapter?.removeItem(key);
}
