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
});
