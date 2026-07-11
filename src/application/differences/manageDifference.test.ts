import { describe, expect, it } from "vitest";
import { createSeedData } from "../../data/appData";
import { accountTotalsFromMovements } from "../../lib/accountMovements";
import { commandContext } from "../command";
import { manageDifferenceCommand } from "./manageDifference";

describe("comando de diferencias", () => {
  it("corrige una diferencia con delta contable y auditoria", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ENCARGADO")!;
    const beforeCash = accountTotalsFromMovements(data.accountMovements.filter((item) => item.accountId === `account-local-${balance.localId}-efectivo`)).balance;
    const expectedCash = (balance.declaredCash ?? 0) - (balance.cashDifference ?? 0);
    const expectedBank = (balance.declaredBank ?? 0) - (balance.bankDifference ?? 0);
    const result = manageDifferenceCommand(
      data,
      { balanceId: balance.id, status: "CORREGIDA", reviewNote: "Declaracion corregida", correctedCash: expectedCash, correctedBank: expectedBank },
      commandContext(user, "ENCARGADO", { now: () => "2026-07-10T21:00:00.000Z" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ differenceStatus: "CORREGIDA", cashDifference: 0, bankDifference: 0 });
    const afterCash = accountTotalsFromMovements(result.data.accountMovements.filter((item) => item.accountId === `account-local-${balance.localId}-efectivo`)).balance;
    expect(afterCash).toBe(beforeCash - Number(balance.cashDifference ?? 0));
    expect(result.data.audit[0]).toMatchObject({ action: "Gestionar diferencia de caja", actorRole: "ENCARGADO" });
  });

  it("impide gestion desde rol cajero", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "CAJERO")!;
    expect(
      manageDifferenceCommand(data, { balanceId: balance.id, status: "VERIFICADA", reviewNote: "No corresponde" }, commandContext(user, "CAJERO")),
    ).toMatchObject({ ok: false });
  });
});
