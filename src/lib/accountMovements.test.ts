import { describe, expect, it } from "vitest";
import type { AccountMovement, Balance } from "../types";
import {
  accountLedgerRows,
  accountTotalsFromMovements,
  machineResultAccountMovement,
  reverseSourceAccountMovements,
  syncDifferenceAccountMovements,
} from "./accountMovements";

const movement = (patch: Partial<AccountMovement>): AccountMovement => ({
  id: "movement-1",
  accountId: "account-1",
  sourceType: "AJUSTE",
  sourceId: "source-1",
  direction: "ENTRADA",
  concept: "PRUEBA",
  amount: 0,
  detail: "",
  status: "ACTIVO",
  userId: "user-1",
  createdAt: "2026-07-01T10:00:00.000Z",
  ...patch,
});

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

describe("movimientos de cuentas", () => {
  it("calcula entradas, salidas y saldo ignorando anulados", () => {
    const totals = accountTotalsFromMovements([
      movement({ id: "in", amount: 1000, direction: "ENTRADA" }),
      movement({ id: "out", amount: 300, direction: "SALIDA" }),
      movement({ id: "annulled", amount: 900, direction: "SALIDA", status: "ANULADO" }),
    ]);
    expect(totals).toEqual({ income: 1000, outcome: 300, balance: 700, count: 2 });
  });

  it("calcula el saldo corrido en orden cronologico desde el saldo anterior", () => {
    const rows = accountLedgerRows(
      [
        movement({ id: "second", createdAt: "2026-07-02T10:00:00.000Z", amount: 300, direction: "SALIDA" }),
        movement({ id: "first", createdAt: "2026-07-01T10:00:00.000Z", amount: 1000, direction: "ENTRADA" }),
        movement({ id: "annulled", createdAt: "2026-07-03T10:00:00.000Z", amount: 500, direction: "SALIDA", status: "ANULADO" }),
      ],
      200,
    );
    expect(rows.map((row) => ({ id: row.movement.id, balance: row.balance }))).toEqual([
      { id: "first", balance: 1200 },
      { id: "second", balance: 900 },
      { id: "annulled", balance: 900 },
    ]);
  });

  it("sincroniza una diferencia positiva en efectivo y negativa en banco", () => {
    const synced = syncDifferenceAccountMovements(
      [],
      balance({ cashDifference: 500, bankDifference: -200, differenceStatus: "PENDIENTE" }),
      "user-1",
    );
    expect(synced).toHaveLength(2);
    expect(synced.find((item) => item.concept === "DIFERENCIA_EFECTIVO")).toMatchObject({ direction: "ENTRADA", amount: 500, status: "ACTIVO" });
    expect(synced.find((item) => item.concept === "DIFERENCIA_BANCO")).toMatchObject({ direction: "SALIDA", amount: 200, status: "ACTIVO" });
  });

  it("contrarresta diferencias sin borrar los movimientos originales", () => {
    const previous = syncDifferenceAccountMovements([], balance({ cashDifference: 500, bankDifference: -200 }), "user-1");
    const corrected = balance({
      cashDifference: 0,
      bankDifference: 0,
      differenceStatus: "CORREGIDA",
      differenceReviewedAt: "2026-07-02T10:00:00.000Z",
    });
    const synced = syncDifferenceAccountMovements(previous, corrected, "user-2");
    expect(synced).toHaveLength(4);
    expect(accountTotalsFromMovements(synced)).toMatchObject({ balance: 0 });
    expect(syncDifferenceAccountMovements(synced, corrected, "user-2")).toEqual(synced);
  });

  it("anula una fuente con contramovimiento idempotente", () => {
    const original = movement({ id: "expense", sourceType: "GASTO", sourceId: "expense-1", amount: 700, direction: "SALIDA" });
    const reversed = reverseSourceAccountMovements([original], ["GASTO"], "expense-1", "manager-1", "Anulacion", "2026-07-02T10:00:00.000Z");
    expect(reversed).toHaveLength(2);
    expect(accountTotalsFromMovements(reversed).balance).toBe(0);
    expect(reverseSourceAccountMovements(reversed, ["GASTO"], "expense-1", "manager-1", "Anulacion")).toEqual(reversed);
  });

  it("mantiene una fecha historica estable para el resultado de maquinas", () => {
    const closedBalance = balance({
      openedAt: "2026-06-30T20:00:00.000Z",
      closedAt: "2026-07-01T02:00:00.000Z",
    });
    expect(machineResultAccountMovement(closedBalance, 1200, "user-1")?.createdAt).toBe("2026-07-01T02:00:00.000Z");
    expect(machineResultAccountMovement(balance(), 1200, "user-1")?.createdAt).toBe("2026-07-01T10:00:00.000Z");
  });
});
