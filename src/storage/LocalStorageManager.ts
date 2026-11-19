/**
 * LocalStorageManager
 * Simple synchronous key-value settings cache on top of IndexedDB.
 * Also manages lightweight in-memory preference state.
 */

export class LocalStorageManager {
  private static cache: Map<string, unknown> = new Map();

  public static set<T>(key: string, value: T): void {
    this.cache.set(key, value);
    try {
      localStorage.setItem(`eyecontrol:${key}`, JSON.stringify(value));
    } catch {
      // Quota exceeded or private mode — degrade gracefully
    }
  }

  public static get<T>(key: string, defaultValue: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    try {
      const raw = localStorage.getItem(`eyecontrol:${key}`);
      if (raw !== null) {
        const val = JSON.parse(raw) as T;
        this.cache.set(key, val);
        return val;
      }
    } catch {
      // Corrupted or parse failure — return default
    }
    return defaultValue;
  }

  public static remove(key: string): void {
    this.cache.delete(key);
    try {
      localStorage.removeItem(`eyecontrol:${key}`);
    } catch {
      // Silently ignore
    }
  }

  public static clearAll(): void {
    this.cache.clear();
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('eyecontrol:')) keys.push(key);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch {
      // Silently ignore
    }
  }
}
