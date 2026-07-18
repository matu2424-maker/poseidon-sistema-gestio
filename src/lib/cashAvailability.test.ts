import { describe, expect, it } from "vitest";
import type { AccountMovement } from "../types";
import { clearOperationalData, createSeedData } from "../data/appData";
import { localCashAccountId } from "./currentAccounts";
import { activeLocalCashSourceOutflow, localCashAvailable, localCashOutflowError } from "./cashAvailability";

const cashMovement = (
  id: string,
  direction: AccountMovement["direction"],
  amount: number,
  sourceId = id,
): AccountMovement => ({
  id,
  accountId: localCashAccountId("1"),
  sourceType: direction === "ENTRADA" ? "APORTE" : "RESULTADO_MAQUINAS",
  sourceId,
  direction,
  concept: "PRUEBA",
  amount,
  currency: "UYU",
  detail: "Prueba de disponibilidad",
  status: "ACTIVO",
  userId: "user-test",
  createdAt: "2026-07-16T12:00:00.000Z",
});

describe("disponibilidad de efectivo local", () => {
  it("usa el saldo activo Caja / Efectivo y acepta una salida igual al disponible", () => {
    const data = {
      ...clearOperationalData(createSeedData()),
      accountMovements: [cashMovement("aporte", "ENTRADA", 1_000)],
    };

    expect(localCashAvailable(data, "1")).toBe(1_000);
    expect(localCashOutflowError(data, "1", 1_000)).toBe("");
    expect(localCashOutflowError(data, "1", 1_001)).toContain("No hay fondos suficientes en Caja / Efectivo");

    const negative = {
      ...data,
      accountMovements: [cashMovement("resultado", "SALIDA", 1_500), ...data.accountMovements],
    };
    expect(localCashAvailable(negative, "1")).toBe(-500);
    expect(localCashOutflowError(negative, "1", 1)).toContain("saldo Caja / Efectivo es negativo");

    const salarySource = {
      ...data,
      accountMovements: [cashMovement("salary", "SALIDA", 700, "settlement-1"), ...data.accountMovements],
    };
    expect(activeLocalCashSourceOutflow(salarySource, "1", "settlement-1")).toBe(700);
    const reversedSalarySource = {
      ...salarySource,
      accountMovements: [
        cashMovement("salary-reversal", "ENTRADA", 700, "settlement-1"),
        ...salarySource.accountMovements,
      ],
    };
    expect(activeLocalCashSourceOutflow(reversedSalarySource, "1", "settlement-1")).toBe(0);
  });
});
