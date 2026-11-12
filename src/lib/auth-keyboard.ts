export function applyAuthKey(current: string, key: string, maxLength: number): string {
  if (key === "BACKSPACE") return current.slice(0, -1);
  return `${current}${key}`.slice(0, maxLength);
}

export function normalizeAuthEmail(value: string): string {
  return value.trim().toLowerCase();
}
