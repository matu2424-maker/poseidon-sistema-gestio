import { describe, expect, it } from "vitest";
import type { AppData } from "../../types";
import { createSeedData } from "../../data/appData";
import { hydrateAppData } from "../../data/migrateData";
import { createSnapshot, CURRENT_SCHEMA_VERSION, decodeSnapshot, SNAPSHOT_KIND } from "./snapshot";

const minimumData = {
  users: [],
  locals: [],
  machines: [],
} as unknown as AppData;

describe("snapshot local versionado", () => {
  it("lee snapshots actuales", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
    const result = decodeSnapshot(JSON.stringify(createSnapshot(createSeedData(), "2026-07-10T12:00:00.000Z")));
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
    const seed = createSeedData();
    const previous = seed.accountMovements[0];
    const data = {
      ...seed,
      accountMovements: [
        {
          ...previous,
          id: "adjustment-2",
          previousAdjustmentId: previous.id,
        },
        ...seed.accountMovements,
      ],
    } as AppData;
    const result = decodeSnapshot(JSON.stringify(createSnapshot(data, "2026-07-10T12:00:00.000Z")));
    expect(result).toMatchObject({ ok: true, value: { sourceVersion: CURRENT_SCHEMA_VERSION, needsRewrite: false } });
    if (result.ok) {
      expect(result.value.data.accountMovements[0]).toMatchObject({
        id: "adjustment-2",
        previousAdjustmentId: previous.id,
      });
    }
  });

  it("rechaza un snapshot actual con colecciones faltantes y conserva la ruta del error", () => {
    const incomplete: Partial<AppData> = { ...createSeedData() };
    delete incomplete.users;
    const result = decodeSnapshot(
      JSON.stringify({
        kind: SNAPSHOT_KIND,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        savedAt: "2026-07-10T12:00:00.000Z",
        data: incomplete,
      }),
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("users");
  });

  it("rechaza un snapshot actual con fecha de guardado invalida", () => {
    expect(() => createSnapshot(createSeedData(), "sin-fecha")).toThrow("fecha de guardado invalida");
    const result = decodeSnapshot(
      JSON.stringify({
        kind: SNAPSHOT_KIND,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        savedAt: "sin-fecha",
        data: createSeedData(),
      }),
    );
    expect(result).toEqual({ ok: false, error: "El respaldo versionado no tiene una fecha de guardado valida." });
  });

  it("reconoce el formato historico sin envoltorio", () => {
    const result = decodeSnapshot(JSON.stringify(minimumData));
    expect(result).toMatchObject({ ok: true, value: { sourceVersion: 0, needsRewrite: true } });
  });

  it("migra y valida un respaldo historico completo", () => {
    const result = decodeSnapshot(JSON.stringify(createSeedData()));
    expect(result).toMatchObject({ ok: true, value: { sourceVersion: 0, needsRewrite: true } });
    if (result.ok) expect(() => hydrateAppData(result.value.data, result.value.sourceVersion)).not.toThrow();
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
