import type { AppData } from "../../types";
import {
  inspectRemoteMigrationCompatibility,
  remoteTablesByAppDataCollection,
} from "./appDataMigrationMapping";
import type { MigrationMappingIssue } from "./appDataMigrationMapping";

export type RemoteMigrationCollection = keyof AppData;
export type RemoteMigrationTable =
  (typeof remoteTablesByAppDataCollection)[RemoteMigrationCollection][number];

export const REMOTE_MIGRATION_DIGEST_ALGORITHM =
  "sha256-sorted-legacy-row-ids-v1" as const;
export const DEFAULT_REMOTE_MIGRATION_BATCH_SIZE = 250;

export const remoteMigrationTableDependencies = {
  profiles: [],
  user_locals: ["profiles", "locals"],
  staff: ["locals"],
  staff_schedules: ["staff"],
  salary_settlements: [
    "salary_closures",
    "current_accounts",
    "cash_balances",
    "staff",
    "locals",
    "profiles",
  ],
  salary_history: ["staff", "locals", "profiles"],
  salary_closures: ["profiles"],
  salary_closure_locals: ["salary_closures", "locals"],
  salary_closure_employee_snapshots: [
    "salary_closures",
    "salary_closure_locals",
    "staff",
  ],
  salary_closure_settlement_snapshots: [
    "salary_closure_employee_snapshots",
    "salary_settlements",
  ],
  clients: ["locals"],
  attachments: ["locals", "clients", "expenses", "profiles"],
  periodic_closures: ["locals", "profiles"],
  periodic_closure_balances: ["periodic_closures", "cash_balances"],
  periodic_closure_expenses: ["periodic_closures", "expenses"],
  periodic_closure_salary_settlements: [
    "periodic_closures",
    "salary_settlements",
  ],
  periodic_closure_treasury_transfers: [
    "periodic_closures",
    "treasury_transfers",
  ],
  periodic_closure_partner_movements: [
    "periodic_closures",
    "partner_movements",
  ],
  current_accounts: ["locals", "staff"],
  account_movements: ["current_accounts", "locals", "cash_balances", "profiles"],
  capital_movements: ["cash_balances", "locals", "profiles"],
  treasury_transfers: ["cash_balances", "locals", "profiles"],
  partner_movements: ["cash_balances", "locals", "profiles"],
  locals: [],
  machines: ["locals"],
  cash_balances: ["locals", "profiles"],
  machine_readings: ["cash_balances", "machines", "profiles"],
  expense_categories: [],
  expense_subcategories: ["expense_categories"],
  expenses: [
    "cash_balances",
    "locals",
    "current_accounts",
    "expense_categories",
    "expense_subcategories",
    "profiles",
  ],
  transfers: ["cash_balances", "locals", "clients", "profiles"],
  gifts: ["cash_balances", "locals", "clients", "profiles"],
  gift_clients: ["gifts", "clients", "locals"],
  audit_events: ["profiles", "locals"],
  audit_event_locals: ["audit_events", "locals"],
  machine_history: ["machines", "locals", "profiles"],
} as const satisfies Record<
  RemoteMigrationTable,
  readonly RemoteMigrationTable[]
>;

export type RemoteMigrationBatch = {
  id: string;
  sequence: number;
  collection: RemoteMigrationCollection;
  table: RemoteMigrationTable;
  legacyIds: readonly string[];
  expectedRowCount: number;
  expectedDigest: string;
};

export type RemoteMigrationPhase = {
  id: string;
  index: number;
  tables: readonly RemoteMigrationTable[];
  batches: readonly RemoteMigrationBatch[];
};

export type RemoteMigrationCounts = {
  collections: Readonly<Record<RemoteMigrationCollection, number>>;
  tables: Readonly<Record<RemoteMigrationTable, number>>;
};

export type RemoteMigrationDigests = {
  collections: Readonly<Record<RemoteMigrationCollection, string>>;
  tables: Readonly<Record<RemoteMigrationTable, string>>;
};

export type RemoteMigrationPlan = {
  kind: "REMOTE_APP_DATA_MIGRATION_PLAN";
  version: 1;
  digestAlgorithm: typeof REMOTE_MIGRATION_DIGEST_ALGORITHM;
  batchSize: number;
  phases: readonly RemoteMigrationPhase[];
  expectedCounts: RemoteMigrationCounts;
  expectedDigests: RemoteMigrationDigests;
};

export type RemoteMigrationPlanResult =
  | { ok: true; plan: RemoteMigrationPlan }
  | { ok: false; issues: readonly MigrationMappingIssue[] };

export type RemoteMigrationPlanOptions = {
  batchSize?: number;
};

export type RemoteMigrationImportReport = {
  counts: {
    collections: Partial<Record<RemoteMigrationCollection, number>>;
    tables: Partial<Record<RemoteMigrationTable, number>>;
  };
  digests: {
    collections: Partial<Record<RemoteMigrationCollection, string>>;
    tables: Partial<Record<RemoteMigrationTable, string>>;
  };
};

export type RemoteMigrationMetricScope = "COLLECTION" | "TABLE";

export type RemoteMigrationReconciliationIssue =
  | {
      code: "MISSING_COUNT";
      scope: RemoteMigrationMetricScope;
      target: RemoteMigrationCollection | RemoteMigrationTable;
      expected: number;
    }
  | {
      code: "COUNT_MISMATCH";
      scope: RemoteMigrationMetricScope;
      target: RemoteMigrationCollection | RemoteMigrationTable;
      expected: number;
      actual: number;
    }
  | {
      code: "MISSING_DIGEST";
      scope: RemoteMigrationMetricScope;
      target: RemoteMigrationCollection | RemoteMigrationTable;
      expected: string;
    }
  | {
      code: "DIGEST_MISMATCH";
      scope: RemoteMigrationMetricScope;
      target: RemoteMigrationCollection | RemoteMigrationTable;
      expected: string;
      actual: string;
    };

export type RemoteMigrationReconciliationResult = {
  ok: boolean;
  issues: readonly RemoteMigrationReconciliationIssue[];
};

type CollectionTableRows = {
  [Collection in RemoteMigrationCollection]: {
    [Table in (typeof remoteTablesByAppDataCollection)[Collection][number]]: readonly string[];
  };
};

type TableContribution = {
  collection: RemoteMigrationCollection;
  table: RemoteMigrationTable;
  legacyIds: readonly string[];
};

const SHA256_INITIAL_HASH = [
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
] as const;

const SHA256_ROUND_CONSTANTS = [
  0x428a2f98,
  0x71374491,
  0xb5c0fbcf,
  0xe9b5dba5,
  0x3956c25b,
  0x59f111f1,
  0x923f82a4,
  0xab1c5ed5,
  0xd807aa98,
  0x12835b01,
  0x243185be,
  0x550c7dc3,
  0x72be5d74,
  0x80deb1fe,
  0x9bdc06a7,
  0xc19bf174,
  0xe49b69c1,
  0xefbe4786,
  0x0fc19dc6,
  0x240ca1cc,
  0x2de92c6f,
  0x4a7484aa,
  0x5cb0a9dc,
  0x76f988da,
  0x983e5152,
  0xa831c66d,
  0xb00327c8,
  0xbf597fc7,
  0xc6e00bf3,
  0xd5a79147,
  0x06ca6351,
  0x14292967,
  0x27b70a85,
  0x2e1b2138,
  0x4d2c6dfc,
  0x53380d13,
  0x650a7354,
  0x766a0abb,
  0x81c2c92e,
  0x92722c85,
  0xa2bfe8a1,
  0xa81a664b,
  0xc24b8b70,
  0xc76c51a3,
  0xd192e819,
  0xd6990624,
  0xf40e3585,
  0x106aa070,
  0x19a4c116,
  0x1e376c08,
  0x2748774c,
  0x34b0bcb5,
  0x391c0cb3,
  0x4ed8aa4a,
  0x5b9cca4f,
  0x682e6ff3,
  0x748f82ee,
  0x78a5636f,
  0x84c87814,
  0x8cc70208,
  0x90befffa,
  0xa4506ceb,
  0xbef9a3f7,
  0xc67178f2,
] as const;

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const sortedStrings = <Value extends string>(values: readonly Value[]) =>
  [...values].sort(compareText);

const uniqueSortedStrings = (values: readonly string[]) =>
  sortedStrings([...new Set(values)]);

const rotateRight = (value: number, amount: number) =>
  (value >>> amount) | (value << (32 - amount));

function sha256Hex(value: string) {
  const message = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((message.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;

  const bitLength = message.length * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const hash: number[] = [...SHA256_INITIAL_HASH];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const prior15 = words[index - 15];
      const prior2 = words[index - 2];
      const sigma0 =
        rotateRight(prior15, 7) ^ rotateRight(prior15, 18) ^ (prior15 >>> 3);
      const sigma1 =
        rotateRight(prior2, 17) ^ rotateRight(prior2, 19) ^ (prior2 >>> 10);
      words[index] =
        (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (let index = 0; index < 64; index += 1) {
      const choice = (e & f) ^ (~e & g);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const temporary1 =
        (h +
          sum1 +
          choice +
          SHA256_ROUND_CONSTANTS[index] +
          words[index]) >>>
        0;
      const temporary2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return hash.map((item) => item.toString(16).padStart(8, "0")).join("");
}

export function digestRemoteMigrationLegacyIds(legacyIds: readonly string[]) {
  return sha256Hex(JSON.stringify(sortedStrings(legacyIds)));
}

const collectionNames = sortedStrings(
  Object.keys(remoteTablesByAppDataCollection) as RemoteMigrationCollection[],
);

const tableNames = sortedStrings(
  [
    ...new Set(
      Object.values(remoteTablesByAppDataCollection).flat() as RemoteMigrationTable[],
    ),
  ],
);

function legacyRowId(...parts: string[]) {
  return JSON.stringify(parts);
}

function relationLegacyIds(
  ownerId: string,
  relation: string,
  relatedIds: readonly string[],
) {
  return uniqueSortedStrings(relatedIds).map((relatedId) =>
    legacyRowId(relation, ownerId, relatedId),
  );
}

function primaryLegacyIds<Item extends { id: string }>(items: readonly Item[]) {
  return items.map((item) => item.id);
}

function dependencyOrderedIds<Item extends { id: string }>(
  items: readonly Item[],
  dependencies: (item: Item) => readonly (string | undefined)[],
) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const pending = new Set(itemsById.keys());
  const result: string[] = [];

  while (pending.size > 0) {
    const ready = sortedStrings(
      [...pending].filter((id) =>
        dependencies(itemsById.get(id)!).every(
          (dependency) => !dependency || !pending.has(dependency),
        ),
      ),
    );
    if (ready.length === 0) {
      result.push(...sortedStrings([...pending]));
      break;
    }
    ready.forEach((id) => {
      pending.delete(id);
      result.push(id);
    });
  }

  return result;
}

function expenseHasAttachment(
  expense: AppData["expenses"][number],
) {
  return Boolean(
    expense.receiptFileName ||
      expense.receiptFileType ||
      expense.receiptDataUrl,
  );
}

function collectionTableRows(data: AppData): CollectionTableRows {
  return {
    users: {
      profiles: primaryLegacyIds(data.users),
      user_locals: data.users.flatMap((user) =>
        relationLegacyIds(user.id, "users.localIds", user.localIds),
      ),
    },
    staff: {
      staff: primaryLegacyIds(data.staff),
      staff_schedules: data.staff.flatMap((staff) =>
        relationLegacyIds(
          staff.id,
          "staff.schedule",
          staff.schedule.map((schedule) => schedule.day),
        ),
      ),
    },
    salarySettlements: {
      salary_settlements: primaryLegacyIds(data.salarySettlements),
    },
    salaryHistories: {
      salary_history: primaryLegacyIds(data.salaryHistories),
    },
    salaryClosures: {
      salary_closures: dependencyOrderedIds(
        data.salaryClosures,
        (closure) => [closure.parentClosureId],
      ),
      salary_closure_locals: data.salaryClosures.flatMap((closure) =>
        relationLegacyIds(
          closure.id,
          "salaryClosures.employeeSnapshots.localId",
          closure.employeeSnapshots.map((snapshot) => snapshot.localId),
        ),
      ),
      salary_closure_employee_snapshots: data.salaryClosures.flatMap((closure) =>
        relationLegacyIds(
          closure.id,
          "salaryClosures.employeeSnapshots.staffId",
          closure.employeeSnapshots.map((snapshot) => snapshot.staffId),
        ),
      ),
      salary_closure_settlement_snapshots: data.salaryClosures.flatMap((closure) =>
        closure.employeeSnapshots.flatMap((employee) =>
          relationLegacyIds(
            legacyRowId(closure.id, employee.staffId),
            "salaryClosures.employeeSnapshots.settlements",
            employee.settlements.map((settlement) => settlement.id),
          ),
        ),
      ),
    },
    clients: {
      clients: primaryLegacyIds(data.clients),
      attachments: data.clients.flatMap((client) => [
        ...(client.photoFile
          ? [legacyRowId("clients.photoFile", client.id)]
          : []),
        ...(client.identityDocumentFile
          ? [legacyRowId("clients.identityDocumentFile", client.id)]
          : []),
      ]),
    },
    periodicClosures: {
      periodic_closures: primaryLegacyIds(data.periodicClosures),
      periodic_closure_balances: data.periodicClosures.flatMap((closure) =>
        relationLegacyIds(
          closure.id,
          "periodicClosures.balanceIds",
          closure.balanceIds,
        ),
      ),
      periodic_closure_expenses: data.periodicClosures.flatMap((closure) =>
        relationLegacyIds(
          closure.id,
          "periodicClosures.principalExpenseIds",
          closure.principalExpenseIds,
        ),
      ),
      periodic_closure_salary_settlements: data.periodicClosures.flatMap(
        (closure) =>
          relationLegacyIds(
            closure.id,
            "periodicClosures.principalSalarySettlementIds",
            closure.principalSalarySettlementIds,
          ),
      ),
      periodic_closure_treasury_transfers: data.periodicClosures.flatMap(
        (closure) =>
          relationLegacyIds(
            closure.id,
            "periodicClosures.treasuryTransferIds",
            closure.treasuryTransferIds,
          ),
      ),
      periodic_closure_partner_movements: data.periodicClosures.flatMap(
        (closure) =>
          relationLegacyIds(
            closure.id,
            "periodicClosures.partnerMovementIds",
            closure.partnerMovementIds,
          ),
      ),
    },
    currentAccounts: {
      current_accounts: primaryLegacyIds(data.currentAccounts),
    },
    accountMovements: {
      account_movements: dependencyOrderedIds(
        data.accountMovements,
        (movement) => [movement.reversalOf, movement.previousAdjustmentId],
      ),
    },
    capitalMovements: {
      capital_movements: primaryLegacyIds(data.capitalMovements),
    },
    treasuryTransfers: {
      treasury_transfers: primaryLegacyIds(data.treasuryTransfers),
    },
    partnerMovements: {
      partner_movements: primaryLegacyIds(data.partnerMovements),
    },
    locals: {
      locals: primaryLegacyIds(data.locals),
      attachments: data.locals.flatMap((local) =>
        relationLegacyIds(
          local.id,
          "locals.images",
          local.images.map((image) => image.id),
        ),
      ),
    },
    machines: {
      machines: primaryLegacyIds(data.machines),
    },
    balances: {
      cash_balances: primaryLegacyIds(data.balances),
    },
    readings: {
      machine_readings: primaryLegacyIds(data.readings),
    },
    expenseCategories: {
      expense_categories: primaryLegacyIds(data.expenseCategories),
      expense_subcategories: data.expenseCategories.flatMap((category) =>
        sortedStrings(category.subcategories).map((subcategory) =>
          legacyRowId(
            "expenseCategories.subcategories",
            category.id,
            subcategory,
          ),
        ),
      ),
    },
    expenses: {
      expenses: primaryLegacyIds(data.expenses),
      attachments: data.expenses.flatMap((expense) =>
        expenseHasAttachment(expense)
          ? [legacyRowId("expenses.receiptFile", expense.id)]
          : [],
      ),
    },
    transfers: {
      transfers: primaryLegacyIds(data.transfers),
    },
    gifts: {
      gifts: primaryLegacyIds(data.gifts),
      gift_clients: data.gifts.flatMap((gift) =>
        relationLegacyIds(
          gift.id,
          "gifts.clientIds",
          [
            ...(gift.clientIds ?? []),
            ...(gift.clientId ? [gift.clientId] : []),
          ],
        ),
      ),
    },
    audit: {
      audit_events: primaryLegacyIds(data.audit),
      audit_event_locals: data.audit.flatMap((event) =>
        relationLegacyIds(
          event.id,
          "audit.localIds",
          [
            ...(event.localIds ?? []),
            ...(event.localId ? [event.localId] : []),
          ],
        ),
      ),
    },
    machineLocalHistory: {
      machine_history: primaryLegacyIds(data.machineLocalHistory),
    },
  };
}

function tablePhases() {
  const pending = new Set(tableNames);
  const phases: RemoteMigrationTable[][] = [];

  while (pending.size > 0) {
    const ready = sortedStrings(
      [...pending].filter((table) =>
        remoteMigrationTableDependencies[table].every(
          (dependency) => !pending.has(dependency),
        ),
      ),
    );
    if (ready.length === 0) {
      throw new Error("El grafo de tablas remotas contiene una dependencia ciclica.");
    }
    ready.forEach((table) => pending.delete(table));
    phases.push(ready);
  }

  return phases;
}

function tableContributions(rows: CollectionTableRows) {
  const contributions: TableContribution[] = [];

  collectionNames.forEach((collection) => {
    const tables =
      remoteTablesByAppDataCollection[collection] as readonly RemoteMigrationTable[];
    const rowsForCollection = rows[collection] as Partial<
      Record<RemoteMigrationTable, readonly string[]>
    >;

    tables.forEach((table) => {
      const legacyIds = rowsForCollection[table] ?? [];
      const hasSelfReferences =
        table === "salary_closures" || table === "account_movements";
      contributions.push({
        collection,
        table,
        legacyIds: hasSelfReferences
          ? [...legacyIds]
          : sortedStrings(legacyIds),
      });
    });
  });

  return contributions;
}

function sourceLegacyIds(data: AppData) {
  const result = {} as Record<RemoteMigrationCollection, readonly string[]>;
  collectionNames.forEach((collection) => {
    const items = data[collection] as readonly { id: string }[];
    result[collection] = sortedStrings(items.map((item) => item.id));
  });
  return result;
}

function expectedMetrics(
  data: AppData,
  contributions: readonly TableContribution[],
) {
  const sourceIds = sourceLegacyIds(data);
  const collectionCounts = {} as Record<RemoteMigrationCollection, number>;
  const collectionDigests = {} as Record<RemoteMigrationCollection, string>;
  collectionNames.forEach((collection) => {
    collectionCounts[collection] = sourceIds[collection].length;
    collectionDigests[collection] = digestRemoteMigrationLegacyIds(
      sourceIds[collection],
    );
  });

  const idsByTable = {} as Record<RemoteMigrationTable, string[]>;
  tableNames.forEach((table) => {
    idsByTable[table] = [];
  });
  contributions.forEach((contribution) => {
    idsByTable[contribution.table].push(...contribution.legacyIds);
  });

  const tableCounts = {} as Record<RemoteMigrationTable, number>;
  const tableDigests = {} as Record<RemoteMigrationTable, string>;
  tableNames.forEach((table) => {
    tableCounts[table] = idsByTable[table].length;
    tableDigests[table] = digestRemoteMigrationLegacyIds(idsByTable[table]);
  });

  return {
    expectedCounts: {
      collections: collectionCounts,
      tables: tableCounts,
    },
    expectedDigests: {
      collections: collectionDigests,
      tables: tableDigests,
    },
  };
}

function migrationPhases(
  contributions: readonly TableContribution[],
  batchSize: number,
) {
  let batchSequence = 0;

  return tablePhases().map((tables, phaseIndex): RemoteMigrationPhase => {
    const batches: RemoteMigrationBatch[] = [];

    tables.forEach((table) => {
      contributions
        .filter((contribution) => contribution.table === table)
        .forEach((contribution) => {
          for (
            let offset = 0, batchIndex = 0;
            offset < contribution.legacyIds.length;
            offset += batchSize, batchIndex += 1
          ) {
            const legacyIds = contribution.legacyIds.slice(
              offset,
              offset + batchSize,
            );
            batchSequence += 1;
            batches.push({
              id: `phase-${phaseIndex + 1}:${table}:${contribution.collection}:${batchIndex + 1}`,
              sequence: batchSequence,
              collection: contribution.collection,
              table,
              legacyIds,
              expectedRowCount: legacyIds.length,
              expectedDigest: digestRemoteMigrationLegacyIds(legacyIds),
            });
          }
        });
    });

    return {
      id: `phase-${phaseIndex + 1}`,
      index: phaseIndex,
      tables,
      batches,
    };
  });
}

function normalizedBatchSize(options: RemoteMigrationPlanOptions) {
  const batchSize = options.batchSize ?? DEFAULT_REMOTE_MIGRATION_BATCH_SIZE;
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new RangeError("El tamano de lote debe ser un entero seguro mayor que cero.");
  }
  return batchSize;
}

export function createRemoteMigrationPlan(
  data: AppData,
  options: RemoteMigrationPlanOptions = {},
): RemoteMigrationPlanResult {
  const issues = [...inspectRemoteMigrationCompatibility(data)].sort(
    (left, right) =>
      compareText(left.path, right.path) ||
      compareText(left.message, right.message),
  );
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const batchSize = normalizedBatchSize(options);
  const contributions = tableContributions(collectionTableRows(data));
  const metrics = expectedMetrics(data, contributions);

  return {
    ok: true,
    plan: {
      kind: "REMOTE_APP_DATA_MIGRATION_PLAN",
      version: 1,
      digestAlgorithm: REMOTE_MIGRATION_DIGEST_ALGORITHM,
      batchSize,
      phases: migrationPhases(contributions, batchSize),
      ...metrics,
    },
  };
}

function reconciliationIssuesForScope<
  Target extends RemoteMigrationCollection | RemoteMigrationTable,
>(
  scope: RemoteMigrationMetricScope,
  targets: readonly Target[],
  expectedCounts: Readonly<Record<Target, number>>,
  expectedDigests: Readonly<Record<Target, string>>,
  actualCounts: Partial<Record<Target, number>>,
  actualDigests: Partial<Record<Target, string>>,
) {
  const issues: RemoteMigrationReconciliationIssue[] = [];

  targets.forEach((target) => {
    const actualCount = actualCounts[target];
    if (actualCount === undefined) {
      issues.push({
        code: "MISSING_COUNT",
        scope,
        target,
        expected: expectedCounts[target],
      });
    } else if (actualCount !== expectedCounts[target]) {
      issues.push({
        code: "COUNT_MISMATCH",
        scope,
        target,
        expected: expectedCounts[target],
        actual: actualCount,
      });
    }

    const actualDigest = actualDigests[target];
    if (actualDigest === undefined) {
      issues.push({
        code: "MISSING_DIGEST",
        scope,
        target,
        expected: expectedDigests[target],
      });
    } else if (actualDigest !== expectedDigests[target]) {
      issues.push({
        code: "DIGEST_MISMATCH",
        scope,
        target,
        expected: expectedDigests[target],
        actual: actualDigest,
      });
    }
  });

  return issues;
}

export function reconcileRemoteMigrationPlan(
  plan: RemoteMigrationPlan,
  report: RemoteMigrationImportReport,
): RemoteMigrationReconciliationResult {
  const issues = [
    ...reconciliationIssuesForScope(
      "COLLECTION",
      collectionNames,
      plan.expectedCounts.collections,
      plan.expectedDigests.collections,
      report.counts.collections,
      report.digests.collections,
    ),
    ...reconciliationIssuesForScope(
      "TABLE",
      tableNames,
      plan.expectedCounts.tables,
      plan.expectedDigests.tables,
      report.counts.tables,
      report.digests.tables,
    ),
  ];

  return { ok: issues.length === 0, issues };
}
