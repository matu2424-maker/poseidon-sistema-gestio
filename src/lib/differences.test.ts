import { describe, expect, it } from "vitest";
import type { Balance } from "../types";
import { normalizeDifferenceStatus } from "./differences";

const balance = (patch: Partial<Balance> = {}): Balance => ({
  id: "balance-1",
  visibleId: "POSE-1",
  localId: "1",
  operatingDate: "2026-07-01",
  status: "CERRADO",
  initialFund: 0,
  initialNote: "",
  openedBy: "user-1",
  openedAt: "2026-07-01T10:00:00.000Z",
  ...patch,
});

describe("estados de diferencias", () => {
  it("mantiene los cuatro estados canonicos", () => {
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "PENDIENTE" }))).toBe("PENDIENTE");
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "VERIFICADA" }))).toBe("VERIFICADA");
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "CORREGIDA" }))).toBe("CORREGIDA");
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "ANULADA" }))).toBe("ANULADA");
  });

  it("migra estados heredados sin perder el sentido operativo", () => {
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "REVISADA" as never }))).toBe("VERIFICADA");
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "AJUSTADA" as never }))).toBe("CORREGIDA");
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "RESUELTA" as never, cashDifference: 100 }))).toBe("VERIFICADA");
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "RESUELTA" as never, differenceReviewedAt: "2026-07-02T10:00:00.000Z" }))).toBe("CORREGIDA");
  });

  it("no crea una gestion artificial para una caja historica sin diferencia", () => {
    expect(normalizeDifferenceStatus(balance({ differenceStatus: "RESUELTA" as never, cashDifference: 0, bankDifference: 0 }))).toBeUndefined();
  });
});
