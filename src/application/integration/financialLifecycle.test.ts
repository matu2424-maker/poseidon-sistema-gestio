import { describe, expect, it } from "vitest";
import type { AppData } from "../../types";
import { createSeedData, POSEIDON_LOCAL_ID } from "../../data/appData";
import { hydrateAppData } from "../../data/migrateData";
import { localAccountBalances } from "../../lib/currentAccounts";
import { totalsForBalance } from "../../lib/cashTotals";
import { importLocalAppData, serializeAppData } from "../../infrastructure/storage/localAppDataRepository";
import { CURRENT_SCHEMA_VERSION } from "../../infrastructure/storage/snapshot";
import { commandContext } from "../command";
import { closeCashCommand } from "../cash/closeCash";
import { openCashCommand } from "../cash/openCash";
import { saveReadingCommand } from "../cash/saveReading";
import { manageDifferenceCommand } from "../differences/manageDifference";
import {
  createExpenseCommand,
  createGiftCommand,
  createTransferCommand,
} from "../movements/operatingMovementCommands";
import { saveSalarySettlementCommand } from "../salaries/salarySettlementCommands";

describe("ciclo financiero integrado", () => {
  it("mantiene resultado, cuentas, liquidacion y diferencias durante un ciclo completo", () => {
    const seed = createSeedData();
    const cashier = seed.users.find((item) => item.username === "cajero1")!;
    const manager = seed.users.find((item) => item.username === "encargado")!;
    let sequence = 0;
    let currentTime = "2026-07-11T10:00:00.000Z";
    const id = (prefix: string) => `${prefix}-integration-${++sequence}`;
    const cashierContext = commandContext(cashier, "CAJERO", { now: () => currentTime, id });
    const managerContext = commandContext(manager, "ENCARGADO", { now: () => currentTime, id });
    let data: AppData = {
      ...seed,
      balances: [],
      readings: [],
      expenses: [],
      transfers: [],
      gifts: [],
      capitalMovements: [],
      salarySettlements: [],
      salaryClosures: [],
      currentAccounts: [],
      accountMovements: [],
      audit: [],
      machineLocalHistory: [],
    };

    const opened = openCashCommand(
      data,
      {
        localId: POSEIDON_LOCAL_ID,
        operatingDate: "2026-07-11",
        initialFund: 10_000,
        initialBankFund: 5_000,
        initialNote: "Integracion",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      cashierContext,
    );
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    data = opened.data;

    for (const reading of data.readings.filter((item) => item.balanceId === opened.value.id)) {
      const saved = saveReadingCommand(
        data,
        opened.value.id,
        reading.id,
        {
          inActual: reading.inPrevious + 1_000,
          outActual: reading.outPrevious + 200,
          status: "CARGADA",
          observation: "Integracion",
        },
        cashierContext,
      );
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;
      data = saved.data;
    }

    const category = data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const expense = createExpenseCommand(
      data,
      {
        balanceId: opened.value.id,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 400,
        description: "Gasto integrado",
      },
      cashierContext,
    );
    expect(expense.ok).toBe(true);
    if (!expense.ok) return;
    data = expense.data;

    const transfer = createTransferCommand(
      data,
      {
        balanceId: opened.value.id,
        receipt: "TRX-INTEGRATION",
        name: "Deposito diario",
        amount: 1_000,
        account: "Cuenta unica inicial",
      },
      cashierContext,
    );
    expect(transfer.ok).toBe(true);
    if (!transfer.ok) return;
    data = transfer.data;

    const client = data.clients.find((item) => item.status === "ACTIVO")!;
    const gift = createGiftCommand(
      data,
      {
        balanceId: opened.value.id,
        clientIds: [client.id],
        amount: 200,
        reference: "Cajero",
        description: "Regalo integrado",
      },
      cashierContext,
    );
    expect(gift.ok).toBe(true);
    if (!gift.ok) return;
    data = gift.data;

    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const salary = saveSalarySettlementCommand(
      data,
      {
        staffId: staff.id,
        period: "2026-07",
        concept: "SALARIO",
        amount: 500,
        notes: "Pago integrado",
        origin: "CAJA",
        balanceId: opened.value.id,
      },
      cashierContext,
    );
    expect(salary.ok).toBe(true);
    if (!salary.ok) return;
    data = salary.data;

    const totalsBeforeClose = totalsForBalance(data, opened.value.id);
    expect(totalsBeforeClose).toMatchObject({
      resultMachines: 2_400,
      totalExpenses: 400,
      totalTransfers: 1_000,
      giftCash: 200,
      totalSalaries: 500,
      expectedCash: 10_300,
      commercialResult: 1_300,
    });
    expect(localAccountBalances(data, POSEIDON_LOCAL_ID)).toEqual({ cash: 10_300, bank: 6_000 });

    currentTime = "2026-07-11T22:00:00.000Z";
    const closed = closeCashCommand(
      data,
      {
        balanceId: opened.value.id,
        declaredCash: 10_000,
        declaredBank: 5_500,
        finalWithdrawalCash: 0,
        finalWithdrawalBank: 0,
        withdrawalCashPerson: "MATHIAS",
        withdrawalBankPerson: "MATHIAS",
        differenceNote: "Diferencia integrada",
      },
      cashierContext,
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.value).toMatchObject({ cashDifference: -300, bankDifference: -500, differenceStatus: "PENDIENTE" });
    expect(localAccountBalances(closed.data, POSEIDON_LOCAL_ID)).toEqual({ cash: 10_000, bank: 5_500 });

    currentTime = "2026-07-12T09:00:00.000Z";
    const corrected = manageDifferenceCommand(
      closed.data,
      {
        balanceId: opened.value.id,
        status: "CORREGIDA",
        reviewNote: "Se verificaron los comprobantes",
        correctedCash: 10_300,
        correctedBank: 6_000,
      },
      managerContext,
    );
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;
    expect(corrected.value).toMatchObject({ cashDifference: 0, bankDifference: 0, differenceStatus: "CORREGIDA" });
    expect(localAccountBalances(corrected.data, POSEIDON_LOCAL_ID)).toEqual({ cash: 10_300, bank: 6_000 });
    expect(totalsForBalance(corrected.data, opened.value.id).commercialResult).toBe(1_300);
    expect(corrected.data.salarySettlements[0]).toMatchObject({
      period: "2026-07",
      balanceId: opened.value.id,
      createdBy: cashier.id,
    });
    expect(corrected.data.audit.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "Abrir caja",
        "Crear gasto",
        "Crear transferencia",
        "Crear regalo",
        "Cargar pago salario cajero",
        "Cerrar caja",
        "Gestionar diferencia de caja",
      ]),
    );
  });

  it("migra un snapshot legado y reconstruye el traslado efectivo-banco sin duplicar asientos", () => {
    const seed = createSeedData();
    const transfer = seed.transfers[0];
    const cashMovementId = `account-movement-local-transfer-cash-${transfer.id}`;
    const legacyData = {
      ...seed,
      accountMovements: seed.accountMovements.filter((movement) => movement.id !== cashMovementId),
    };
    const legacyImport = importLocalAppData(JSON.stringify(legacyData));
    expect(legacyImport.status).toBe("ready");
    if (legacyImport.status !== "ready") return;
    expect(legacyImport.sourceVersion).toBe(0);
    expect(legacyImport.needsRewrite).toBe(true);

    const migrated = hydrateAppData(legacyImport.data, legacyImport.sourceVersion, {
      now: () => "2026-07-11T18:00:00.000Z",
    });
    expect(migrated.accountMovements.some((movement) => movement.id === cashMovementId)).toBe(true);
    const uniqueMovementIds = new Set(migrated.accountMovements.map((movement) => movement.id));
    expect(uniqueMovementIds.size).toBe(migrated.accountMovements.length);

    const versionedImport = importLocalAppData(serializeAppData(migrated));
    expect(versionedImport.status).toBe("ready");
    if (versionedImport.status !== "ready") return;
    expect(versionedImport.sourceVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(versionedImport.needsRewrite).toBe(false);
    const normalizedAgain = hydrateAppData(versionedImport.data, versionedImport.sourceVersion);
    expect(normalizedAgain.accountMovements.filter((movement) => movement.id === cashMovementId)).toHaveLength(1);
    expect(localAccountBalances(normalizedAgain, POSEIDON_LOCAL_ID)).toEqual(
      localAccountBalances(migrated, POSEIDON_LOCAL_ID),
    );
  });
});
