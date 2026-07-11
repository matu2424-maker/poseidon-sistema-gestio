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
    const beforeBank = accountTotalsFromMovements(data.accountMovements.filter((item) => item.accountId === `account-local-${balance.localId}-banco`)).balance;
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
    const afterBank = accountTotalsFromMovements(result.data.accountMovements.filter((item) => item.accountId === `account-local-${balance.localId}-banco`)).balance;
    expect(result.data.audit[0]).toMatchObject({ action: "Gestionar diferencia de caja", actorRole: "ENCARGADO", localId: balance.localId });
    const auditValue = JSON.parse(result.data.audit[0].newValue) as Record<string, unknown>;
    expect(auditValue).toMatchObject({
      localId: balance.localId,
      balanceId: balance.id,
      accountBalancesBefore: { cash: beforeCash, bank: beforeBank },
      accountBalancesAfter: { cash: afterCash, bank: afterBank },
    });
    const newAccountMovements = auditValue.newAccountMovements as Array<Record<string, unknown>>;
    expect(newAccountMovements).toHaveLength(2);
    newAccountMovements.forEach((movement) => {
      expect(movement).toEqual({
        id: expect.any(String),
        accountId: expect.any(String),
        sourceId: expect.any(String),
        direction: expect.stringMatching(/^(ENTRADA|SALIDA)$/),
        amount: expect.any(Number),
        status: "ACTIVO",
        detail: expect.any(String),
        previousAdjustmentId: expect.any(String),
      });
    });
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

  it("bloquea una caja abierta del mismo local pero no una de otro local", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ADMINISTRADOR")!;
    const openBalance = { ...balance, id: "balance-open", status: "EN_PROCESO" as const, differenceStatus: undefined };

    expect(
      manageDifferenceCommand(
        { ...data, balances: [openBalance, ...data.balances] },
        { balanceId: balance.id, status: "VERIFICADA", reviewNote: "Revision bloqueada" },
        commandContext(user, "ADMINISTRADOR"),
      ),
    ).toMatchObject({ ok: false, error: "No se pueden gestionar diferencias mientras exista una caja abierta en el mismo local." });

    const result = manageDifferenceCommand(
      { ...data, balances: [{ ...openBalance, localId: "otro-local" }, ...data.balances] },
      { balanceId: balance.id, status: "VERIFICADA", reviewNote: "Revision permitida" },
      commandContext(user, "ADMINISTRADOR"),
    );
    expect(result.ok).toBe(true);
  });

  it("solo modifica el balance historico objetivo y fecha sus ajustes al gestionarlo", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ADMINISTRADOR")!;
    const untouchedBalances = data.balances.filter((item) => item.id !== balance.id);
    const expectedCash = Number(balance.declaredCash) - Number(balance.cashDifference);
    const expectedBank = Number(balance.declaredBank) - Number(balance.bankDifference);
    const managedAt = "2026-07-10T22:00:00.000Z";
    let sequence = 0;
    const result = manageDifferenceCommand(
      data,
      {
        balanceId: balance.id,
        status: "CORREGIDA",
        reviewNote: "Correccion historica",
        correctedCash: expectedCash + 250,
        correctedBank: expectedBank,
      },
      commandContext(user, "ADMINISTRADOR", {
        now: () => managedAt,
        id: (prefix) => `${prefix}-${++sequence}`,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.balances.filter((item) => item.id !== balance.id)).toEqual(untouchedBalances);
    expect(result.value.initialFund).toBe(balance.initialFund);
    expect(result.value.initialBankFund).toBe(balance.initialBankFund);
    expect(
      result.data.accountMovements
        .filter((movement) => movement.sourceId.startsWith(`${balance.id}-`) && movement.previousAdjustmentId)
        .every((movement) => movement.createdAt === managedAt),
    ).toBe(true);
  });

  it("valida la matriz en el comando y mantiene ANULADA como terminal", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ADMINISTRADOR")!;
    const verified = manageDifferenceCommand(
      data,
      { balanceId: balance.id, status: "VERIFICADA", reviewNote: "Verificada" },
      commandContext(user, "ADMINISTRADOR"),
    );
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(
      manageDifferenceCommand(
        verified.data,
        { balanceId: balance.id, status: "VERIFICADA", reviewNote: "Repetida" },
        commandContext(user, "ADMINISTRADOR"),
      ),
    ).toMatchObject({ ok: false, error: "No se puede cambiar una diferencia de VERIFICADA a VERIFICADA." });

    const annulled = manageDifferenceCommand(
      verified.data,
      { balanceId: balance.id, status: "ANULADA", reviewNote: "Anulada" },
      commandContext(user, "ADMINISTRADOR"),
    );
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(
      manageDifferenceCommand(
        annulled.data,
        { balanceId: balance.id, status: "CORREGIDA", reviewNote: "No permitida", correctedCash: 0, correctedBank: 0 },
        commandContext(user, "ADMINISTRADOR"),
      ),
    ).toMatchObject({ ok: false, error: "No se puede cambiar una diferencia de ANULADA a CORREGIDA." });
  });

  it("encadena dos correcciones con el mismo timestamp usando IDs del contexto", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ADMINISTRADOR")!;
    const expectedCash = Number(balance.declaredCash) - Number(balance.cashDifference);
    const managedAt = "2026-07-10T23:00:00.000Z";
    let sequence = 0;
    const context = commandContext(user, "ADMINISTRADOR", {
      now: () => managedAt,
      id: (prefix) => `${prefix}-${++sequence}`,
    });
    const first = manageDifferenceCommand(
      data,
      {
        balanceId: balance.id,
        status: "CORREGIDA",
        reviewNote: "Primera correccion",
        correctedCash: expectedCash + 100,
        correctedBank: Number(balance.declaredBank),
      },
      context,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = manageDifferenceCommand(
      first.data,
      {
        balanceId: balance.id,
        status: "CORREGIDA",
        reviewNote: "Segunda correccion",
        correctedCash: expectedCash + 200,
        correctedBank: Number(balance.declaredBank),
      },
      context,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const related = second.data.accountMovements.filter((movement) => movement.sourceId === `${balance.id}-EFECTIVO`);
    const original = related.find((movement) => !movement.previousAdjustmentId)!;
    const firstAdjustment = related.find((movement) => movement.previousAdjustmentId === original.id)!;
    const secondAdjustment = related.find((movement) => movement.previousAdjustmentId === firstAdjustment.id)!;
    expect(related).toHaveLength(3);
    expect(new Set(related.map((movement) => movement.id)).size).toBe(3);
    expect(firstAdjustment.createdAt).toBe(managedAt);
    expect(secondAdjustment.createdAt).toBe(managedAt);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("rechaza correcciones no finitas: %s", (invalidAmount) => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ADMINISTRADOR")!;
    expect(
      manageDifferenceCommand(
        data,
        {
          balanceId: balance.id,
          status: "CORREGIDA",
          reviewNote: "Correccion invalida",
          correctedCash: invalidAmount,
          correctedBank: Number(balance.declaredBank),
        },
        commandContext(user, "ADMINISTRADOR"),
      ),
    ).toMatchObject({ ok: false, error: "Completa importes validos de efectivo y banco para corregir la diferencia." });
  });

  it("rechaza importes historicos no finitos antes de persistir", () => {
    const data = createSeedData();
    const balance = data.balances.find((item) => item.differenceStatus === "PENDIENTE")!;
    const user = data.users.find((item) => item.role === "ADMINISTRADOR")!;
    expect(
      manageDifferenceCommand(
        {
          ...data,
          balances: data.balances.map((item) => (item.id === balance.id ? { ...item, cashDifference: Number.POSITIVE_INFINITY } : item)),
        },
        { balanceId: balance.id, status: "VERIFICADA", reviewNote: "Dato invalido" },
        commandContext(user, "ADMINISTRADOR"),
      ),
    ).toMatchObject({ ok: false, error: "Los importes de la diferencia deben ser numeros finitos." });
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
