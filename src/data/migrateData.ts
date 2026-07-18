import type { AccountMovement, AppData, Balance } from "../types";
import { appendAuditEvent } from "../lib/audit";
import { totalsForBalance } from "../lib/cashTotals";
import {
  localAccountBalances,
  localCashAccountId,
  partnerAccountId,
  principalAccountIdForMedium,
} from "../lib/currentAccounts";
import { nowIso } from "../lib/dates";
import { money } from "../lib/money";
import { normalizeData } from "./appData";

export const CASH_TRANSFER_RECONCILIATION_MIGRATION_ID = "schema-v4-transfer-cash-reconciliation";
const CASH_TRANSFER_RECONCILIATION_SCHEMA_VERSION = 4;
export const PRINCIPAL_ACCOUNTS_MIGRATION_ID = "schema-v5-principal-accounts";
const PRINCIPAL_ACCOUNTS_SCHEMA_VERSION = 5;

type MigrationOptions = {
  now?: () => string;
};

function newestOperationalBalance(data: AppData, localId: string) {
  const localBalances = data.balances.filter(
    (balance) => balance.localId === localId && balance.status !== "ANULADO",
  );
  const open = localBalances.find((balance) => balance.status === "EN_PROCESO");
  if (open) return open;
  return [...localBalances]
    .filter((balance) => balance.status === "CERRADO" || balance.status === "AJUSTADO")
    .sort((a, b) => (b.closedAt ?? b.openedAt).localeCompare(a.closedAt ?? a.openedAt))[0];
}

function boundaryCash(data: AppData, balance: Balance) {
  if (balance.status === "EN_PROCESO") return totalsForBalance(data, balance.id).expectedCash;
  return Number(balance.nextBase ?? balance.declaredCash);
}

function hasLaterCashMovement(data: AppData, balance: Balance) {
  if (balance.status === "EN_PROCESO" || !balance.closedAt) return false;
  const accountId = localCashAccountId(balance.localId);
  return data.accountMovements.some(
    (movement) =>
      movement.accountId === accountId &&
      movement.status === "ACTIVO" &&
      movement.sourceType !== "MIGRACION" &&
      movement.createdAt > balance.closedAt!,
  );
}

function priorTransferCashMovements(data: AppData, balance: Balance) {
  const priorBalanceIds = new Set(
    data.balances
      .filter((candidate) => candidate.localId === balance.localId && candidate.openedAt < balance.openedAt)
      .map((candidate) => candidate.id),
  );
  const activeTransferIds = new Set(
    data.transfers
      .filter((transfer) => transfer.status === "ACTIVO" && priorBalanceIds.has(transfer.balanceId))
      .map((transfer) => transfer.id),
  );
  const accountId = localCashAccountId(balance.localId);
  return data.accountMovements
    .filter(
      (movement) =>
        movement.accountId === accountId &&
        movement.sourceType === "TRANSFERENCIA" &&
        movement.direction === "SALIDA" &&
        movement.status === "ACTIVO" &&
        activeTransferIds.has(movement.sourceId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function migrationMovement(
  balance: Balance,
  amount: number,
  relatedTransfers: AccountMovement[],
  createdAt: string,
): AccountMovement {
  const sourceId = `${CASH_TRANSFER_RECONCILIATION_MIGRATION_ID}-${balance.localId}-${balance.id}`;
  const transferIds = relatedTransfers.map((movement) => movement.sourceId).join(", ");
  return {
    id: `account-movement-${sourceId}`,
    accountId: localCashAccountId(balance.localId),
    localId: balance.localId,
    balanceId: balance.id,
    sourceType: "MIGRACION",
    sourceId,
    direction: "ENTRADA",
    concept: "RECONCILIACION_MIGRACION",
    amount,
    currency: "UYU",
    detail: `Puente tecnico para conservar el saldo aceptado de la caja ${balance.visibleId ?? balance.id} despues de reconstruir transferencias historicas: ${transferIds}.`,
    status: "ACTIVO",
    userId: "system",
    createdAt,
  };
}

export function reconcileLegacyTransferCashMigration(
  data: AppData,
  options: MigrationOptions = {},
) {
  const createdAt = options.now?.() ?? nowIso();
  return data.locals.reduce((current, local) => {
    const balance = newestOperationalBalance(current, local.id);
    if (!balance || hasLaterCashMovement(current, balance)) return current;
    const expectedCash = boundaryCash(current, balance);
    const accountCash = localAccountBalances(current, local.id).cash;
    const adjustment = expectedCash - accountCash;
    if (![expectedCash, accountCash, adjustment].every(Number.isFinite) || adjustment <= 0) return current;

    const relatedTransfers = priorTransferCashMovements(current, balance);
    const relatedAmount = relatedTransfers.reduce((total, movement) => total + movement.amount, 0);
    if (!relatedTransfers.length || relatedAmount !== adjustment) return current;

    const movement = migrationMovement(balance, adjustment, relatedTransfers, createdAt);
    if (current.accountMovements.some((item) => item.id === movement.id)) return current;
    const withMovement = {
      ...current,
      accountMovements: [movement, ...current.accountMovements],
    };
    if (localAccountBalances(withMovement, local.id).cash !== expectedCash) return current;
    const auditId = `audit-${movement.sourceId}`;
    if (withMovement.audit.some((event) => event.id === auditId)) return withMovement;
    return appendAuditEvent(
      withMovement,
      {},
      "Reconciliar migracion de efectivo",
      "MigracionDatos",
      movement.sourceId,
      {
        balanceId: balance.id,
        localId: local.id,
        expectedCash,
        accountCash,
        transferIds: relatedTransfers.map((item) => item.sourceId),
      },
      {
        balanceId: balance.id,
        localId: local.id,
        accountCash: expectedCash,
        adjustment,
        movementId: movement.id,
      },
      `Ajuste tecnico append-only de ${money(adjustment)}. No representa aporte, diferencia de caja ni resultado economico.`,
      { id: auditId, createdAt, localId: local.id },
    );
  }, data);
}

export function migrateLegacyCapitalToPrincipalAccounts(
  data: AppData,
  options: MigrationOptions = {},
) {
  const createdAt = options.now?.() ?? nowIso();
  const additions: AccountMovement[] = [];
  data.capitalMovements
    .filter((movement) => movement.status === "ACTIVO")
    .forEach((movement) => {
      if (movement.type === "RETIRO") {
        additions.push({
          id: `account-movement-${PRINCIPAL_ACCOUNTS_MIGRATION_ID}-retiro-${movement.id}`,
          accountId: principalAccountIdForMedium(movement.medium === "EFECTIVO" ? "EFECTIVO" : "BANCO"),
          localId: movement.localId,
          balanceId: movement.balanceId,
          sourceType: "MIGRACION",
          sourceId: `${PRINCIPAL_ACCOUNTS_MIGRATION_ID}-${movement.id}`,
          direction: "ENTRADA",
          concept: "RETIRO_CAJA_LEGACY_A_PRINCIPAL",
          amount: movement.amount,
          currency: "UYU",
          detail: `Contrapartida principal del retiro historico de caja ${movement.id}. No es retiro de socio.`,
          status: "ACTIVO",
          userId: "system",
          createdAt: movement.createdAt,
        });
        return;
      }
      additions.push({
        id: `account-movement-${PRINCIPAL_ACCOUNTS_MIGRATION_ID}-aporte-${movement.id}`,
        accountId: partnerAccountId(movement.person),
        localId: movement.localId,
        balanceId: movement.balanceId,
        sourceType: "MIGRACION",
        sourceId: `${PRINCIPAL_ACCOUNTS_MIGRATION_ID}-${movement.id}`,
        direction: "ENTRADA",
        concept: "APORTE_SOCIO_LEGACY",
        amount: movement.amount,
        currency: "UYU",
        detail: `Registro patrimonial del aporte historico de ${movement.person}.`,
        status: "ACTIVO",
        userId: "system",
        createdAt: movement.createdAt,
      });
    });
  const newMovements = additions.filter(
    (movement) => !data.accountMovements.some((existing) => existing.id === movement.id),
  );
  if (!newMovements.length) return data;
  const withMovements = { ...data, accountMovements: [...newMovements, ...data.accountMovements] };
  const auditId = `audit-${PRINCIPAL_ACCOUNTS_MIGRATION_ID}`;
  if (withMovements.audit.some((event) => event.id === auditId)) return withMovements;
  return appendAuditEvent(
    withMovements,
    {},
    "Migrar cuentas principales y de socios",
    "MigracionDatos",
    PRINCIPAL_ACCOUNTS_MIGRATION_ID,
    { schemaVersion: 4 },
    { schemaVersion: 5, movementIds: newMovements.map((movement) => movement.id) },
    "Se agregaron contrapartidas principales para retiros historicos activos y registros patrimoniales para aportes historicos activos, sin modificar cuentas locales ni resultado economico.",
    { id: auditId, createdAt },
  );
}

export function hydrateAppData(
  data: AppData,
  sourceVersion: number,
  options: MigrationOptions = {},
) {
  const needsTransferCashReconciliation = sourceVersion < CASH_TRANSFER_RECONCILIATION_SCHEMA_VERSION;
  const needsPrincipalAccountsMigration = sourceVersion < PRINCIPAL_ACCOUNTS_SCHEMA_VERSION;
  const normalized = normalizeData(data, {
    rebuildDerivedAccountMovements: needsTransferCashReconciliation,
  });
  const reconciled = needsTransferCashReconciliation
    ? reconcileLegacyTransferCashMigration(normalized, options)
    : normalized;
  return needsPrincipalAccountsMigration
    ? migrateLegacyCapitalToPrincipalAccounts(reconciled, options)
    : reconciled;
}
