import { describe, expect, it } from "vitest";
import type { AppData } from "../../types";
import { createSnapshot, CURRENT_SCHEMA_VERSION, decodeSnapshot, SNAPSHOT_KIND } from "./snapshot";

const minimumData = {
  users: [],
  locals: [],
  machines: [],
} as unknown as AppData;

describe("snapshot local versionado", () => {
  it("lee snapshots actuales", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
    const result = decodeSnapshot(JSON.stringify(createSnapshot(minimumData, "2026-07-10T12:00:00.000Z")));
    expect(result).toMatchObject({
      ok: true,
      value: { sourceVersion: CURRENT_SCHEMA_VERSION, needsRewrite: false },
    });
  });

  it.each([1, 2, 3, 4])("lee schema %s y exige reescritura al schema actual", (schemaVersion) => {
    const result = decodeSnapshot(
      JSON.stringify({ kind: SNAPSHOT_KIND, schemaVersion, savedAt: "2026-07-10T12:00:00.000Z", data: minimumData }),
    );
    expect(result).toMatchObject({ ok: true, value: { sourceVersion: schemaVersion, needsRewrite: true } });
  });

  it("conserva previousAdjustmentId en un roundtrip del schema actual", () => {
    const data = {
      ...minimumData,
      accountMovements: [
        {
          id: "adjustment-2",
          accountId: "account-local-1-efectivo",
          balanceId: "balance-1",
          sourceType: "DIFERENCIA_CAJA",
          sourceId: "balance-1-EFECTIVO",
          direction: "SALIDA",
          concept: "DIFERENCIA_EFECTIVO",
          amount: 100,
          detail: "Ajuste",
          status: "ACTIVO",
          userId: "manager-1",
          createdAt: "2026-07-10T12:00:00.000Z",
          previousAdjustmentId: "adjustment-1",
        },
      ],
    } as AppData;
    const result = decodeSnapshot(JSON.stringify(createSnapshot(data, "2026-07-10T12:00:00.000Z")));
    expect(result).toMatchObject({
      ok: true,
      value: {
        sourceVersion: CURRENT_SCHEMA_VERSION,
        needsRewrite: false,
        data: { accountMovements: [{ id: "adjustment-2", previousAdjustmentId: "adjustment-1" }] },
      },
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
