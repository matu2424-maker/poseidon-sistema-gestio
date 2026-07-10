export function readColumnPreference<Key extends string>(storageKey: string, columns: { key: Key }[], fixed: Key[]): Key[] {
  const fallback = fixed;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Key[];
    const allowed = new Set(columns.map((column) => column.key));
    const next = parsed.filter((key) => allowed.has(key));
    return [...next, ...fixed.filter((key) => !next.includes(key))];
  } catch {
    return fallback;
  }
}

export function writeColumnPreference<Key extends string>(storageKey: string, visibleColumns: Key[]) {
  localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
}
