import { describe, expect, it } from "vitest";
import { reverseSourceAccountMovements } from "../lib/accountMovements";
import { createSeedData, normalizeData } from "./appData";

describe("normalizacion de datos locales", () => {
  it("conserva movimientos persistidos y contramovimientos sin reescribirlos", () => {
    const seed = createSeedData();
    const expense = seed.expenses[0];
    const original = seed.accountMovements.find((movement) => movement.sourceType === "GASTO" && movement.sourceId === expense.id);
    expect(original).toBeDefined();
    const reversed = reverseSourceAccountMovements(
      seed.accountMovements,
      ["GASTO"],
      expense.id,
      "manager-1",
      "Prueba de anulacion",
      "2026-07-10T12:00:00.000Z",
    );
    const normalized = normalizeData({
      ...seed,
      expenses: seed.expenses.map((item) => (item.id === expense.id ? { ...item, status: "ANULADO" as const } : item)),
      accountMovements: reversed,
    });
    expect(normalized.accountMovements.find((movement) => movement.id === original?.id)).toEqual(original);
    expect(normalized.accountMovements.find((movement) => movement.reversalOf === original?.id)?.createdAt).toBe("2026-07-10T12:00:00.000Z");
  });

  it("preserva la cadena de ajustes de diferencias al normalizar", () => {
    const seed = createSeedData();
    const original = seed.accountMovements.find((movement) => movement.sourceId.endsWith("-EFECTIVO") && movement.sourceType === "DIFERENCIA_CAJA")!;
    const adjustment = {
      ...original,
      id: "difference-adjustment-normalized",
      direction: original.direction === "ENTRADA" ? ("SALIDA" as const) : ("ENTRADA" as const),
      amount: 125,
      detail: "Ajuste persistido",
      createdAt: "2026-07-10T12:00:00.000Z",
      previousAdjustmentId: original.id,
    };
    const normalized = normalizeData({ ...seed, accountMovements: [adjustment, ...seed.accountMovements] });

    expect(normalized.accountMovements.find((movement) => movement.id === adjustment.id)).toEqual(adjustment);
  });

  it("migra el ID historico de Poseidon en todas las referencias principales", () => {
    const seed = createSeedData();
    const legacyId = "local-poseidon";
    const normalized = normalizeData({
      ...seed,
      locals: seed.locals.map((local) => ({ ...local, id: legacyId })),
      machines: seed.machines.map((machine) => ({ ...machine, localId: legacyId })),
      balances: seed.balances.map((balance) => ({ ...balance, localId: legacyId })),
      users: seed.users.map((user) => ({ ...user, localIds: [legacyId] })),
      staff: seed.staff.map((staff) => ({ ...staff, localId: legacyId })),
      clients: seed.clients.map((client) => ({ ...client, localId: legacyId })),
    });

    expect(normalized.locals[0].id).toBe("1");
    expect(normalized.machines.every((machine) => machine.localId === "1")).toBe(true);
    expect(normalized.balances.every((balance) => balance.localId === "1")).toBe(true);
    expect(normalized.users.every((user) => user.localIds.includes("1"))).toBe(true);
    expect(normalized.staff.every((staff) => staff.localId === "1")).toBe(true);
    expect(normalized.clients.every((client) => client.localId === "1")).toBe(true);
  });

  it("elimina datos pesados de imagen y reconstruye solo asientos derivados faltantes", () => {
    const seed = createSeedData();
    const normalized = normalizeData({
      ...seed,
      locals: seed.locals.map((local) => ({
        ...local,
        images: [{ id: "image-1", name: "local.jpg", dataUrl: "data:image/jpeg;base64,AAA", createdAt: "2026-07-10T10:00:00.000Z" }],
      })),
      accountMovements: [],
    });

    expect(normalized.locals[0].images[0]).toMatchObject({ name: "local.jpg", dataUrl: "" });
    expect(normalized.accountMovements.length).toBeGreaterThan(0);
    expect(new Set(normalized.accountMovements.map((movement) => movement.id)).size).toBe(normalized.accountMovements.length);
  });
});
