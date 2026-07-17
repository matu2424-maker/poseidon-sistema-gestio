import type { AppData } from "../../types";

export type AppDataLoadResult =
  | { status: "empty" }
  | { status: "ready"; data: AppData; sourceVersion: number; needsRewrite: boolean; raw: string }
  | { status: "corrupt"; raw: string; error: string };

export type AppDataSaveResult =
  | { status: "ok"; bytes: number; raw: string }
  | { status: "conflict"; error: string; attemptedRaw: string; storedRaw: string }
  | { status: "failed"; error: string; attemptedRaw: string };

export interface AppDataRepository {
  load(): Promise<AppDataLoadResult>;
  save(data: AppData, expectedRaw?: string | null): Promise<AppDataSaveResult>;
  clear(): Promise<void>;
  subscribe?(listener: () => void): () => void;
}

export interface AppDataBackupCodec {
  serialize(data: AppData): string;
  deserialize(raw: string): AppDataLoadResult;
}
