import type { AppData } from "../types";

export const STORAGE_KEY = "poseidon-sistema-gestion-v2";
export const OPERATIONAL_RESET_MARKER_KEY = "poseidon-operational-reset-marker";
export const OPERATIONAL_RESET_MARKER = "reset-saldos-2026-06-26-v2";

const stripLargeInlineFiles = (value: string) =>
  value.replace(/data:[^"]{500,}/g, "[archivo no persistido en localStorage]");

export function dataForLocalStorage(data: AppData, compact = false): AppData {
  const auditLimit = compact ? 350 : data.audit.length;
  return {
    ...data,
    locals: data.locals.map((local) => ({
      ...local,
      images: (local.images ?? []).map((image) => ({
        ...image,
        dataUrl: "",
      })),
    })),
    expenses: data.expenses.map((expense) => ({
      ...expense,
      receiptDataUrl: undefined,
    })),
    audit: data.audit.slice(0, auditLimit).map((event) => ({
      ...event,
      previousValue: stripLargeInlineFiles(event.previousValue).slice(0, compact ? 8000 : 30000),
      newValue: stripLargeInlineFiles(event.newValue).slice(0, compact ? 8000 : 30000),
    })),
    machineLocalHistory: compact ? data.machineLocalHistory.slice(0, 1200) : data.machineLocalHistory,
    accountMovements: compact ? data.accountMovements.slice(0, 2000) : data.accountMovements,
  };
}

export function readStoredAppData(): AppData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AppData) : null;
}

export function writeStoredAppData(data: AppData): "ok" | "compacted" | "failed" {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataForLocalStorage(data)));
    return "ok";
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataForLocalStorage(data, true)));
      return "compacted";
    } catch {
      return "failed";
    }
  }
}

export const isOperationalResetMarked = () =>
  localStorage.getItem(OPERATIONAL_RESET_MARKER_KEY) === OPERATIONAL_RESET_MARKER;

export const markOperationalReset = () => {
  localStorage.setItem(OPERATIONAL_RESET_MARKER_KEY, OPERATIONAL_RESET_MARKER);
};

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
