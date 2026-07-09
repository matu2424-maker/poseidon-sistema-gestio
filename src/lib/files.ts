import type { StoredFileMeta } from "../types";
import { nowIso } from "./dates";

export const fileMetaLabel = (file: StoredFileMeta | undefined) => file?.name || "-";

export function readUploadFile(file: File): StoredFileMeta {
  return { name: file.name, type: file.type, size: file.size, uploadedAt: nowIso() };
}

export function normalizeStoredFileMeta(file: StoredFileMeta | undefined): StoredFileMeta | undefined {
  if (!file?.name) return undefined;
  return {
    name: file.name,
    type: file.type ?? "",
    size: Number(file.size ?? 0),
    uploadedAt: file.uploadedAt ?? nowIso(),
  };
}
