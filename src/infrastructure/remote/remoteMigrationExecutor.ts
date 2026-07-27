import type { AppData } from "../../types";
import {
  createRemoteMigrationPlan,
  digestRemoteMigrationLegacyIds,
  reconcileRemoteMigrationPlan as reconcileRemoteMigrationImport,
} from "./remoteMigrationPlan";
import type { MigrationMappingIssue } from "./appDataMigrationMapping";
import type {
  RemoteMigrationBatch,
  RemoteMigrationImportReport,
  RemoteMigrationPlan,
  RemoteMigrationPlanOptions,
  RemoteMigrationReconciliationIssue,
} from "./remoteMigrationPlan";

type DeepReadonly<Value> = Value extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value;

export type ImmutableAppData = DeepReadonly<AppData>;

export const REMOTE_MIGRATION_EXECUTOR_VERSION = 1 as const;
export const REMOTE_MIGRATION_PLAN_DIGEST_ALGORITHM =
  "sha256-plan-manifest-v1" as const;

export type RemoteMigrationPlanIdentity = {
  readonly kind: "REMOTE_MIGRATION_PLAN_IDENTITY";
  readonly version: typeof REMOTE_MIGRATION_EXECUTOR_VERSION;
  readonly id: string;
  readonly planVersion: RemoteMigrationPlan["version"];
  readonly digestAlgorithm: typeof REMOTE_MIGRATION_PLAN_DIGEST_ALGORITHM;
  readonly digest: string;
  readonly phaseCount: number;
  readonly batchCount: number;
  readonly expectedRowCount: number;
};

export type RemoteMigrationRun = {
  readonly kind: "REMOTE_MIGRATION_RUN";
  readonly version: typeof REMOTE_MIGRATION_EXECUTOR_VERSION;
  readonly id: string;
  readonly status: "OPEN" | "COMPLETED";
  readonly plan: RemoteMigrationPlanIdentity;
  readonly appliedBatchIds: readonly string[];
};

export type RemoteMigrationGatewayFailure = {
  readonly ok: false;
  readonly error: string;
  readonly retryable: boolean;
};

export type RemoteMigrationGatewayResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | RemoteMigrationGatewayFailure;

export type RemoteMigrationGatewayOperationResult =
  | { readonly ok: true }
  | RemoteMigrationGatewayFailure;

export type RemoteMigrationOpenRunRequest = {
  readonly plan: RemoteMigrationPlanIdentity;
  readonly signal?: AbortSignal;
};

export type RemoteMigrationImportBatchRequest = {
  readonly runId: string;
  readonly plan: RemoteMigrationPlanIdentity;
  readonly phaseId: string;
  readonly batch: Readonly<RemoteMigrationBatch>;
  readonly idempotencyKey: string;
  readonly data: ImmutableAppData;
  readonly signal?: AbortSignal;
};

export type RemoteMigrationRunRequest = {
  readonly runId: string;
  readonly plan: RemoteMigrationPlanIdentity;
  readonly signal?: AbortSignal;
};

export type RemoteMigrationCompleteRunRequest = RemoteMigrationRunRequest & {
  readonly report: RemoteMigrationImportReport;
  readonly checkpoint: RemoteMigrationCheckpoint;
};

export interface RemoteMigrationImportGateway {
  openOrResumeRun(
    request: RemoteMigrationOpenRunRequest,
  ): Promise<RemoteMigrationGatewayResult<RemoteMigrationRun>>;
  importBatch(
    request: RemoteMigrationImportBatchRequest,
  ): Promise<RemoteMigrationGatewayOperationResult>;
  getImportReport(
    request: RemoteMigrationRunRequest,
  ): Promise<RemoteMigrationGatewayResult<RemoteMigrationImportReport>>;
  completeRun(
    request: RemoteMigrationCompleteRunRequest,
  ): Promise<RemoteMigrationGatewayOperationResult>;
}

export type RemoteMigrationBatchEvidence = {
  readonly phaseId: string;
  readonly batchId: string;
  readonly idempotencyKey: string;
  readonly expectedRowCount: number;
  readonly expectedDigest: string;
};

export type RemoteMigrationCheckpoint = {
  readonly kind: "REMOTE_MIGRATION_CHECKPOINT";
  readonly version: typeof REMOTE_MIGRATION_EXECUTOR_VERSION;
  readonly runId: string;
  readonly planId: string;
  readonly planDigest: string;
  readonly appliedBatchCount: number;
  readonly totalBatchCount: number;
  readonly appliedExpectedRowCount: number;
  readonly totalExpectedRowCount: number;
  readonly appliedBatches: readonly RemoteMigrationBatchEvidence[];
};

export type RemoteMigrationProgress = {
  readonly kind: "REMOTE_MIGRATION_PROGRESS";
  readonly version: typeof REMOTE_MIGRATION_EXECUTOR_VERSION;
  readonly stage:
    | "PLAN_VALIDATED"
    | "RUN_READY"
    | "BATCH_SKIPPED"
    | "BATCH_STARTED"
    | "BATCH_APPLIED"
    | "RECONCILING"
    | "COMPLETED";
  readonly planId: string;
  readonly planDigest: string;
  readonly runId?: string;
  readonly phaseId?: string;
  readonly batchId?: string;
  readonly appliedBatchCount: number;
  readonly totalBatchCount: number;
};

export type RemoteMigrationExecutionOptions = RemoteMigrationPlanOptions & {
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: RemoteMigrationProgress) => void;
};

export type RemoteMigrationFailureCode =
  | "PLAN_INVALID"
  | "RUN_OPEN_REJECTED"
  | "RUN_INCOMPATIBLE"
  | "BATCH_REJECTED"
  | "REPORT_REJECTED"
  | "RECONCILIATION_FAILED"
  | "COMPLETION_REJECTED"
  | "ABORTED";

export type RemoteMigrationExecutionResult =
  | {
      readonly ok: true;
      readonly status: "COMPLETED";
      readonly plan: RemoteMigrationPlanIdentity;
      readonly checkpoint: RemoteMigrationCheckpoint;
      readonly report: RemoteMigrationImportReport;
    }
  | {
      readonly ok: false;
      readonly status: "BLOCKED" | "RETRYABLE_ERROR" | "ABORTED";
      readonly code: RemoteMigrationFailureCode;
      readonly retryable: boolean;
      readonly error: string;
      readonly plan?: RemoteMigrationPlanIdentity;
      readonly checkpoint?: RemoteMigrationCheckpoint;
      readonly compatibilityIssues?: readonly MigrationMappingIssue[];
      readonly reconciliationIssues?: readonly RemoteMigrationReconciliationIssue[];
    };

export type ExecuteRemoteMigrationRequest = {
  readonly data: ImmutableAppData;
  readonly gateway: RemoteMigrationImportGateway;
  readonly options?: RemoteMigrationExecutionOptions;
};

type OrderedBatch = {
  phaseId: string;
  batch: RemoteMigrationBatch;
};

const FAILURE_MESSAGES: Record<RemoteMigrationFailureCode, string> = {
  PLAN_INVALID: "No se pudo crear un plan remoto valido.",
  RUN_OPEN_REJECTED: "El gateway rechazo la apertura del run remoto.",
  RUN_INCOMPATIBLE: "El run remoto previo no corresponde al plan actual.",
  BATCH_REJECTED: "El gateway rechazo un lote remoto.",
  REPORT_REJECTED: "No se pudo obtener el informe de importacion.",
  RECONCILIATION_FAILED: "La importacion remota no concilia con el plan.",
  COMPLETION_REJECTED: "El gateway rechazo la finalizacion del run.",
  ABORTED: "La migracion remota fue abortada.",
};

const validRunId = (value: string) =>
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(value);

const copyIdentity = (
  identity: RemoteMigrationPlanIdentity,
): RemoteMigrationPlanIdentity => ({ ...identity });

const orderedBatches = (plan: RemoteMigrationPlan): OrderedBatch[] =>
  plan.phases.flatMap((phase) =>
    phase.batches.map((batch) => ({ phaseId: phase.id, batch })),
  );

export function createRemoteMigrationPlanIdentity(
  plan: RemoteMigrationPlan,
): RemoteMigrationPlanIdentity {
  const digest = digestRemoteMigrationLegacyIds([
    JSON.stringify({
      kind: plan.kind,
      version: plan.version,
      digestAlgorithm: plan.digestAlgorithm,
      batchSize: plan.batchSize,
      phases: plan.phases,
      expectedCounts: plan.expectedCounts,
      expectedDigests: plan.expectedDigests,
    }),
  ]);
  const batches = orderedBatches(plan);
  const expectedRowCount = batches.reduce(
    (total, item) => total + item.batch.expectedRowCount,
    0,
  );

  return {
    kind: "REMOTE_MIGRATION_PLAN_IDENTITY",
    version: REMOTE_MIGRATION_EXECUTOR_VERSION,
    id: `remote-migration-plan-v${plan.version}-${digest}`,
    planVersion: plan.version,
    digestAlgorithm: REMOTE_MIGRATION_PLAN_DIGEST_ALGORITHM,
    digest,
    phaseCount: plan.phases.length,
    batchCount: batches.length,
    expectedRowCount,
  };
}

export function createRemoteMigrationBatchIdempotencyKey(
  runId: string,
  phaseId: string,
  batchId: string,
  planDigest: string,
) {
  const digest = digestRemoteMigrationLegacyIds([
    JSON.stringify([runId, phaseId, batchId, planDigest]),
  ]);
  return `remote-migration:v${REMOTE_MIGRATION_EXECUTOR_VERSION}:${digest}`;
}

const identitiesMatch = (
  left: RemoteMigrationPlanIdentity,
  right: RemoteMigrationPlanIdentity,
) =>
  left.kind === right.kind &&
  left.version === right.version &&
  left.id === right.id &&
  left.planVersion === right.planVersion &&
  left.digestAlgorithm === right.digestAlgorithm &&
  left.digest === right.digest &&
  left.phaseCount === right.phaseCount &&
  left.batchCount === right.batchCount &&
  left.expectedRowCount === right.expectedRowCount;

const cloneBatch = (batch: RemoteMigrationBatch): RemoteMigrationBatch => ({
  ...batch,
  legacyIds: [...batch.legacyIds],
});

const batchEvidence = (
  runId: string,
  plan: RemoteMigrationPlanIdentity,
  item: OrderedBatch,
): RemoteMigrationBatchEvidence => ({
  phaseId: item.phaseId,
  batchId: item.batch.id,
  idempotencyKey: createRemoteMigrationBatchIdempotencyKey(
    runId,
    item.phaseId,
    item.batch.id,
    plan.digest,
  ),
  expectedRowCount: item.batch.expectedRowCount,
  expectedDigest: item.batch.expectedDigest,
});

const checkpoint = (
  runId: string,
  plan: RemoteMigrationPlanIdentity,
  evidence: readonly RemoteMigrationBatchEvidence[],
): RemoteMigrationCheckpoint => ({
  kind: "REMOTE_MIGRATION_CHECKPOINT",
  version: REMOTE_MIGRATION_EXECUTOR_VERSION,
  runId,
  planId: plan.id,
  planDigest: plan.digest,
  appliedBatchCount: evidence.length,
  totalBatchCount: plan.batchCount,
  appliedExpectedRowCount: evidence.reduce(
    (total, item) => total + item.expectedRowCount,
    0,
  ),
  totalExpectedRowCount: plan.expectedRowCount,
  appliedBatches: evidence.map((item) => ({ ...item })),
});

const failure = (
  code: RemoteMigrationFailureCode,
  retryable: boolean,
  plan?: RemoteMigrationPlanIdentity,
  currentCheckpoint?: RemoteMigrationCheckpoint,
): Extract<RemoteMigrationExecutionResult, { ok: false }> => ({
  ok: false,
  status: code === "ABORTED" ? "ABORTED" : retryable ? "RETRYABLE_ERROR" : "BLOCKED",
  code,
  retryable,
  error: FAILURE_MESSAGES[code],
  ...(plan ? { plan: copyIdentity(plan) } : {}),
  ...(currentCheckpoint ? { checkpoint: currentCheckpoint } : {}),
});

const emitProgress = (
  callback: RemoteMigrationExecutionOptions["onProgress"],
  progress: RemoteMigrationProgress,
) => {
  try {
    callback?.(progress);
  } catch {
    return;
  }
};

const progress = (
  stage: RemoteMigrationProgress["stage"],
  plan: RemoteMigrationPlanIdentity,
  currentCheckpoint?: RemoteMigrationCheckpoint,
  item?: RemoteMigrationBatchEvidence,
): RemoteMigrationProgress => ({
  kind: "REMOTE_MIGRATION_PROGRESS",
  version: REMOTE_MIGRATION_EXECUTOR_VERSION,
  stage,
  planId: plan.id,
  planDigest: plan.digest,
  ...(currentCheckpoint ? { runId: currentCheckpoint.runId } : {}),
  ...(item ? { phaseId: item.phaseId, batchId: item.batchId } : {}),
  appliedBatchCount: currentCheckpoint?.appliedBatchCount ?? 0,
  totalBatchCount: plan.batchCount,
});

const safeReport = (
  plan: RemoteMigrationPlan,
  value: unknown,
): RemoteMigrationImportReport => {
  const root =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const counts =
    root.counts && typeof root.counts === "object"
      ? (root.counts as Record<string, unknown>)
      : {};
  const digests =
    root.digests && typeof root.digests === "object"
      ? (root.digests as Record<string, unknown>)
      : {};

  const copyMetrics = (
    source: unknown,
    targets: readonly string[],
    accept: (metric: unknown) => metric is number | string,
  ) => {
    const record =
      source && typeof source === "object"
        ? (source as Record<string, unknown>)
        : {};
    return Object.fromEntries(
      targets.flatMap((target) =>
        accept(record[target]) ? [[target, record[target]]] : [],
      ),
    );
  };
  const count = (metric: unknown): metric is number =>
    typeof metric === "number" &&
    Number.isSafeInteger(metric) &&
    metric >= 0;
  const digest = (metric: unknown): metric is string =>
    typeof metric === "string" && /^[0-9a-f]{64}$/.test(metric);
  const collectionTargets = Object.keys(plan.expectedCounts.collections);
  const tableTargets = Object.keys(plan.expectedCounts.tables);

  return {
    counts: {
      collections: copyMetrics(
        counts.collections,
        collectionTargets,
        count,
      ),
      tables: copyMetrics(counts.tables, tableTargets, count),
    },
    digests: {
      collections: copyMetrics(
        digests.collections,
        collectionTargets,
        digest,
      ),
      tables: copyMetrics(digests.tables, tableTargets, digest),
    },
  } as RemoteMigrationImportReport;
};

const priorBatchCount = (
  run: RemoteMigrationRun,
  batches: readonly OrderedBatch[],
) => {
  const unique = new Set(run.appliedBatchIds);
  if (unique.size !== run.appliedBatchIds.length) return null;
  if ([...unique].some((id) => !batches.some((item) => item.batch.id === id))) {
    return null;
  }
  for (let index = 0; index < unique.size; index += 1) {
    if (!unique.has(batches[index].batch.id)) return null;
  }
  if (run.status === "COMPLETED" && unique.size !== batches.length) return null;
  return unique.size;
};

export async function executeRemoteMigration({
  data,
  gateway,
  options = {},
}: ExecuteRemoteMigrationRequest): Promise<RemoteMigrationExecutionResult> {
  let planResult;
  try {
    planResult = createRemoteMigrationPlan(data as AppData, {
      batchSize: options.batchSize,
    });
  } catch {
    return failure("PLAN_INVALID", false);
  }
  if (!planResult.ok) {
    return {
      ...failure("PLAN_INVALID", false),
      compatibilityIssues: planResult.issues.map((issue) => ({ ...issue })),
    };
  }

  const plan = planResult.plan;
  const identity = createRemoteMigrationPlanIdentity(plan);
  const batches = orderedBatches(plan);
  emitProgress(options.onProgress, progress("PLAN_VALIDATED", identity));
  if (options.signal?.aborted) return failure("ABORTED", true, identity);

  let openResult: RemoteMigrationGatewayResult<RemoteMigrationRun>;
  try {
    openResult = await gateway.openOrResumeRun({
      plan: copyIdentity(identity),
      signal: options.signal,
    });
  } catch {
    return options.signal?.aborted
      ? failure("ABORTED", true, identity)
      : failure("RUN_OPEN_REJECTED", true, identity);
  }
  if (!openResult.ok) {
    return options.signal?.aborted
      ? failure("ABORTED", true, identity)
      : failure("RUN_OPEN_REJECTED", openResult.retryable, identity);
  }

  const run = openResult.value;
  const resumedCount =
    run.kind === "REMOTE_MIGRATION_RUN" &&
    run.version === REMOTE_MIGRATION_EXECUTOR_VERSION &&
    validRunId(run.id) &&
    identitiesMatch(run.plan, identity)
      ? priorBatchCount(run, batches)
      : null;
  if (resumedCount === null) return failure("RUN_INCOMPATIBLE", false, identity);

  let evidence = batches
    .slice(0, resumedCount)
    .map((item) => batchEvidence(run.id, identity, item));
  let currentCheckpoint = checkpoint(run.id, identity, evidence);
  emitProgress(
    options.onProgress,
    progress("RUN_READY", identity, currentCheckpoint),
  );

  for (const item of evidence) {
    emitProgress(
      options.onProgress,
      progress("BATCH_SKIPPED", identity, currentCheckpoint, item),
    );
  }

  if (options.signal?.aborted) {
    return failure("ABORTED", true, identity, currentCheckpoint);
  }

  if (run.status === "OPEN") {
    for (const item of batches.slice(resumedCount)) {
      const nextEvidence = batchEvidence(run.id, identity, item);
      emitProgress(
        options.onProgress,
        progress("BATCH_STARTED", identity, currentCheckpoint, nextEvidence),
      );
      if (options.signal?.aborted) {
        return failure("ABORTED", true, identity, currentCheckpoint);
      }

      let batchResult: RemoteMigrationGatewayOperationResult;
      try {
        batchResult = await gateway.importBatch({
          runId: run.id,
          plan: copyIdentity(identity),
          phaseId: item.phaseId,
          batch: cloneBatch(item.batch),
          idempotencyKey: nextEvidence.idempotencyKey,
          data,
          signal: options.signal,
        });
      } catch {
        return options.signal?.aborted
          ? failure("ABORTED", true, identity, currentCheckpoint)
          : failure("BATCH_REJECTED", true, identity, currentCheckpoint);
      }
      if (!batchResult.ok) {
        return options.signal?.aborted
          ? failure("ABORTED", true, identity, currentCheckpoint)
          : failure(
              "BATCH_REJECTED",
              batchResult.retryable,
              identity,
              currentCheckpoint,
            );
      }

      evidence = [...evidence, nextEvidence];
      currentCheckpoint = checkpoint(run.id, identity, evidence);
      emitProgress(
        options.onProgress,
        progress("BATCH_APPLIED", identity, currentCheckpoint, nextEvidence),
      );
      if (options.signal?.aborted) {
        return failure("ABORTED", true, identity, currentCheckpoint);
      }
    }
  }

  emitProgress(
    options.onProgress,
    progress("RECONCILING", identity, currentCheckpoint),
  );
  if (options.signal?.aborted) {
    return failure("ABORTED", true, identity, currentCheckpoint);
  }

  let reportResult: RemoteMigrationGatewayResult<RemoteMigrationImportReport>;
  try {
    reportResult = await gateway.getImportReport({
      runId: run.id,
      plan: copyIdentity(identity),
      signal: options.signal,
    });
  } catch {
    return options.signal?.aborted
      ? failure("ABORTED", true, identity, currentCheckpoint)
      : failure("REPORT_REJECTED", true, identity, currentCheckpoint);
  }
  if (!reportResult.ok) {
    return options.signal?.aborted
      ? failure("ABORTED", true, identity, currentCheckpoint)
      : failure(
          "REPORT_REJECTED",
          reportResult.retryable,
          identity,
          currentCheckpoint,
        );
  }

  const report = safeReport(plan, reportResult.value);
  const reconciliation = reconcileRemoteMigrationImport(plan, report);
  if (!reconciliation.ok) {
    return {
      ...failure("RECONCILIATION_FAILED", false, identity, currentCheckpoint),
      reconciliationIssues: reconciliation.issues.map((issue) => ({ ...issue })),
    };
  }
  if (options.signal?.aborted) {
    return failure("ABORTED", true, identity, currentCheckpoint);
  }

  if (run.status !== "COMPLETED") {
    let completionResult: RemoteMigrationGatewayOperationResult;
    try {
      completionResult = await gateway.completeRun({
        runId: run.id,
        plan: copyIdentity(identity),
        report: safeReport(plan, report),
        checkpoint: checkpoint(run.id, identity, evidence),
        signal: options.signal,
      });
    } catch {
      return options.signal?.aborted
        ? failure("ABORTED", true, identity, currentCheckpoint)
        : failure("COMPLETION_REJECTED", true, identity, currentCheckpoint);
    }
    if (!completionResult.ok) {
      return options.signal?.aborted
        ? failure("ABORTED", true, identity, currentCheckpoint)
        : failure(
            "COMPLETION_REJECTED",
            completionResult.retryable,
            identity,
            currentCheckpoint,
          );
    }
  }

  currentCheckpoint = checkpoint(run.id, identity, evidence);
  emitProgress(
    options.onProgress,
    progress("COMPLETED", identity, currentCheckpoint),
  );
  return {
    ok: true,
    status: "COMPLETED",
    plan: copyIdentity(identity),
    checkpoint: currentCheckpoint,
    report: safeReport(plan, report),
  };
}
