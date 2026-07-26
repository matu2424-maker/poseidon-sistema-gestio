import { describe, expect, it } from "vitest";
import { clearOperationalData, createSeedData } from "../../data/appData";
import { accountTotalsFromMovements } from "../../lib/accountMovements";
import { localAccountBalances, principalAccountBalances, staffAccountId } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { openCashCommand } from "../cash/openCash";
import { totalsForBalance } from "../../lib/cashTotals";
import { createPartnerMovementCommand } from "../treasury/treasuryCommands";
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
  const manager = opened.data.users.find((item) => item.role === "ENCARGADO")!;
  const funded = createPartnerMovementCommand(
    opened.data,
    {
      localId: "1",
      partner: "RICARDO",
      type: "APORTE_SOCIO",
      medium: "EFECTIVO",
      amount: initialFund,
      note: "Fondo Principal para salarios",
    },
    commandContext(manager, "ENCARGADO", {
      now: () => "2026-08-05T14:30:00.000Z",
      id: (prefix) => `${prefix}-principal-funding`,
    }),
  );
  if (!funded.ok) throw new Error(funded.error);
  return funded.data;
};

describe("comandos salariales", () => {
  it("rechaza suplantacion, usuario inactivo y local no asignado antes de liquidar", () => {
    const data = clearOperationalData(createSeedData());
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const cashier = data.users.find((item) => item.role === "CAJERO")!;
    const manager = data.users.find((item) => item.role === "ENCARGADO")!;
    const input = {
      staffId: staff.id,
      period: "2026-08",
      concept: "ADELANTO" as const,
      amount: 100,
      notes: "Debe rechazarse antes de mutar",
      origin: "LIQUIDACION" as const,
    };
    const before = JSON.stringify(data);

    expect(saveSalarySettlementCommand(data, input, commandContext(cashier, "ENCARGADO"))).toEqual({
      ok: false,
      error: "La funcion activa no corresponde al usuario autenticado.",
    });
    expect(
      saveSalarySettlementCommand(
        data,
        input,
        commandContext({ ...manager, status: "INACTIVO" }, "ENCARGADO"),
      ),
    ).toEqual({ ok: false, error: "El usuario no esta activo." });
    expect(
      saveSalarySettlementCommand(
        data,
        input,
        commandContext({ ...manager, localIds: [] }, "ENCARGADO"),
      ),
    ).toEqual({ ok: false, error: "El usuario no esta asignado al local seleccionado." });
    expect(JSON.stringify(data)).toBe(before);
  });

  it("rechaza cajas de otro local y la reasignacion de una liquidacion existente", () => {
    const funded = dataWithCash(2_000);
    const originalStaff = funded.staff.find((item) => item.status === "ACTIVO")!;
    const secondLocal = { ...funded.locals[0], id: "2", visibleId: "2", name: "Local dos" };
    const secondStaff = {
      ...originalStaff,
      id: "staff-local-2",
      visibleId: "PER-LOCAL-2",
      localId: secondLocal.id,
      firstName: "Persona",
      lastName: "Local dos",
    };
    const data = { ...funded, locals: [...funded.locals, secondLocal], staff: [...funded.staff, secondStaff] };
    const admin = data.users.find((item) => item.role === "ADMINISTRADOR")!;
    const openBalance = data.balances.find((item) => item.status === "EN_PROCESO")!;

    expect(
      saveSalarySettlementCommand(
        data,
        {
          staffId: secondStaff.id,
          period: "2026-08",
          concept: "SALARIO",
          amount: 500,
          notes: "Caja ajena",
          origin: "CAJA",
          balanceId: openBalance.id,
        },
        commandContext(admin, "CAJERO"),
      ),
    ).toEqual({ ok: false, error: "La caja seleccionada no pertenece al local del empleado." });

    const created = saveSalarySettlementCommand(
      data,
      {
        staffId: originalStaff.id,
        period: "2026-08",
        concept: "ADELANTO",
        amount: 500,
        notes: "Liquidacion original",
        origin: "LIQUIDACION",
      },
      commandContext(admin, "ADMINISTRADOR"),
    );
    if (!created.ok) throw new Error(created.error);
    expect(
      saveSalarySettlementCommand(
        created.data,
        {
          settlementId: created.value.id,
          staffId: secondStaff.id,
          period: "2026-08",
          concept: "ADELANTO",
          amount: 500,
          notes: "Intento de reasignacion",
          origin: "LIQUIDACION",
        },
        commandContext(admin, "ADMINISTRADOR"),
      ),
    ).toEqual({ ok: false, error: "Una liquidacion existente no puede reasignarse a otro empleado o local." });

    expect(
      saveSalarySettlementCommand(
        created.data,
        {
          settlementId: created.value.id,
          staffId: originalStaff.id,
          period: "2026-08",
          concept: "ADELANTO",
          amount: 500,
          notes: "Intento de cambio de origen",
          origin: "CAJA",
          balanceId: openBalance.id,
        },
        commandContext(admin, "CAJERO"),
      ),
    ).toEqual({ ok: false, error: "Una liquidacion existente no puede cambiar de origen ni de recaudacion." });
  });

  it("impide anular administrativamente un pago de Caja despues del cierre", () => {
    const data = dataWithCash(2_000);
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const balance = data.balances.find((item) => item.status === "EN_PROCESO")!;
    const cashier = data.users.find((item) => item.role === "CAJERO")!;
    const created = saveSalarySettlementCommand(
      data,
      {
        staffId: staff.id,
        period: "2026-08",
        concept: "ADELANTO",
        amount: 500,
        notes: "Pago desde Caja",
        origin: "CAJA",
        balanceId: balance.id,
      },
      commandContext(cashier, "CAJERO"),
    );
    if (!created.ok) throw new Error(created.error);
    const closed = {
      ...created.data,
      balances: created.data.balances.map((item) =>
        item.id === balance.id ? { ...item, status: "CERRADO" as const } : item,
      ),
    };
    const manager = closed.users.find((item) => item.role === "ENCARGADO")!;
    const before = JSON.stringify(closed);
    expect(
      annulSalarySettlementCommand(
        closed,
        created.value.id,
        commandContext(manager, "ENCARGADO"),
        { reason: "Intento posterior al cierre" },
      ),
    ).toEqual({ ok: false, error: "Solo se pueden eliminar salarios antes de cerrar la caja." });
    expect(JSON.stringify(closed)).toBe(before);
  });

  it("crea, corrige y anula sin perder asientos anteriores", () => {
    const data = dataWithCash(1_500);
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const context = contextFor(data);
    const created = saveSalarySettlementCommand(
      data,
      { staffId: staff.id, period: "2026-08", concept: "ADELANTO", amount: 1000, notes: "Primer adelanto", origin: "LIQUIDACION" },
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
    expect(localAccountBalances(corrected.data, staff.localId).cash).toBe(1_500);
    expect(principalAccountBalances(corrected.data).cash).toBe(0);

    const beforeRejectedCorrection = JSON.stringify(corrected.data);
    const rejectedCorrection = saveSalarySettlementCommand(
      corrected.data,
      { settlementId: corrected.value.id, staffId: staff.id, period: "2026-08", concept: "ADELANTO", amount: 1600, notes: "Sin efectivo para incremento", origin: "LIQUIDACION" },
      context,
    );
    expect(rejectedCorrection).toMatchObject({ ok: false });
    if (!rejectedCorrection.ok) expect(rejectedCorrection.error).toContain("No hay fondos suficientes en Principal / Efectivo");
    expect(JSON.stringify(corrected.data)).toBe(beforeRejectedCorrection);

    const annulled = annulSalarySettlementCommand(corrected.data, corrected.value.id, context);
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(accountTotalsFromMovements(annulled.data.accountMovements.filter((item) => item.accountId === staffAccountId(staff.id))).balance).toBe(0);
    expect(annulled.data.staff.find((item) => item.id === staff.id)?.salaryAdvanceBalance).toBe(0);
    expect(localAccountBalances(annulled.data, staff.localId).cash).toBe(1_500);
    expect(principalAccountBalances(annulled.data).cash).toBe(1_500);
  });

  it("acepta un pago salarial igual al efectivo disponible y rechaza una nueva salida", () => {
    const data = dataWithCash(1_000);
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const context = contextFor(data);
    const exact = saveSalarySettlementCommand(
      data,
      { staffId: staff.id, period: "2026-08", concept: "SALARIO", amount: 1000, notes: "Pago total disponible", origin: "LIQUIDACION" },
      context,
    );
    expect(exact.ok).toBe(true);
    if (!exact.ok) return;
    expect(localAccountBalances(exact.data, staff.localId).cash).toBe(1_000);
    expect(principalAccountBalances(exact.data).cash).toBe(0);

    const before = JSON.stringify(exact.data);
    const rejected = saveSalarySettlementCommand(
      exact.data,
      { staffId: staff.id, period: "2026-08", concept: "EXTRA", amount: 1, notes: "Sin fondos", origin: "LIQUIDACION" },
      context,
    );
    expect(rejected).toMatchObject({ ok: false });
    if (!rejected.ok) expect(rejected.error).toContain("No hay fondos suficientes en Principal / Efectivo");
    expect(JSON.stringify(exact.data)).toBe(before);
  });

  it("permite un pago administrativo desde Principal aunque exista una caja abierta", () => {
    const data = dataWithCash(1_000);
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const balance = data.balances.find((item) => item.status === "EN_PROCESO")!;
    const result = saveSalarySettlementCommand(
      data,
      {
        staffId: staff.id,
        period: "2026-08",
        concept: "ADELANTO",
        amount: 100,
        notes: "Pago desde Principal",
        origin: "LIQUIDACION",
      },
      contextFor(data),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.balanceId).toBeUndefined();
    expect(localAccountBalances(result.data, staff.localId).cash).toBe(1_000);
    expect(principalAccountBalances(result.data).cash).toBe(900);
    expect(totalsForBalance(result.data, balance.id).expectedCash).toBe(1_000);
  });

  it("rechaza asociar una liquidacion de Principal a la caja abierta", () => {
    const data = dataWithCash(1_000);
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const balance = data.balances.find((item) => item.status === "EN_PROCESO")!;
    const before = JSON.stringify(data);
    const result = saveSalarySettlementCommand(
      data,
      {
        staffId: staff.id,
        period: "2026-08",
        concept: "ADELANTO",
        amount: 100,
        notes: "Asociacion invalida",
        origin: "LIQUIDACION",
        balanceId: balance.id,
      },
      contextFor(data),
    );
    expect(result).toEqual({
      ok: false,
      error: "Las liquidaciones desde Principal no se asocian a una caja operativa.",
    });
    expect(JSON.stringify(data)).toBe(before);
  });

  it("corrige un pago administrativo validando solo el incremento neto en Principal", () => {
    const data = dataWithCash(2_000);
    const balance = data.balances.find((item) => item.status === "EN_PROCESO")!;
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const managerContext = contextFor(data);
    const original = saveSalarySettlementCommand(
      data,
      {
        staffId: staff.id,
        period: "2026-07",
        concept: "ADELANTO",
        amount: 500,
        notes: "Pago original",
        origin: "LIQUIDACION",
      },
      managerContext,
    );
    if (!original.ok) throw new Error(original.error);
    const corrected = saveSalarySettlementCommand(
      original.data,
      {
        settlementId: original.value.id,
        staffId: staff.id,
        period: "2026-07",
        concept: "ADELANTO",
        amount: 700,
        notes: "Incremento de 200",
        origin: "LIQUIDACION",
      },
      managerContext,
    );
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;
    expect(principalAccountBalances(corrected.data).cash).toBe(1_300);
    expect(localAccountBalances(corrected.data, staff.localId).cash).toBe(2_000);
    expect(totalsForBalance(corrected.data, balance.id).expectedCash).toBe(2_000);
  });
});
