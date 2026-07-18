import { describe, expect, it } from "vitest";
import type { CapitalMovement } from "../../types";
import { createSeedData, POSEIDON_LOCAL_ID } from "../../data/appData";
import { capitalAccountMovement, upsertAccountMovement } from "../../lib/accountMovements";
import { totalsForBalance } from "../../lib/cashTotals";
import { accountTotals, localAccountBalances, TRANSFER_ACCOUNT_ID } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { openCashCommand } from "../cash/openCash";
import { saveReadingCommand } from "../cash/saveReading";
import {
  createPartnerMovementCommand,
  createTreasuryTransferCommand,
} from "../treasury/treasuryCommands";
import {
  annulCapitalMovementCommand,
  annulTransferCommand,
  createCapitalMovementCommand,
  createExpenseCommand,
  createGiftCommand,
  createTransferCommand,
  annulExpenseCommand,
  annulGiftCommand,
} from "./operatingMovementCommands";

function setupOpenCash() {
  const seed = createSeedData();
  const user = seed.users.find((item) => item.username === "cajero1")!;
  let sequence = 0;
  const context = commandContext(user, "CAJERO", {
    now: () => "2026-07-11T12:00:00.000Z",
    id: (prefix) => `${prefix}-test-${++sequence}`,
  });
  const clean = {
    ...seed,
    balances: [],
    readings: [],
    expenses: [],
    transfers: [],
    gifts: [],
    capitalMovements: [],
    accountMovements: [],
    audit: [],
  };
  const opened = openCashCommand(
    clean,
    {
      localId: POSEIDON_LOCAL_ID,
      operatingDate: "2026-07-11",
      initialFund: 10_000,
      initialBankFund: 5_000,
      initialNote: "Prueba",
      openingCapitalPerson: "MATHIAS",
      firstOpening: true,
    },
    context,
  );
  if (!opened.ok) throw new Error(opened.error);
  return { data: opened.data, balance: opened.value, context };
}

function managerContext(data: ReturnType<typeof createSeedData>, localIds = [POSEIDON_LOCAL_ID]) {
  const manager = data.users.find((item) => item.username === "encargado")!;
  let sequence = 0;
  return commandContext({ ...manager, localIds }, "ENCARGADO", {
    now: () => "2026-07-11T13:00:00.000Z",
    id: (prefix) => `${prefix}-manager-${++sequence}`,
  });
}

describe("comandos de movimientos operativos", () => {
  it("impide que el encargado use el comando operativo reservado al cajero", () => {
    const setup = setupOpenCash();
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const result = createExpenseCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 10_000,
        description: "Pago realizado por encargado",
      },
      managerContext(setup.data),
    );

    expect(result).toEqual({ ok: false, error: "Para operar movimientos hay que trabajar con la funcion Cajero." });
    expect(localAccountBalances(setup.data, POSEIDON_LOCAL_ID).cash).toBe(10_000);
  });

  it("impide que el encargado use aportes y retiros legacy de una caja", () => {
    const setup = setupOpenCash();
    const context = managerContext(setup.data);
    const contribution = createCapitalMovementCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        type: "APORTE",
        medium: "EFECTIVO",
        person: "RICARDO",
        amount: 2_000,
        note: "Refuerzo del encargado",
      },
      context,
    );
    expect(contribution).toEqual({
      ok: false,
      error: "El alta legacy de aportes y retiros esta deshabilitada. Usa Caja / Principal o un movimiento real de socio.",
    });
    if (!contribution.ok) return;

    const withdrawal = createCapitalMovementCommand(
      contribution.data,
      {
        balanceId: setup.balance.id,
        type: "RETIRO",
        medium: "EFECTIVO",
        person: "MATHIAS",
        amount: 12_000,
        note: "Retiro total disponible",
      },
      context,
    );
    expect(withdrawal.ok).toBe(true);
    if (!withdrawal.ok) return;
    expect(localAccountBalances(withdrawal.data, POSEIDON_LOCAL_ID).cash).toBe(0);
    expect(totalsForBalance(withdrawal.data, setup.balance.id).expectedCash).toBe(0);

    const before = JSON.stringify(withdrawal.data);
    const rejected = createCapitalMovementCommand(
      withdrawal.data,
      {
        balanceId: setup.balance.id,
        type: "RETIRO",
        medium: "EFECTIVO",
        person: "MATHIAS",
        amount: 1,
        note: "Sin fondos",
      },
      context,
    );
    expect(rejected).toMatchObject({ ok: false });
    if (!rejected.ok) expect(rejected.error).toContain("No hay efectivo suficiente");
    expect(JSON.stringify(withdrawal.data)).toBe(before);
  });

  it("rechaza al encargado no asignado y no amplía transferencias ni regalos", () => {
    const setup = setupOpenCash();
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const unassigned = createExpenseCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 100,
        description: "Local ajeno",
      },
      managerContext(setup.data, []),
    );
    expect(unassigned).toEqual({ ok: false, error: "Para operar movimientos hay que trabajar con la funcion Cajero." });

    const context = managerContext(setup.data);
    const transfer = createTransferCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        receipt: "TRX-ENCARGADO",
        name: "No permitido",
        amount: 100,
        account: "Banco",
      },
      context,
    );
    const gift = createGiftCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        clientIds: [setup.data.clients.find((item) => item.status === "ACTIVO")!.id],
        amount: 100,
        reference: "Encargado",
        description: "",
      },
      context,
    );
    expect(transfer).toEqual({ ok: false, error: "Para operar movimientos hay que trabajar con la funcion Cajero." });
    expect(gift).toEqual({ ok: false, error: "Para operar movimientos hay que trabajar con la funcion Cajero." });
  });

  it("crea y anula gasto/regalo con reversos, historial y auditoria append-only", () => {
    const setup = setupOpenCash();
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const expenseResult = createExpenseCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 1_000,
        description: "Insumos",
      },
      setup.context,
    );
    expect(expenseResult.ok).toBe(true);
    if (!expenseResult.ok) return;

    const client = expenseResult.data.clients.find((item) => item.status === "ACTIVO")!;
    const giftResult = createGiftCommand(
      expenseResult.data,
      {
        balanceId: setup.balance.id,
        clientIds: [client.id],
        amount: 500,
        reference: "Cajero",
        description: "Atencion",
      },
      setup.context,
    );
    expect(giftResult.ok).toBe(true);
    if (!giftResult.ok) return;
    expect(localAccountBalances(giftResult.data, POSEIDON_LOCAL_ID).cash).toBe(8_500);

    const expenseAnnulled = annulExpenseCommand(
      giftResult.data,
      setup.balance.id,
      expenseResult.value.id,
      setup.context,
    );
    expect(expenseAnnulled.ok).toBe(true);
    if (!expenseAnnulled.ok) return;
    const giftAnnulled = annulGiftCommand(
      expenseAnnulled.data,
      setup.balance.id,
      giftResult.value.id,
      setup.context,
    );
    expect(giftAnnulled.ok).toBe(true);
    if (!giftAnnulled.ok) return;
    expect(localAccountBalances(giftAnnulled.data, POSEIDON_LOCAL_ID).cash).toBe(10_000);
    expect(giftAnnulled.data.expenses).toEqual([
      expect.objectContaining({ id: expenseResult.value.id, status: "ANULADO" }),
    ]);
    expect(giftAnnulled.data.gifts).toEqual([
      expect.objectContaining({ id: giftResult.value.id, status: "ANULADO" }),
    ]);
    expect(
      giftAnnulled.data.accountMovements.filter(
        (movement) => movement.reversalOf && [expenseResult.value.id, giftResult.value.id].includes(movement.sourceId),
      ),
    ).toHaveLength(2);
    expect(giftAnnulled.data.audit[0]).toMatchObject({
      action: "Anular regalo",
      reason: "Anulacion operativa antes del cierre",
      createdAt: "2026-07-11T12:00:00.000Z",
    });
    expect(
      annulGiftCommand(giftAnnulled.data, setup.balance.id, giftResult.value.id, setup.context),
    ).toEqual({ ok: false, error: "El regalo ya esta anulado." });
  });

  it("crea y anula transferencia con contramovimientos en ambas cuentas", () => {
    const setup = setupOpenCash();
    const transferResult = createTransferCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        receipt: "TRX-1",
        name: "Cobro banco",
        amount: 2_000,
        account: "Cuenta unica inicial",
      },
      setup.context,
    );
    expect(transferResult.ok).toBe(true);
    if (!transferResult.ok) return;
    expect(localAccountBalances(transferResult.data, POSEIDON_LOCAL_ID).cash).toBe(8_000);
    expect(localAccountBalances(transferResult.data, POSEIDON_LOCAL_ID).bank).toBe(7_000);
    expect(accountTotals(transferResult.data, TRANSFER_ACCOUNT_ID).balance).toBe(2_000);

    const annulled = annulTransferCommand(
      transferResult.data,
      setup.balance.id,
      transferResult.value.id,
      setup.context,
    );
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(localAccountBalances(annulled.data, POSEIDON_LOCAL_ID).cash).toBe(10_000);
    expect(localAccountBalances(annulled.data, POSEIDON_LOCAL_ID).bank).toBe(5_000);
    expect(accountTotals(annulled.data, TRANSFER_ACCOUNT_ID).balance).toBe(0);
    expect(annulled.data.accountMovements.filter((item) => item.reversalOf)).toHaveLength(3);
  });

  it("permite anular un movimiento legacy existente sin habilitar nuevas altas", () => {
    const setup = setupOpenCash();
    const legacyMovement: CapitalMovement = {
      id: "capital-legacy-existing",
      balanceId: setup.balance.id,
      localId: POSEIDON_LOCAL_ID,
      type: "APORTE",
      medium: "EFECTIVO",
      timing: "OPERATIVO",
      person: "RICARDO",
      amount: 1_000,
      note: "Movimiento historico",
      status: "ACTIVO",
      userId: "user-cajero1",
      createdAt: "2026-07-11T12:30:00.000Z",
    };
    const withLegacy = {
      ...setup.data,
      capitalMovements: [legacyMovement, ...setup.data.capitalMovements],
      accountMovements: upsertAccountMovement(
        setup.data.accountMovements,
        capitalAccountMovement(legacyMovement),
      ),
    };
    expect(localAccountBalances(withLegacy, POSEIDON_LOCAL_ID).cash).toBe(11_000);

    const annulled = annulCapitalMovementCommand(
      withLegacy,
      setup.balance.id,
      legacyMovement.id,
      setup.context,
    );
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(localAccountBalances(annulled.data, POSEIDON_LOCAL_ID).cash).toBe(10_000);
    expect(annulled.data.capitalMovements.find((item) => item.id === legacyMovement.id)?.status).toBe("ANULADO");
    expect(annulled.data.accountMovements.some((item) => item.reversalOf)).toBe(true);
  });

  it("rechaza operaciones sin funcion cajero o con caja cerrada", () => {
    const setup = setupOpenCash();
    const managerContext = { ...setup.context, actorRole: "ENCARGADO" as const };
    const denied = createTransferCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        receipt: "TRX-2",
        name: "No permitido",
        amount: 100,
        account: "Banco",
      },
      managerContext,
    );
    expect(denied).toEqual({ ok: false, error: "La funcion activa no corresponde al usuario autenticado." });

    const closedData = {
      ...setup.data,
      balances: setup.data.balances.map((item) =>
        item.id === setup.balance.id ? { ...item, status: "CERRADO" as const } : item,
      ),
    };
    const closed = createGiftCommand(
      closedData,
      {
        balanceId: setup.balance.id,
        clientIds: [setup.data.clients[0].id],
        amount: 100,
        reference: "Cajero",
        description: "",
      },
      setup.context,
    );
    expect(closed).toEqual({ ok: false, error: "La caja ya no esta abierta." });
  });

  it("acepta cada salida en efectivo cuando coincide exactamente con el disponible", () => {
    const expenseSetup = setupOpenCash();
    const category = expenseSetup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    expect(
      createExpenseCommand(
        expenseSetup.data,
        {
          balanceId: expenseSetup.balance.id,
          category: category.name,
          subcategory: category.subcategories[0],
          amount: 10_000,
          description: "Consume el disponible",
        },
        expenseSetup.context,
      ).ok,
    ).toBe(true);

    const transferSetup = setupOpenCash();
    expect(
      createTransferCommand(
        transferSetup.data,
        {
          balanceId: transferSetup.balance.id,
          receipt: "TRX-TOTAL",
          name: "Transferencia total",
          amount: 10_000,
          account: "Cuenta unica inicial",
        },
        transferSetup.context,
      ).ok,
    ).toBe(true);

    const giftSetup = setupOpenCash();
    expect(
      createGiftCommand(
        giftSetup.data,
        {
          balanceId: giftSetup.balance.id,
          clientIds: [giftSetup.data.clients.find((item) => item.status === "ACTIVO")!.id],
          amount: 10_000,
          reference: "Cajero",
          description: "",
        },
        giftSetup.context,
      ).ok,
    ).toBe(true);

  });

  it("rechaza salidas que exceden el disponible sin mutar el estado", () => {
    const setup = setupOpenCash();
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const client = setup.data.clients.find((item) => item.status === "ACTIVO")!;
    const before = JSON.stringify(setup.data);
    const commands = [
      createExpenseCommand(
        setup.data,
        {
          balanceId: setup.balance.id,
          category: category.name,
          subcategory: category.subcategories[0],
          amount: 10_001,
          description: "Sin fondos",
        },
        setup.context,
      ),
      createTransferCommand(
        setup.data,
        {
          balanceId: setup.balance.id,
          receipt: "TRX-SIN-FONDOS",
          name: "Sin fondos",
          amount: 10_001,
          account: "Cuenta unica inicial",
        },
        setup.context,
      ),
      createGiftCommand(
        setup.data,
        {
          balanceId: setup.balance.id,
          clientIds: [client.id],
          amount: 10_001,
          reference: "Cajero",
          description: "",
        },
        setup.context,
      ),
    ];

    commands.forEach((result) => {
      expect(result).toMatchObject({ ok: false });
      if (!result.ok) expect(result.error).toContain("No hay fondos suficientes en Caja / Efectivo");
    });
    expect(JSON.stringify(setup.data)).toBe(before);
  });

  it("permite la salida despues de un aporte real que cubre el faltante", () => {
    const setup = setupOpenCash();
    const manager = managerContext(setup.data);
    const partnerContribution = createPartnerMovementCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        type: "APORTE_SOCIO",
        medium: "EFECTIVO",
        partner: "RICARDO",
        amount: 2_000,
        note: "Fondos reales",
      },
      manager,
    );
    expect(partnerContribution.ok).toBe(true);
    if (!partnerContribution.ok) return;
    const contribution = createTreasuryTransferCommand(
      partnerContribution.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setup.balance.id,
        type: "APORTE_CAJA",
        medium: "EFECTIVO",
        amount: 2_000,
        note: "Principal a Caja",
      },
      manager,
    );
    expect(contribution.ok).toBe(true);
    if (!contribution.ok) return;
    const category = contribution.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const expense = createExpenseCommand(
      contribution.data,
      {
        balanceId: setup.balance.id,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 12_000,
        description: "Salida cubierta",
      },
      setup.context,
    );
    expect(expense.ok).toBe(true);
    if (!expense.ok) return;
    expect(localAccountBalances(expense.data, POSEIDON_LOCAL_ID).cash).toBe(0);
  });

  it("registra un resultado de maquinas negativo y bloquea nuevas salidas", () => {
    const setup = setupOpenCash();
    const reading = setup.data.readings.find((item) => item.balanceId === setup.balance.id)!;
    const saved = saveReadingCommand(
      setup.data,
      setup.balance.id,
      reading.id,
      {
        inActual: reading.inPrevious,
        outActual: reading.outPrevious + 11_000,
        status: "CARGADA",
      },
      setup.context,
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(localAccountBalances(saved.data, POSEIDON_LOCAL_ID).cash).toBe(-1_000);

    const category = saved.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const rejected = createExpenseCommand(
      saved.data,
      {
        balanceId: setup.balance.id,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 1,
        description: "Debe bloquearse",
      },
      setup.context,
    );
    expect(rejected).toMatchObject({ ok: false });
    if (!rejected.ok) expect(rejected.error).toContain("saldo Caja / Efectivo es negativo");
  });
});
