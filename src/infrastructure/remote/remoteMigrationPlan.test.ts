import { describe, expect, it } from "vitest";
import { createSeedData } from "../../data/appData";
import type { AppData } from "../../types";
import { remoteTablesByAppDataCollection } from "./appDataMigrationMapping";
import {
  createRemoteMigrationPlan,
  digestRemoteMigrationLegacyIds,
  reconcileRemoteMigrationPlan,
  remoteMigrationTableDependencies,
} from "./remoteMigrationPlan";
import type {
  RemoteMigrationImportReport,
  RemoteMigrationPlan,
  RemoteMigrationTable,
} from "./remoteMigrationPlan";

function importReportMatching(plan: RemoteMigrationPlan): RemoteMigrationImportReport {
  return {
    counts: {
      collections: { ...plan.expectedCounts.collections },
      tables: { ...plan.expectedCounts.tables },
    },
    digests: {
      collections: { ...plan.expectedDigests.collections },
      tables: { ...plan.expectedDigests.tables },
    },
  };
}

function reverseCollections(data: AppData): AppData {
  return {
    users: [...data.users].reverse().map((user) => ({
      ...user,
      localIds: [...user.localIds].reverse(),
    })),
    staff: [...data.staff].reverse().map((staff) => ({
      ...staff,
      schedule: [...staff.schedule].reverse(),
    })),
    salarySettlements: [...data.salarySettlements].reverse(),
    salaryHistories: [...data.salaryHistories].reverse(),
    salaryClosures: [...data.salaryClosures].reverse().map((closure) => ({
      ...closure,
      employeeSnapshots: [...closure.employeeSnapshots].reverse().map(
        (employee) => ({
          ...employee,
          settlementIds: [...employee.settlementIds].reverse(),
          settlements: [...employee.settlements].reverse(),
        }),
      ),
      settlementIds: [...closure.settlementIds].reverse(),
    })),
    clients: [...data.clients].reverse(),
    periodicClosures: [...data.periodicClosures].reverse().map((closure) => ({
      ...closure,
      balanceIds: [...closure.balanceIds].reverse(),
      principalExpenseIds: [...closure.principalExpenseIds].reverse(),
      principalSalarySettlementIds: [
        ...closure.principalSalarySettlementIds,
      ].reverse(),
      treasuryTransferIds: [...closure.treasuryTransferIds].reverse(),
      partnerMovementIds: [...closure.partnerMovementIds].reverse(),
    })),
    currentAccounts: [...data.currentAccounts].reverse(),
    accountMovements: [...data.accountMovements].reverse(),
    capitalMovements: [...data.capitalMovements].reverse(),
    treasuryTransfers: [...data.treasuryTransfers].reverse(),
    partnerMovements: [...data.partnerMovements].reverse(),
    locals: [...data.locals].reverse().map((local) => ({
      ...local,
      images: [...local.images].reverse(),
    })),
    machines: [...data.machines].reverse(),
    balances: [...data.balances].reverse(),
    readings: [...data.readings].reverse(),
    expenseCategories: [...data.expenseCategories].reverse().map((category) => ({
      ...category,
      subcategories: [...category.subcategories].reverse(),
    })),
    expenses: [...data.expenses].reverse(),
    transfers: [...data.transfers].reverse(),
    gifts: [...data.gifts].reverse().map((gift) => ({
      ...gift,
      clientIds: gift.clientIds ? [...gift.clientIds].reverse() : undefined,
    })),
    audit: [...data.audit].reverse().map((event) => ({
      ...event,
      localIds: event.localIds ? [...event.localIds].reverse() : undefined,
    })),
    machineLocalHistory: [...data.machineLocalHistory].reverse(),
  };
}

describe("plan de migracion remota", () => {
  it("crea un plan valido con lotes legacy, conteos completos y sin secretos", () => {
    const data = createSeedData();
    data.users[0] = {
      ...data.users[0],
      password: "SECRET_SENTINEL_DO_NOT_EXPORT",
    };
    data.locals[0] = {
      ...data.locals[0],
      images: [
        ...data.locals[0].images,
        {
          id: "local-image-plan-test",
          name: "plan-test.png",
          dataUrl: "data:image/png;base64,INLINE_FILE_SENTINEL",
          createdAt: "2026-07-26T12:00:00.000Z",
        },
      ],
    };

    const result = createRemoteMigrationPlan(data, { batchSize: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("El seed debio producir un plan valido.");

    const { plan } = result;
    const manifestTables = [
      ...new Set(Object.values(remoteTablesByAppDataCollection).flat()),
    ].sort();
    const expectedAttachments =
      data.locals.reduce((total, local) => total + local.images.length, 0) +
      data.clients.reduce(
        (total, client) =>
          total +
          Number(Boolean(client.photoFile)) +
          Number(Boolean(client.identityDocumentFile)),
        0,
      ) +
      data.expenses.reduce(
        (total, expense) =>
          total +
          Number(
            Boolean(
              expense.receiptFileName ||
                expense.receiptFileType ||
                expense.receiptDataUrl,
            ),
          ),
        0,
      );

    expect(Object.keys(plan.expectedCounts.collections).sort()).toEqual(
      Object.keys(remoteTablesByAppDataCollection).sort(),
    );
    expect(Object.keys(plan.expectedCounts.tables).sort()).toEqual(
      manifestTables,
    );
    expect(plan.expectedCounts.collections.users).toBe(data.users.length);
    expect(plan.expectedCounts.tables.profiles).toBe(data.users.length);
    expect(plan.expectedCounts.tables.user_locals).toBe(
      data.users.reduce(
        (total, user) => total + new Set(user.localIds).size,
        0,
      ),
    );
    expect(plan.expectedCounts.tables.attachments).toBe(expectedAttachments);
    expect(
      Object.values(plan.expectedDigests.tables).every((digest) =>
        /^[0-9a-f]{64}$/.test(digest),
      ),
    ).toBe(true);
    expect(digestRemoteMigrationLegacyIds([])).toBe(
      "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    );

    const profileLegacyIds = plan.phases
      .flatMap((phase) => phase.batches)
      .filter((batch) => batch.table === "profiles")
      .flatMap((batch) => batch.legacyIds);
    expect(profileLegacyIds).toEqual(data.users.map((user) => user.id).sort());

    const serializedPlan = JSON.stringify(plan);
    expect(serializedPlan).not.toContain("SECRET_SENTINEL_DO_NOT_EXPORT");
    expect(serializedPlan).not.toContain("INLINE_FILE_SENTINEL");
    expect(serializedPlan).not.toContain('"password"');
    expect(serializedPlan).not.toContain('"dataUrl"');
    expect(
      reconcileRemoteMigrationPlan(plan, importReportMatching(plan)),
    ).toEqual({ ok: true, issues: [] });
  });

  it("rechaza el plan con las incidencias bloqueantes del inspector", () => {
    const data = createSeedData();
    data.staff[0] = { ...data.staff[0], position: "Cargo remoto inexistente" };

    expect(createRemoteMigrationPlan(data)).toEqual({
      ok: false,
      issues: [
        {
          path: "staff[0].position",
          message:
            'El cargo "Cargo remoto inexistente" no tiene equivalencia remota.',
        },
      ],
    });
  });

  it("mantiene un orden determinista y respeta cada dependencia entre tablas", () => {
    const data = createSeedData();
    const original = createRemoteMigrationPlan(data);
    const reversed = createRemoteMigrationPlan(reverseCollections(data));
    expect(original.ok).toBe(true);
    expect(reversed.ok).toBe(true);
    if (!original.ok || !reversed.ok) {
      throw new Error("Los snapshots equivalentes debieron ser compatibles.");
    }

    expect(reversed.plan).toEqual(original.plan);

    const phaseByTable = new Map<RemoteMigrationTable, number>();
    original.plan.phases.forEach((phase) => {
      phase.tables.forEach((table) => phaseByTable.set(table, phase.index));
    });
    (
      Object.keys(
        remoteMigrationTableDependencies,
      ) as RemoteMigrationTable[]
    ).forEach((table) => {
      remoteMigrationTableDependencies[table].forEach((dependency) => {
        expect(phaseByTable.get(dependency)).toBeLessThan(
          phaseByTable.get(table)!,
        );
      });
    });
  });

  it("bloquea la conciliacion cuando un conteo importado no coincide", () => {
    const result = createRemoteMigrationPlan(createSeedData());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("El seed debio producir un plan valido.");

    const report = importReportMatching(result.plan);
    report.counts.tables.profiles =
      result.plan.expectedCounts.tables.profiles + 1;

    expect(reconcileRemoteMigrationPlan(result.plan, report)).toEqual({
      ok: false,
      issues: [
        {
          code: "COUNT_MISMATCH",
          scope: "TABLE",
          target: "profiles",
          expected: result.plan.expectedCounts.tables.profiles,
          actual: result.plan.expectedCounts.tables.profiles + 1,
        },
      ],
    });
  });

  it("bloquea la conciliacion cuando un digest importado no coincide", () => {
    const result = createRemoteMigrationPlan(createSeedData());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("El seed debio producir un plan valido.");

    const report = importReportMatching(result.plan);
    report.digests.collections.audit = "0".repeat(64);

    expect(reconcileRemoteMigrationPlan(result.plan, report)).toEqual({
      ok: false,
      issues: [
        {
          code: "DIGEST_MISMATCH",
          scope: "COLLECTION",
          target: "audit",
          expected: result.plan.expectedDigests.collections.audit,
          actual: "0".repeat(64),
        },
      ],
    });
  });
});
