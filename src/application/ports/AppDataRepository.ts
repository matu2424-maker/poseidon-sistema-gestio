import type { AppData } from "../../types";

export type AppDataLoadResult =
  | { status: "empty" }
  | { status: "ready"; data: AppData; sourceVersion: number; needsRewrite: boolean; raw: string }
  | { status: "corrupt"; raw: string; error: string };

export type AppDataSaveResult =
  | { status: "ok"; bytes: number }
  | { status: "failed"; error: string };

export interface AppDataRepository {
  load(): Promise<AppDataLoadResult>;
  save(data: AppData): Promise<AppDataSaveResult>;
  clear(): Promise<void>;
}

export interface AppDataBackupCodec {
  serialize(data: AppData): string;
  deserialize(raw: string): AppDataLoadResult;
}
