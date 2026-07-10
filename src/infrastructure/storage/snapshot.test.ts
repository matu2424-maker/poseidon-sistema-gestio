import { describe, expect, it } from "vitest";
import type { AppData } from "../../types";
import { createSnapshot, CURRENT_SCHEMA_VERSION, decodeSnapshot } from "./snapshot";

const minimumData = {
  users: [],
  locals: [],
  machines: [],
} as unknown as AppData;

describe("snapshot local versionado", () => {
  it("lee snapshots actuales", () => {
    const result = decodeSnapshot(JSON.stringify(createSnapshot(minimumData, "2026-07-10T12:00:00.000Z")));
    expect(result).toMatchObject({
      ok: true,
      value: { sourceVersion: CURRENT_SCHEMA_VERSION, needsRewrite: false },
    });
  });

  it("reconoce el formato historico sin envoltorio", () => {
    const result = decodeSnapshot(JSON.stringify(minimumData));
    expect(result).toMatchObject({ ok: true, value: { sourceVersion: 0, needsRewrite: true } });
  });

  it("rechaza JSON corrupto y versiones futuras", () => {
    expect(decodeSnapshot("{sin-json")).toMatchObject({ ok: false });
    expect(
      decodeSnapshot(
        JSON.stringify({ kind: "poseidon-app-data", schemaVersion: CURRENT_SCHEMA_VERSION + 1, savedAt: "", data: minimumData }),
      ),
    ).toMatchObject({ ok: false });
  });
});
