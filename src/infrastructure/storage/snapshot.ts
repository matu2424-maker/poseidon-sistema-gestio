import type { AppData } from "../../types";

export const SNAPSHOT_KIND = "poseidon-app-data";
export const CURRENT_SCHEMA_VERSION = 1;

export type AppDataSnapshot = {
  kind: typeof SNAPSHOT_KIND;
  schemaVersion: number;
  savedAt: string;
  data: AppData;
};

export type DecodedSnapshot = {
  data: AppData;
  sourceVersion: number;
  needsRewrite: boolean;
};

type DecodeResult =
  | { ok: true; value: DecodedSnapshot }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isAppDataCandidate(value: unknown): value is AppData {
  if (!isRecord(value)) return false;
  return Array.isArray(value.users) && Array.isArray(value.locals) && Array.isArray(value.machines);
}

export function createSnapshot(data: AppData, savedAt = new Date().toISOString()): AppDataSnapshot {
  return {
    kind: SNAPSHOT_KIND,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt,
    data,
  };
}

export function decodeSnapshot(raw: string): DecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "El contenido guardado no es JSON valido." };
  }

  if (isRecord(parsed) && parsed.kind === SNAPSHOT_KIND) {
    const version = Number(parsed.schemaVersion);
    if (!Number.isInteger(version) || version < 1) {
      return { ok: false, error: "El respaldo no tiene una version de esquema valida." };
    }
    if (version > CURRENT_SCHEMA_VERSION) {
      return { ok: false, error: `El respaldo usa una version futura (${version}) que esta aplicacion no puede leer.` };
    }
    if (!isAppDataCandidate(parsed.data)) {
      return { ok: false, error: "El respaldo versionado no contiene datos Poseidon validos." };
    }
    return {
      ok: true,
      value: {
        data: parsed.data,
        sourceVersion: version,
        needsRewrite: version !== CURRENT_SCHEMA_VERSION,
      },
    };
  }

  if (!isAppDataCandidate(parsed)) {
    return { ok: false, error: "El almacenamiento no contiene una estructura Poseidon reconocible." };
  }

  return {
    ok: true,
    value: {
      data: parsed,
      sourceVersion: 0,
      needsRewrite: true,
    },
  };
}
