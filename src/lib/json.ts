// Helpers for the JSON-as-String columns (SQLite has no Json scalar).
// Always parse defensively — a corrupt/empty string must never crash a page.

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (value == null || value === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseStringArray(value: string | null | undefined): string[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

export function parseRecord<T = unknown>(value: string | null | undefined): Record<string, T> {
  const parsed = parseJson<unknown>(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, T>)
    : {};
}
