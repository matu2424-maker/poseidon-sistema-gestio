import { describe, expect, it } from "vitest";
import { clearOperationalData, createSeedData } from "../../data/appData";
import { accountTotalsFromMovements } from "../../lib/accountMovements";
import { localAccountBalances, staffAccountId } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { closeCashCommand } from "../cash/closeCash";
import { openCashCommand } from "../cash/openCash";
import { annulSalarySettlementCommand, saveSalarySettlementCommand } from "./salarySettlementCommands";

const contextFor = (data: ReturnType<typeof createSeedData>) => {
  const user = data.users.find((item) => item.role === "ENCARGADO")!;
  let id = 0;
  return commandContext(user, "ENCARGADO", {
    now: () => "2026-08-05T15:00:00.000Z",
    id: (prefix) => `${prefix}-test-${++id}`,
  });
};

const dataWithCash = (initialFund: number) => {
  const data = clearOperationalData(createSeedData());
  const user = data.users.find((item) => item.role === "CAJERO")!;
  const opened = openCashCommand(
    data,
    {
      localId: "1",
      operatingDate: "2026-08-05",
      initialFund,
      initialBankFund: 0,
      initialNote: "Fondo para salarios",
      openingCapitalPerson: "MATHIAS",
      firstOpening: true,
    },
    commandContext(user, "CAJERO", {
      now: () => "2026-08-05T14:00:00.000Z",
      id: (prefix) => `${prefix}-opening`,
    }),
  );
  if (!opened.ok) throw new Error(opened.error);
  return opened.data;
};

describe("comandos salariales", () => {
  it("crea, corrige y anula sin perder asientos anteriores", () => {
    const data = dataWithCash(1_500);
    const balanceId = data.balances.find((item) => item.status === "EN_PROCESO")!.id;
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const context = contextFor(data);
    const created = saveSalarySettlementCommand(
      data,
      { staffId: staff.id, period: "2026-08", concept: "ADELANTO", amount: 1000, notes: "Primer adelanto", origin: "LIQUIDACION", balanceId },
      context,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.staff.find((item) => item.id === staff.id)?.salaryAdvanceBalance).toBe(1000);

    const corrected = saveSalarySettlementCommand(
      created.data,
      { settlementId: created.value.id, staffId: staff.id, period: "2026-08", concept: "ADELANTO", amount: 1500, notes: "Monto corregido", origin: "LIQUIDACION" },
      context,
    );
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;
    expect(corrected.data.salarySettlements.find((item) => item.id === created.value.id)?.status).toBe("ANULADA");
    expect(corrected.data.accountMovements.some((item) => item.reversalOf === `account-movement-salary-${created.value.id}`)).toBe(true);
    const staffBalance = accountTotalsFromMovements(corrected.data.accountMovements.filter((item) => item.accountId === staffAccountId(staff.id))).balance;
    expect(staffBalance).toBe(-1500);
    expect(localAccountBalances(corrected.data, staff.localId).cash).toBe(0);

    const beforeRejectedCorrection = JSON.stringify(corrected.data);
    const rejectedCorrection = saveSalarySettlementCommand(
      corrected.data,
      { settlementId: corrected.value.id, staffId: staff.id, period: "2026-08", concept: "ADELANTO", amount: 1600, notes: "Sin efectivo para incremento", origin: "LIQUIDACION" },
      context,
    );
    expect(rejectedCorrection).toMatchObject({ ok: false });
    if (!rejectedCorrection.ok) expect(rejectedCorrection.error).toContain("No hay efectivo suficiente");
    expect(JSON.stringify(corrected.data)).toBe(beforeRejectedCorrection);

    const annulled = annulSalarySettlementCommand(corrected.data, corrected.value.id, context);
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(accountTotalsFromMovements(annulled.data.accountMovements.filter((item) => item.accountId === staffAccountId(staff.id))).balance).toBe(0);
    expect(annulled.data.staff.find((item) => item.id === staff.id)?.salaryAdvanceBalance).toBe(0);
    expect(localAccountBalances(annulled.data, staff.localId).cash).toBe(1_500);
  });

  it("acepta un pago salarial igual al efectivo disponible y rechaza una nueva salida", () => {
    const data = dataWithCash(1_000);
    const balanceId = data.balances.find((item) => item.status === "EN_PROCESO")!.id;
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const context = contextFor(data);
    const exact = saveSalarySettlementCommand(
      data,
      { staffId: staff.id, period: "2026-08", concept: "SALARIO", amount: 1000, notes: "Pago total disponible", origin: "LIQUIDACION", balanceId },
      context,
    );
    expect(exact.ok).toBe(true);
    if (!exact.ok) return;
    expect(localAccountBalances(exact.data, staff.localId).cash).toBe(0);

    const before = JSON.stringify(exact.data);
    const rejected = saveSalarySettlementCommand(
      exact.data,
      { staffId: staff.id, period: "2026-08", concept: "EXTRA", amount: 1, notes: "Sin fondos", origin: "LIQUIDACION", balanceId },
      context,
    );
    expect(rejected).toMatchObject({ ok: false });
    if (!rejected.ok) expect(rejected.error).toContain("No hay efectivo suficiente");
    expect(JSON.stringify(exact.data)).toBe(before);
  });

  it("bloquea un pago administrativo sin asociacion mientras existe una caja abierta", () => {
    const data = dataWithCash(1_000);
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const before = JSON.stringify(data);
    const rejected = saveSalarySettlementCommand(
      data,
      {
        staffId: staff.id,
        period: "2026-08",
        concept: "ADELANTO",
        amount: 100,
        notes: "No asociado a la caja vigente",
        origin: "LIQUIDACION",
      },
      contextFor(data),
    );
    expect(rejected).toMatchObject({ ok: false });
    if (!rejected.ok) expect(rejected.error).toContain("movimiento historico de efectivo");
    expect(JSON.stringify(data)).toBe(before);
  });

  it("bloquea corregir y trasladar a la caja actual un pago salarial historico", () => {
    const firstOpen = dataWithCash(2_000);
    const firstBalance = firstOpen.balances.find((item) => item.status === "EN_PROCESO")!;
    const staff = firstOpen.staff.find((item) => item.status === "ACTIVO")!;
    const managerContext = contextFor(firstOpen);
    const historical = saveSalarySettlementCommand(
      firstOpen,
      {
        staffId: staff.id,
        period: "2026-07",
        concept: "ADELANTO",
        amount: 500,
        notes: "Pago de la caja anterior",
        origin: "LIQUIDACION",
        balanceId: firstBalance.id,
      },
      managerContext,
    );
    if (!historical.ok) throw new Error(historical.error);
    const readyToClose = {
      ...historical.data,
      readings: historical.data.readings.map((reading) =>
        reading.balanceId === firstBalance.id
          ? { ...reading, status: "SIN_LECTURA" as const, observation: "Sin actividad" }
          : reading,
      ),
    };
    const closed = closeCashCommand(
      readyToClose,
      {
        balanceId: firstBalance.id,
        declaredCash: 1_500,
        declaredBank: 0,
        finalWithdrawalCash: 0,
        finalWithdrawalBank: 0,
        withdrawalCashPerson: "MATHIAS",
        withdrawalBankPerson: "MATHIAS",
        differenceNote: "",
      },
      managerContext,
    );
    if (!closed.ok) throw new Error(closed.error);
    const openedAgain = openCashCommand(
      closed.data,
      {
        localId: "1",
        operatingDate: "2026-08-06",
        initialFund: 1_500,
        initialBankFund: 0,
        initialNote: "Caja siguiente",
        openingCapitalPerson: "MATHIAS",
        firstOpening: false,
      },
      managerContext,
    );
    if (!openedAgain.ok) throw new Error(openedAgain.error);
    const currentBalance = openedAgain.data.balances.find((item) => item.status === "EN_PROCESO")!;
    const before = JSON.stringify(openedAgain.data);
    const rejected = saveSalarySettlementCommand(
      openedAgain.data,
      {
        settlementId: historical.value.id,
        staffId: staff.id,
        period: "2026-07",
        concept: "ADELANTO",
        amount: 700,
        notes: "No debe trasladarse a la caja actual",
        origin: "LIQUIDACION",
        balanceId: currentBalance.id,
      },
      managerContext,
    );
    expect(rejected).toMatchObject({ ok: false });
    if (!rejected.ok) expect(rejected.error).toContain("movimiento historico de efectivo");
    expect(JSON.stringify(openedAgain.data)).toBe(before);
  });
});
