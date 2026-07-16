import type { AppData } from "../../types";
import type {
  AppDataBackupCodec,
  AppDataLoadResult,
  AppDataRepository,
  AppDataSaveResult,
} from "../../application/ports/AppDataRepository";
import { createSnapshot, decodeSnapshot } from "./snapshot";

export const STORAGE_KEY = "poseidon-sistema-gestion-v2";

export type StorageLoadResult = AppDataLoadResult;
export type StorageSaveResult = AppDataSaveResult;

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

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

export function loadLocalAppData(storage: KeyValueStorage = localStorage): StorageLoadResult {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return { status: "empty" };
  const decoded = decodeSnapshot(raw);
  if (!decoded.ok) return { status: "corrupt", raw, error: decoded.error };
  return { status: "ready", ...decoded.value, raw };
}

export function saveLocalAppData(
  data: AppData,
  storage: KeyValueStorage = localStorage,
  expectedRaw?: string | null,
): StorageSaveResult {
  let serialized = "";
  try {
    serialized = serializeAppData(data);
    const storedRaw = storage.getItem(STORAGE_KEY);
    if (expectedRaw !== undefined && storedRaw !== expectedRaw) {
      return {
        status: "conflict",
        error: "Otra pestaña modifico los datos locales antes de este guardado.",
        attemptedRaw: serialized,
        storedRaw: storedRaw ?? "",
      };
    }
    storage.setItem(STORAGE_KEY, serialized);
    return { status: "ok", bytes: new Blob([serialized]).size, raw: serialized };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo escribir el almacenamiento local.";
    return { status: "failed", error: message, attemptedRaw: serialized };
  }
}

export function importLocalAppData(raw: string): StorageLoadResult {
  const decoded = decodeSnapshot(raw);
  if (!decoded.ok) return { status: "corrupt", raw, error: decoded.error };
  return { status: "ready", ...decoded.value, raw };
}

export function clearLocalAppData(storage: KeyValueStorage = localStorage) {
  storage.removeItem(STORAGE_KEY);
}

export function createLocalAppDataRepository(storage: KeyValueStorage): AppDataRepository {
  return {
    load: async () => loadLocalAppData(storage),
    save: async (data, expectedRaw) => saveLocalAppData(data, storage, expectedRaw),
    clear: async () => clearLocalAppData(storage),
  };
}

const browserStorage: KeyValueStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

export const localAppDataRepository = createLocalAppDataRepository(browserStorage);

export const localAppDataBackupCodec: AppDataBackupCodec = {
  serialize: serializeAppData,
  deserialize: importLocalAppData,
};
