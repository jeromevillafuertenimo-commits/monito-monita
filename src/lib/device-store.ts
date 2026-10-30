// Tiny safe wrappers around localStorage (private mode / blocked storage = no-op).
export function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function lsSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
export function lsRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
export function lsGetJson<T>(key: string): T | null {
  const raw = lsGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
export function lsSetJson(key: string, value: unknown): void {
  lsSet(key, JSON.stringify(value));
}
