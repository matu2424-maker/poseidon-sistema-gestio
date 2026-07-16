import { describe, expect, it } from "vitest";
import { commandContext } from "../application/command";
import { closeCashCommand } from "../application/cash/closeCash";
import { openCashCommand } from "../application/cash/openCash";
import { createTransferCommand } from "../application/movements/operatingMovementCommands";
import { localAccountBalances } from "../lib/currentAccounts";
import { totalsForBalance } from "../lib/cashTotals";
import { clearOperationalData, createSeedData } from "./appData";
import {
  CASH_TRANSFER_RECONCILIATION_MIGRATION_ID,
  hydrateAppData,
} from "./migrateData";

function context() {
  const user = createSeedData().users.find((item) => item.username === "cajero1")!;
  let sequence = 0;
  return commandContext(user, "CAJERO", {
    now: () => `2026-07-10T${String(10 + sequence).padStart(2, "0")}:00:00.000Z`,
    id: (prefix) => `${prefix}-migration-${++sequence}`,
  });
}

function legacySnapshotWithOpenBoundary() {
  const cashierContext = context();
  const clean = clearOperationalData(createSeedData());
  const first = openCashCommand(
    clean,
    {
      localId: "1",
      operatingDate: "2026-07-09",
      initialFund: 20_000,
      initialBankFund: 0,
      initialNote: "Primera caja",
      openingCapitalPerson: "MATHIAS",
      firstOpening: true,
    },
    cashierContext,
  );
  if (!first.ok) throw new Error(first.error);
  const transferred = [5_000, 7_000, 2_000].reduce((result, amount, index) => {
    const next = createTransferCommand(
      result.data,
      {
        balanceId: first.value.id,
        receipt: `TRX-LEGACY-${index + 1}`,
        name: `Transferencia historica ${index + 1}`,
        amount,
        account: "Banco",
      },
      cashierContext,
    );
    if (!next.ok) throw new Error(next.error);
    return { data: next.data, transfers: [...result.transfers, next.value] };
  }, { data: first.data, transfers: [] as Array<{ id: string }> });
  const readyToClose = {
    ...transferred.data,
    readings: transferred.data.readings.map((reading) =>
      reading.balanceId === first.value.id
        ? { ...reading, status: "SIN_LECTURA" as const, observation: "Sin actividad" }
        : reading,
    ),
  };
  const closed = closeCashCommand(
    readyToClose,
    {
      balanceId: first.value.id,
      declaredCash: 6_000,
      declaredBank: 14_000,
      finalWithdrawalCash: 0,
      finalWithdrawalBank: 0,
      withdrawalCashPerson: "MATHIAS",
      withdrawalBankPerson: "MATHIAS",
      differenceNote: "",
    },
    cashierContext,
  );
  if (!closed.ok) throw new Error(closed.error);

  const transferCashMovementIds = transferred.transfers.map(
    (transfer) => `account-movement-local-transfer-cash-${transfer.id}`,
  );
  const withoutLegacyCashOutflow = {
    ...closed.data,
    accountMovements: closed.data.accountMovements.filter(
      (movement) => !transferCashMovementIds.includes(movement.id),
    ),
  };
  expect(localAccountBalances(withoutLegacyCashOutflow, "1").cash).toBe(20_000);
  const second = openCashCommand(
    withoutLegacyCashOutflow,
    {
      localId: "1",
      operatingDate: "2026-07-10",
      initialFund: 20_000,
      initialBankFund: 14_000,
      initialNote: "Saldo heredado antes de migrar",
      openingCapitalPerson: "MATHIAS",
      firstOpening: false,
    },
    cashierContext,
  );
  if (!second.ok) throw new Error(second.error);
  return {
    data: second.data,
    balanceId: second.value.id,
    transferCashMovementIds,
    transferIds: transferred.transfers.map((transfer) => transfer.id),
  };
}

describe("migracion financiera versionada", () => {
  it("reconstruye transferencias y conserva la frontera de una caja abierta con un puente auditado", () => {
    const legacy = legacySnapshotWithOpenBoundary();
    const beforeEconomicResult = totalsForBalance(legacy.data, legacy.balanceId).commercialResult;
    const migrated = hydrateAppData(legacy.data, 3, {
      now: () => "2026-07-11T17:30:00.000Z",
    });

    expect(
      legacy.transferCashMovementIds.every((movementId) =>
        migrated.accountMovements.some((movement) => movement.id === movementId),
      ),
    ).toBe(true);
    const bridge = migrated.accountMovements.find((movement) => movement.sourceType === "MIGRACION");
    expect(bridge).toMatchObject({
      balanceId: legacy.balanceId,
      direction: "ENTRADA",
      amount: 14_000,
      concept: "RECONCILIACION_MIGRACION",
      userId: "system",
    });
    expect(bridge?.sourceId).toContain(CASH_TRANSFER_RECONCILIATION_MIGRATION_ID);
    expect(legacy.transferIds.every((transferId) => bridge?.detail.includes(transferId))).toBe(true);
    expect(localAccountBalances(migrated, "1").cash).toBe(20_000);
    expect(totalsForBalance(migrated, legacy.balanceId).expectedCash).toBe(20_000);
    expect(totalsForBalance(migrated, legacy.balanceId).commercialResult).toBe(beforeEconomicResult);
    expect(migrated.audit.some((event) => event.action === "Reconciliar migracion de efectivo")).toBe(true);

    const migratedAgain = hydrateAppData(migrated, 3, {
      now: () => "2026-07-11T18:00:00.000Z",
    });
    expect(migratedAgain.accountMovements.filter((movement) => movement.sourceType === "MIGRACION")).toHaveLength(1);
    expect(migratedAgain.audit.filter((event) => event.action === "Reconciliar migracion de efectivo")).toHaveLength(1);
  });

  it("repara el mismo desacople cuando la caja afectada ya fue cerrada", () => {
    const legacy = legacySnapshotWithOpenBoundary();
    const withRebuiltTransfer = hydrateAppData(legacy.data, 3, {
      now: () => "2026-07-11T17:30:00.000Z",
    });
    const withoutBridge = {
      ...withRebuiltTransfer,
      accountMovements: withRebuiltTransfer.accountMovements.filter((movement) => movement.sourceType !== "MIGRACION"),
      audit: withRebuiltTransfer.audit.filter((event) => event.action !== "Reconciliar migracion de efectivo"),
      balances: withRebuiltTransfer.balances.map((balance) =>
        balance.id === legacy.balanceId
          ? {
              ...balance,
              status: "CERRADO" as const,
              declaredCash: 20_000,
              declaredBank: 14_000,
              nextBase: 20_000,
              nextBankBase: 14_000,
              cashDifference: 0,
              bankDifference: 0,
              closedAt: "2026-07-11T16:00:00.000Z",
              closedBy: "user-cajero1",
            }
          : balance,
      ),
    };
    expect(localAccountBalances(withoutBridge, "1").cash).toBe(6_000);

    const repaired = hydrateAppData(withoutBridge, 3, {
      now: () => "2026-07-11T18:00:00.000Z",
    });
    expect(localAccountBalances(repaired, "1").cash).toBe(20_000);
    expect(repaired.accountMovements.find((movement) => movement.sourceType === "MIGRACION")?.amount).toBe(14_000);
  });

  it("no compensa una inconsistencia que no coincide con las transferencias reconstruidas", () => {
    const legacy = legacySnapshotWithOpenBoundary();
    const unrelatedMovement = {
      id: "account-movement-unrelated-corruption",
      accountId: "account-local-1-efectivo",
      balanceId: legacy.balanceId,
      sourceType: "AJUSTE" as const,
      sourceId: "unrelated-corruption",
      direction: "SALIDA" as const,
      concept: "INCONSISTENCIA_NO_EXPLICADA",
      amount: 5_000,
      detail: "No pertenece a la migracion de transferencias",
      status: "ACTIVO" as const,
      userId: "system",
      createdAt: "2026-07-10T23:00:00.000Z",
    };
    const migrated = hydrateAppData(
      { ...legacy.data, accountMovements: [unrelatedMovement, ...legacy.data.accountMovements] },
      3,
      { now: () => "2026-07-11T18:00:00.000Z" },
    );
    expect(migrated.accountMovements.some((movement) => movement.sourceType === "MIGRACION")).toBe(false);
    expect(totalsForBalance(migrated, legacy.balanceId).expectedCash).toBe(20_000);
    expect(localAccountBalances(migrated, "1").cash).toBe(1_000);
  });

  it("no reconstruye asientos faltantes silenciosamente en un snapshot del esquema vigente", () => {
    const legacy = legacySnapshotWithOpenBoundary();
    const hydrated = hydrateAppData(legacy.data, 4);
    expect(
      legacy.transferCashMovementIds.some((movementId) =>
        hydrated.accountMovements.some((movement) => movement.id === movementId),
      ),
    ).toBe(false);
    expect(hydrated.accountMovements.some((movement) => movement.sourceType === "MIGRACION")).toBe(false);
  });
});
