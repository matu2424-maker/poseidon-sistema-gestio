import { describe, expect, it } from "vitest";
import { createSeedData } from "../../data/appData";
import { accountTotalsFromMovements } from "../../lib/accountMovements";
import { bankDifferenceForBalance, cashDifferenceForBalance } from "../../lib/differences";
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

  it("verifica una diferencia sin alterar sus importes ni movimientos", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ENCARGADO")!;
    const result = manageDifferenceCommand(
      data,
      { balanceId: balance.id, status: "VERIFICADA", reviewNote: "Diferencia confirmada" },
      commandContext(user, "ENCARGADO", { now: () => "2026-07-10T21:10:00.000Z" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      differenceStatus: "VERIFICADA",
      cashDifference: balance.cashDifference,
      bankDifference: balance.bankDifference,
    });
    expect(result.data.accountMovements).toEqual(data.accountMovements);
  });

  it("anula una diferencia y revierte su impacto en efectivo y banco", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ENCARGADO")!;
    const cashAccountId = `account-local-${balance.localId}-efectivo`;
    const bankAccountId = `account-local-${balance.localId}-banco`;
    const cashDifference = cashDifferenceForBalance(data, balance);
    const bankDifference = bankDifferenceForBalance(balance);
    const cashBefore = accountTotalsFromMovements(data.accountMovements.filter((item) => item.accountId === cashAccountId)).balance;
    const bankBefore = accountTotalsFromMovements(data.accountMovements.filter((item) => item.accountId === bankAccountId)).balance;
    const result = manageDifferenceCommand(
      data,
      { balanceId: balance.id, status: "ANULADA", reviewNote: "Carga de cierre anulada" },
      commandContext(user, "ENCARGADO", { now: () => "2026-07-10T21:20:00.000Z" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ differenceStatus: "ANULADA", cashDifference: 0, bankDifference: 0 });
    const cashAfter = accountTotalsFromMovements(result.data.accountMovements.filter((item) => item.accountId === cashAccountId)).balance;
    const bankAfter = accountTotalsFromMovements(result.data.accountMovements.filter((item) => item.accountId === bankAccountId)).balance;
    expect(cashAfter).toBe(cashBefore - cashDifference);
    expect(bankAfter).toBe(bankBefore - bankDifference);
  });

  it("impide que un encargado gestione una diferencia de otro local", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const assignedManager = data.users.find((item) => item.role === "ENCARGADO")!;
    const manager = { ...assignedManager, localIds: ["otro-local"] };
    expect(
      manageDifferenceCommand(
        data,
        { balanceId: balance.id, status: "VERIFICADA", reviewNote: "No corresponde" },
        commandContext(manager, "ENCARGADO"),
      ),
    ).toMatchObject({ ok: false, error: "El encargado solo puede gestionar diferencias de sus locales asignados." });
  });

  it("rechaza correcciones sin ambos importes validos", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ADMINISTRADOR")!;
    expect(
      manageDifferenceCommand(
        data,
        { balanceId: balance.id, status: "CORREGIDA", reviewNote: "Correccion incompleta", correctedCash: Number.NaN },
        commandContext(user, "ADMINISTRADOR"),
      ),
    ).toMatchObject({ ok: false, error: "Completa importes validos de efectivo y banco para corregir la diferencia." });
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
