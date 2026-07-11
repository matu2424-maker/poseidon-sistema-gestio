import type { AppData } from "../../types";
import { createSnapshot, decodeSnapshot } from "./snapshot";

export const STORAGE_KEY = "poseidon-sistema-gestion-v2";

export type StorageLoadResult =
  | { status: "empty" }
  | { status: "ready"; data: AppData; sourceVersion: number; needsRewrite: boolean; raw: string }
  | { status: "corrupt"; raw: string; error: string };

export type StorageSaveResult =
  | { status: "ok"; bytes: number }
  | { status: "failed"; error: string };

const stripInlineFiles = (value: string) =>
  value.replace(/data:[^"]{500,}/g, "[archivo no persistido en almacenamiento local]");

export function appDataForStorage(data: AppData): AppData {
  return {
    ...data,
    locals: data.locals.map((local) => ({
      ...local,
      images: (local.images ?? []).map((image) => ({ ...image, dataUrl: "" })),
    })),
    expenses: data.expenses.map((expense) => ({ ...expense, receiptDataUrl: undefined })),
    audit: data.audit.map((event) => ({
      ...event,
      previousValue: stripInlineFiles(event.previousValue),
      newValue: stripInlineFiles(event.newValue),
    })),
  };
}

export function serializeAppData(data: AppData) {
  return JSON.stringify(createSnapshot(appDataForStorage(data)), null, 2);
}

export function loadLocalAppData(): StorageLoadResult {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { status: "empty" };
  const decoded = decodeSnapshot(raw);
  if (!decoded.ok) return { status: "corrupt", raw, error: decoded.error };
  return { status: "ready", ...decoded.value, raw };
}

export function saveLocalAppData(data: AppData): StorageSaveResult {
  const serialized = serializeAppData(data);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    return { status: "ok", bytes: new Blob([serialized]).size };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo escribir el almacenamiento local.";
    return { status: "failed", error: message };
  }
}

export function importLocalAppData(raw: string): StorageLoadResult {
  const decoded = decodeSnapshot(raw);
  if (!decoded.ok) return { status: "corrupt", raw, error: decoded.error };
  return { status: "ready", ...decoded.value, raw };
}

export function clearLocalAppData() {
  localStorage.removeItem(STORAGE_KEY);
}
