import { describe, expect, it } from "vitest";
import { createSeedData } from "../../data/appData";
import type { AppData } from "../../types";
import {
  createRemoteMigrationBatchIdempotencyKey,
  createRemoteMigrationPlanIdentity,
  executeRemoteMigration,
} from "./remoteMigrationExecutor";
import type {
  RemoteMigrationCompleteRunRequest,
  RemoteMigrationGatewayOperationResult,
  RemoteMigrationImportBatchRequest,
  RemoteMigrationImportGateway,
  RemoteMigrationPlanIdentity,
  RemoteMigrationProgress,
} from "./remoteMigrationExecutor";
import {
  createRemoteMigrationPlan,
} from "./remoteMigrationPlan";
import type {
  RemoteMigrationImportReport,
  RemoteMigrationPlan,
} from "./remoteMigrationPlan";

const getPlan = (data: AppData, batchSize = 2): RemoteMigrationPlan => {
  const result = createRemoteMigrationPlan(data, { batchSize });
  if (!result.ok) throw new Error("El fixture debio producir un plan valido.");
  return result.plan;
};

const matchingReport = (
  plan: RemoteMigrationPlan,
): RemoteMigrationImportReport => ({
  counts: {
    collections: { ...plan.expectedCounts.collections },
    tables: { ...plan.expectedCounts.tables },
  },
  digests: {
    collections: { ...plan.expectedDigests.collections },
    tables: { ...plan.expectedDigests.tables },
  },
});

const emptyData = (): AppData => {
  const seed = createSeedData();
  return Object.fromEntries(
    (Object.keys(seed) as (keyof AppData)[]).map((key) => [key, []]),
  ) as unknown as AppData;
};

const deepFreeze = <Value>(value: Value): Value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

type HarnessOptions = {
  appliedBatchIds?: readonly string[];
  runPlan?: RemoteMigrationPlanIdentity;
  runStatus?: "OPEN" | "COMPLETED";
  importResult?: (
    request: RemoteMigrationImportBatchRequest,
    index: number,
  ) =>
    | RemoteMigrationGatewayOperationResult
    | Promise<RemoteMigrationGatewayOperationResult>;
  report?: RemoteMigrationImportReport;
};

const createHarness = (
  plan: RemoteMigrationPlan,
  options: HarnessOptions = {},
) => {
  const identity = createRemoteMigrationPlanIdentity(plan);
  const appliedBatchIds = [...(options.appliedBatchIds ?? [])];
  const state = {
    openCalls: 0,
    batchIds: [] as string[],
    idempotencyKeys: [] as string[],
    maxInFlight: 0,
    inFlight: 0,
    reportCalls: 0,
    completeCalls: 0,
    completeRequests: [] as RemoteMigrationCompleteRunRequest[],
  };

  const gateway: RemoteMigrationImportGateway = {
    async openOrResumeRun() {
      state.openCalls += 1;
      return {
        ok: true,
        value: {
          kind: "REMOTE_MIGRATION_RUN",
          version: 1,
          id: "run-test-001",
          status: options.runStatus ?? "OPEN",
          plan: options.runPlan ?? identity,
          appliedBatchIds: [...appliedBatchIds],
        },
      };
    },
    async importBatch(request) {
      const index = state.batchIds.length;
      state.batchIds.push(request.batch.id);
      state.idempotencyKeys.push(request.idempotencyKey);
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      await Promise.resolve();
      const result = options.importResult
        ? await options.importResult(request, index)
        : { ok: true as const };
      state.inFlight -= 1;
      if (result.ok) appliedBatchIds.push(request.batch.id);
      return result;
    },
    async getImportReport() {
      state.reportCalls += 1;
      return { ok: true, value: options.report ?? matchingReport(plan) };
    },
    async completeRun(request) {
      state.completeCalls += 1;
      state.completeRequests.push(request);
      return { ok: true };
    },
  };

  return { gateway, identity, state };
};

describe("remoteMigrationExecutor", () => {
  it("respeta orden, resume un prefijo, usa una sola llamada y claves deterministas", async () => {
    const data = deepFreeze(createSeedData());
    const plan = getPlan(data);
    const ordered = plan.phases.flatMap((phase) =>
      phase.batches.map((batch) => ({ phaseId: phase.id, batch })),
    );
    const prior = ordered.slice(0, 2).map((item) => item.batch.id);
    const harness = createHarness(plan, { appliedBatchIds: prior });
    const progress: RemoteMigrationProgress[] = [];

    const result = await executeRemoteMigration({
      data,
      gateway: harness.gateway,
      options: { batchSize: 2, onProgress: (event) => progress.push(event) },
    });

    expect(result.ok).toBe(true);
    expect(harness.state.batchIds).toEqual(
      ordered.slice(2).map((item) => item.batch.id),
    );
    expect(harness.state.maxInFlight).toBe(1);
    expect(
      progress.filter((event) => event.stage === "BATCH_SKIPPED"),
    ).toHaveLength(2);
    expect(harness.state.idempotencyKeys).toEqual(
      ordered.slice(2).map((item) =>
        createRemoteMigrationBatchIdempotencyKey(
          "run-test-001",
          item.phaseId,
          item.batch.id,
          harness.identity.digest,
        ),
      ),
    );
    expect(harness.state.reportCalls).toBe(1);
    expect(harness.state.completeCalls).toBe(1);
  });

  it.each([
    { retryable: false, expectedStatus: "BLOCKED" },
    { retryable: true, expectedStatus: "RETRYABLE_ERROR" },
  ] as const)(
    "se detiene en el primer rechazo (retryable=$retryable)",
    async ({ retryable, expectedStatus }) => {
      const data = createSeedData();
      const plan = getPlan(data);
      const harness = createHarness(plan, {
        importResult: () => ({
          ok: false,
          error: "detalle remoto que no debe propagarse",
          retryable,
        }),
      });

      const result = await executeRemoteMigration({
        data,
        gateway: harness.gateway,
        options: { batchSize: 2 },
      });

      expect(result).toMatchObject({
        ok: false,
        code: "BATCH_REJECTED",
        retryable,
        status: expectedStatus,
      });
      expect(JSON.stringify(result)).not.toContain("detalle remoto");
      expect(harness.state.batchIds).toHaveLength(1);
      expect(harness.state.reportCalls).toBe(0);
      expect(harness.state.completeCalls).toBe(0);
    },
  );

  it("aborta despues del lote confirmado y no reconcilia ni completa", async () => {
    const data = createSeedData();
    const plan = getPlan(data);
    const controller = new AbortController();
    const harness = createHarness(plan, {
      importResult: () => {
        controller.abort();
        return { ok: true };
      },
    });

    const result = await executeRemoteMigration({
      data,
      gateway: harness.gateway,
      options: { batchSize: 2, signal: controller.signal },
    });

    expect(result).toMatchObject({
      ok: false,
      code: "ABORTED",
      status: "ABORTED",
      checkpoint: { appliedBatchCount: 1 },
    });
    expect(harness.state.batchIds).toHaveLength(1);
    expect(harness.state.reportCalls).toBe(0);
    expect(harness.state.completeCalls).toBe(0);
  });

  it("bloquea incompatibilidad local antes de abrir y un run previo distinto", async () => {
    const incompatible = createSeedData();
    incompatible.staff[0] = {
      ...incompatible.staff[0],
      position: "Cargo sin equivalencia",
    };
    const validData = createSeedData();
    const validPlan = getPlan(validData);
    const firstHarness = createHarness(validPlan);

    const localResult = await executeRemoteMigration({
      data: incompatible,
      gateway: firstHarness.gateway,
    });
    expect(localResult).toMatchObject({ ok: false, code: "PLAN_INVALID" });
    expect(firstHarness.state.openCalls).toBe(0);

    const identity = createRemoteMigrationPlanIdentity(validPlan);
    const secondHarness = createHarness(validPlan, {
      runPlan: { ...identity, digest: "0".repeat(64) },
    });
    const runResult = await executeRemoteMigration({
      data: validData,
      gateway: secondHarness.gateway,
      options: { batchSize: 2 },
    });
    expect(runResult).toMatchObject({
      ok: false,
      code: "RUN_INCOMPATIBLE",
    });
    expect(secondHarness.state.batchIds).toHaveLength(0);
    expect(secondHarness.state.completeCalls).toBe(0);
  });

  it.each(["missing", "different"] as const)(
    "no completa con reconciliacion %s",
    async (caseName) => {
      const data = createSeedData();
      const plan = getPlan(data);
      const report = matchingReport(plan);
      if (caseName === "missing") {
        delete report.counts.tables.profiles;
      } else {
        report.digests.collections.audit = "0".repeat(64);
      }
      const harness = createHarness(plan, { report });

      const result = await executeRemoteMigration({
        data,
        gateway: harness.gateway,
        options: { batchSize: 2 },
      });

      expect(result).toMatchObject({
        ok: false,
        code: "RECONCILIATION_FAILED",
      });
      expect(harness.state.reportCalls).toBe(1);
      expect(harness.state.completeCalls).toBe(0);
    },
  );

  it("reconcilia y completa un plan sin lotes", async () => {
    const data = emptyData();
    const plan = getPlan(data);
    expect(plan.phases.flatMap((phase) => phase.batches)).toHaveLength(0);
    const harness = createHarness(plan);

    const result = await executeRemoteMigration({
      data,
      gateway: harness.gateway,
      options: { batchSize: 2 },
    });

    expect(result).toMatchObject({
      ok: true,
      checkpoint: { appliedBatchCount: 0, totalBatchCount: 0 },
    });
    expect(harness.state.batchIds).toHaveLength(0);
    expect(harness.state.completeCalls).toBe(1);
  });

  it("no expone password, filas ni data URLs en evidencia persistible", async () => {
    const data = createSeedData();
    data.users[0] = {
      ...data.users[0],
      password: "PASSWORD_SENTINEL",
    };
    data.locals[0] = {
      ...data.locals[0],
      images: [
        ...data.locals[0].images,
        {
          id: "secret-image",
          name: "secret.png",
          dataUrl: "data:image/png;base64,FILE_SENTINEL",
          createdAt: "2026-07-26T12:00:00.000Z",
        },
      ],
    };
    deepFreeze(data);
    const plan = getPlan(data);
    const report = matchingReport(plan) as RemoteMigrationImportReport & {
      leaked?: string;
    };
    report.leaked = "REPORT_SENTINEL";
    let gatewaySawSource = false;
    const harness = createHarness(plan, {
      report,
      importResult: (request) => {
        gatewaySawSource =
          request.data.users[0].password === "PASSWORD_SENTINEL" &&
          request.data.locals[0].images.some(
            (image) => image.dataUrl.includes("FILE_SENTINEL"),
          );
        return { ok: true };
      },
    });
    const progressEvents: RemoteMigrationProgress[] = [];

    const result = await executeRemoteMigration({
      data,
      gateway: harness.gateway,
      options: {
        batchSize: 2,
        onProgress: (event) => progressEvents.push(event),
      },
    });
    const evidence = JSON.stringify({
      result,
      progressEvents,
      completion: harness.state.completeRequests,
    });

    expect(result.ok).toBe(true);
    expect(gatewaySawSource).toBe(true);
    expect(evidence).not.toContain("PASSWORD_SENTINEL");
    expect(evidence).not.toContain("FILE_SENTINEL");
    expect(evidence).not.toContain("REPORT_SENTINEL");
    expect(evidence).not.toContain('"password"');
    expect(evidence).not.toContain('"dataUrl"');
  });
});
