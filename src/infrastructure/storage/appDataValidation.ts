import type { AppData } from "../../types";
import { WORKSHOP_LOCAL_ID } from "../../data/appDataIds";
import { appDataSchema } from "./appDataSchemas";

export type AppDataValidationIssue = {
  path: string;
  code: "STRUCTURE" | "DUPLICATE_ID" | "MISSING_REFERENCE" | "INVARIANT";
  message: string;
};

export type AppDataValidationResult =
  | { ok: true; data: AppData }
  | { ok: false; issues: AppDataValidationIssue[]; error: string };

const MAX_REPORTED_ISSUES = 12;
const SYSTEM_USER_ID = "system";

function pathLabel(path: PropertyKey[]) {
  if (!path.length) return "data";
  return path.reduce<string>((current, segment) => {
    if (typeof segment === "number") return `${current}[${segment}]`;
    return current ? `${current}.${String(segment)}` : String(segment);
  }, "");
}

function issueSummary(issues: AppDataValidationIssue[]) {
  const visible = issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("; ");
  const remaining = issues.length - MAX_REPORTED_ISSUES;
  return `El snapshot de Poseidon contiene ${issues.length} error(es). ${visible}${
    remaining > 0 ? `; y ${remaining} error(es) adicional(es).` : ""
  }`;
}

function structureIssues(value: unknown): AppDataValidationIssue[] {
  const parsed = appDataSchema.safeParse(value);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    path: pathLabel(issue.path),
    code: "STRUCTURE",
    message: issue.code === "unrecognized_keys"
      ? `Campos no reconocidos: ${issue.keys.join(", ")}.`
      : issue.code === "invalid_value"
        ? "Valor fuera del conjunto permitido."
        : issue.code === "invalid_type"
          ? `Tipo invalido; se esperaba ${issue.expected}.`
          : issue.message,
  }));
}

function addDuplicateIds<T extends { id: string }>(
  issues: AppDataValidationIssue[],
  collection: string,
  items: T[],
) {
  const indexesById = new Map<string, number[]>();
  items.forEach((item, index) => {
    const indexes = indexesById.get(item.id) ?? [];
    indexes.push(index);
    indexesById.set(item.id, indexes);
  });
  indexesById.forEach((indexes, duplicateId) => {
    if (indexes.length < 2) return;
    indexes.forEach((index) => {
      issues.push({
        path: `${collection}[${index}].id`,
        code: "DUPLICATE_ID",
        message: `El ID ${duplicateId} esta repetido en ${collection}.`,
      });
    });
  });
}

function addDuplicateValues(
  issues: AppDataValidationIssue[],
  collection: string,
  field: string,
  values: Array<string | undefined>,
) {
  const indexesByValue = new Map<string, number[]>();
  values.forEach((value, index) => {
    if (!value) return;
    const indexes = indexesByValue.get(value) ?? [];
    indexes.push(index);
    indexesByValue.set(value, indexes);
  });
  indexesByValue.forEach((indexes, duplicateValue) => {
    if (indexes.length < 2) return;
    indexes.forEach((index) => {
      issues.push({
        path: `${collection}[${index}].${field}`,
        code: "INVARIANT",
        message: `El valor ${duplicateValue} esta repetido.`,
      });
    });
  });
}

function requireReference(
  issues: AppDataValidationIssue[],
  path: string,
  value: string | undefined,
  targetIds: Set<string>,
  targetLabel: string,
  allowedValues: string[] = [],
) {
  if (!value || targetIds.has(value) || allowedValues.includes(value)) return;
  issues.push({
    path,
    code: "MISSING_REFERENCE",
    message: `Referencia ${value} inexistente en ${targetLabel}.`,
  });
}

function referenceIssues(data: AppData): AppDataValidationIssue[] {
  const issues: AppDataValidationIssue[] = [];

  addDuplicateIds(issues, "users", data.users);
  addDuplicateIds(issues, "staff", data.staff);
  addDuplicateIds(issues, "salarySettlements", data.salarySettlements);
  addDuplicateIds(issues, "salaryHistories", data.salaryHistories);
  addDuplicateIds(issues, "salaryClosures", data.salaryClosures);
  addDuplicateIds(issues, "clients", data.clients);
  addDuplicateIds(issues, "periodicClosures", data.periodicClosures);
  addDuplicateIds(issues, "currentAccounts", data.currentAccounts);
  addDuplicateIds(issues, "accountMovements", data.accountMovements);
  addDuplicateIds(issues, "capitalMovements", data.capitalMovements);
  addDuplicateIds(issues, "treasuryTransfers", data.treasuryTransfers);
  addDuplicateIds(issues, "partnerMovements", data.partnerMovements);
  addDuplicateIds(issues, "locals", data.locals);
  addDuplicateIds(issues, "machines", data.machines);
  addDuplicateIds(issues, "balances", data.balances);
  addDuplicateIds(issues, "readings", data.readings);
  addDuplicateIds(issues, "expenseCategories", data.expenseCategories);
  addDuplicateIds(issues, "expenses", data.expenses);
  addDuplicateIds(issues, "transfers", data.transfers);
  addDuplicateIds(issues, "gifts", data.gifts);
  addDuplicateIds(issues, "audit", data.audit);
  addDuplicateIds(issues, "machineLocalHistory", data.machineLocalHistory);

  addDuplicateValues(issues, "users", "username", data.users.map((user) => user.username.toLowerCase()));
  addDuplicateValues(issues, "machines", "visibleId", data.machines.map((machine) => machine.visibleId));
  addDuplicateValues(issues, "balances", "visibleId", data.balances.map((balance) => balance.visibleId));

  const userIds = new Set(data.users.map((item) => item.id));
  const localIds = new Set(data.locals.map((item) => item.id));
  const staffIds = new Set(data.staff.map((item) => item.id));
  const clientIds = new Set(data.clients.map((item) => item.id));
  const machineIds = new Set(data.machines.map((item) => item.id));
  const balanceIds = new Set(data.balances.map((item) => item.id));
  const accountIds = new Set(data.currentAccounts.map((item) => item.id));
  const accountMovementIds = new Set(data.accountMovements.map((item) => item.id));
  const expenseIds = new Set(data.expenses.map((item) => item.id));
  const settlementIds = new Set(data.salarySettlements.map((item) => item.id));
  const salaryClosureIds = new Set(data.salaryClosures.map((item) => item.id));
  const treasuryTransferIds = new Set(data.treasuryTransfers.map((item) => item.id));
  const partnerMovementIds = new Set(data.partnerMovements.map((item) => item.id));
  const transferIds = new Set(data.transfers.map((item) => item.id));
  const giftIds = new Set(data.gifts.map((item) => item.id));
  const capitalMovementIds = new Set(data.capitalMovements.map((item) => item.id));
  const deletedMachineIds = new Set(
    data.machineLocalHistory
      .filter((event) => event.action === "QUITADA")
      .map((event) => event.machineId),
  );
  const balanceById = new Map(data.balances.map((item) => [item.id, item]));
  const expenseById = new Map(data.expenses.map((item) => [item.id, item]));
  const settlementById = new Map(data.salarySettlements.map((item) => [item.id, item]));
  const treasuryTransferById = new Map(data.treasuryTransfers.map((item) => [item.id, item]));
  const partnerMovementById = new Map(data.partnerMovements.map((item) => [item.id, item]));

  const requireUser = (path: string, value: string | undefined) =>
    requireReference(issues, path, value, userIds, "users", [SYSTEM_USER_ID]);
  const requireLocal = (path: string, value: string | undefined, allowWorkshop = false) =>
    requireReference(issues, path, value, localIds, "locals", allowWorkshop ? [WORKSHOP_LOCAL_ID] : []);
  const requireBalance = (path: string, value: string | undefined) =>
    requireReference(issues, path, value, balanceIds, "balances");
  const requireBalanceLocal = (path: string, balanceId: string | undefined, localId: string | undefined) => {
    if (!balanceId || !localId) return;
    const balance = balanceById.get(balanceId);
    if (!balance || balance.localId === localId) return;
    issues.push({
      path,
      code: "INVARIANT",
      message: `La caja ${balanceId} pertenece al local ${balance.localId}, no al local ${localId}.`,
    });
  };

  data.users.forEach((user, index) => {
    user.localIds.forEach((localId, localIndex) => requireLocal(`users[${index}].localIds[${localIndex}]`, localId));
  });

  data.staff.forEach((staff, index) => requireLocal(`staff[${index}].localId`, staff.localId));
  data.clients.forEach((client, index) => requireLocal(`clients[${index}].localId`, client.localId));

  data.currentAccounts.forEach((account, index) => {
    if (account.kind === "PERSONAL") {
      if (!account.entityId) {
        issues.push({
          path: `currentAccounts[${index}].entityId`,
          code: "INVARIANT",
          message: "Una cuenta personal debe identificar al empleado.",
        });
      } else {
        requireReference(issues, `currentAccounts[${index}].entityId`, account.entityId, staffIds, "staff");
      }
    }
    if (account.kind === "LOCAL_EFECTIVO" || account.kind === "LOCAL_BANCO") {
      if (!account.entityId) {
        issues.push({
          path: `currentAccounts[${index}].entityId`,
          code: "INVARIANT",
          message: "Una cuenta de Caja debe identificar al local.",
        });
      } else {
        requireLocal(`currentAccounts[${index}].entityId`, account.entityId);
      }
    }
    if (account.kind === "SOCIO" && !["MATHIAS", "RICARDO"].includes(account.entityId ?? "")) {
      issues.push({
        path: `currentAccounts[${index}].entityId`,
        code: "INVARIANT",
        message: "Una cuenta de socio debe pertenecer a MATHIAS o RICARDO.",
      });
    }
  });

  data.machines.forEach((machine, index) => requireLocal(`machines[${index}].localId`, machine.localId, true));

  const openBalanceByLocal = new Map<string, number>();
  data.balances.forEach((balance, index) => {
    requireLocal(`balances[${index}].localId`, balance.localId);
    requireUser(`balances[${index}].openedBy`, balance.openedBy);
    requireUser(`balances[${index}].closedBy`, balance.closedBy);
    requireUser(`balances[${index}].differenceReviewedBy`, balance.differenceReviewedBy);
    if (balance.status === "EN_PROCESO") {
      const prior = openBalanceByLocal.get(balance.localId);
      if (prior !== undefined) {
        issues.push({
          path: `balances[${index}].status`,
          code: "INVARIANT",
          message: `Existe otra caja abierta para el mismo local en balances[${prior}].`,
        });
      } else {
        openBalanceByLocal.set(balance.localId, index);
      }
    }
  });

  const readingKeys = new Map<string, number>();
  data.readings.forEach((reading, index) => {
    requireBalance(`readings[${index}].balanceId`, reading.balanceId);
    requireReference(issues, `readings[${index}].machineId`, reading.machineId, machineIds, "machines");
    requireUser(`readings[${index}].updatedBy`, reading.updatedBy);
    const key = `${reading.balanceId}::${reading.machineId}`;
    const prior = readingKeys.get(key);
    if (prior !== undefined) {
      issues.push({
        path: `readings[${index}]`,
        code: "INVARIANT",
        message: `Lectura duplicada para la misma caja y maquina; tambien aparece en readings[${prior}].`,
      });
    } else {
      readingKeys.set(key, index);
    }
  });

  data.salarySettlements.forEach((settlement, index) => {
    requireReference(issues, `salarySettlements[${index}].staffId`, settlement.staffId, staffIds, "staff");
    requireLocal(`salarySettlements[${index}].localId`, settlement.localId);
    requireBalance(`salarySettlements[${index}].balanceId`, settlement.balanceId);
    requireReference(
      issues,
      `salarySettlements[${index}].paymentAccountId`,
      settlement.paymentAccountId,
      accountIds,
      "currentAccounts",
    );
    requireUser(`salarySettlements[${index}].createdBy`, settlement.createdBy);
    requireUser(`salarySettlements[${index}].approvedBy`, settlement.approvedBy);
    requireUser(`salarySettlements[${index}].annulledBy`, settlement.annulledBy);
    requireReference(
      issues,
      `salarySettlements[${index}].correctionClosureId`,
      settlement.correctionClosureId,
      salaryClosureIds,
      "salaryClosures",
    );
    requireReference(
      issues,
      `salarySettlements[${index}].annulledInCorrectionClosureId`,
      settlement.annulledInCorrectionClosureId,
      salaryClosureIds,
      "salaryClosures",
    );
    requireBalanceLocal(`salarySettlements[${index}].balanceId`, settlement.balanceId, settlement.localId);
  });

  data.salaryHistories.forEach((history, index) => {
    requireReference(issues, `salaryHistories[${index}].staffId`, history.staffId, staffIds, "staff");
    requireLocal(`salaryHistories[${index}].localId`, history.localId);
    requireUser(`salaryHistories[${index}].userId`, history.userId);
  });

  data.salaryClosures.forEach((closure, index) => {
    requireReference(issues, `salaryClosures[${index}].parentClosureId`, closure.parentClosureId, salaryClosureIds, "salaryClosures");
    requireUser(`salaryClosures[${index}].createdBy`, closure.createdBy);
    requireUser(`salaryClosures[${index}].closedBy`, closure.closedBy);
    closure.settlementIds.forEach((settlementId, settlementIndex) =>
      requireReference(
        issues,
        `salaryClosures[${index}].settlementIds[${settlementIndex}]`,
        settlementId,
        settlementIds,
        "salarySettlements",
      ),
    );
    closure.employeeSnapshots.forEach((employee, employeeIndex) => {
      requireReference(
        issues,
        `salaryClosures[${index}].employeeSnapshots[${employeeIndex}].staffId`,
        employee.staffId,
        staffIds,
        "staff",
      );
      requireLocal(`salaryClosures[${index}].employeeSnapshots[${employeeIndex}].localId`, employee.localId);
      employee.settlementIds.forEach((settlementId, settlementIndex) =>
        requireReference(
          issues,
          `salaryClosures[${index}].employeeSnapshots[${employeeIndex}].settlementIds[${settlementIndex}]`,
          settlementId,
          settlementIds,
          "salarySettlements",
        ),
      );
      employee.settlements.forEach((settlement, settlementIndex) =>
        requireReference(
          issues,
          `salaryClosures[${index}].employeeSnapshots[${employeeIndex}].settlements[${settlementIndex}].id`,
          settlement.id,
          settlementIds,
          "salarySettlements",
        ),
      );
      employee.settlementIds.forEach((settlementId, settlementIndex) => {
        const settlement = settlementById.get(settlementId);
        if (!settlement || settlement.staffId === employee.staffId) return;
        issues.push({
          path: `salaryClosures[${index}].employeeSnapshots[${employeeIndex}].settlementIds[${settlementIndex}]`,
          code: "INVARIANT",
          message: `La liquidacion ${settlementId} pertenece a otro empleado.`,
        });
      });
    });
  });

  data.expenses.forEach((expense, index) => {
    requireLocal(`expenses[${index}].localId`, expense.localId);
    requireBalance(`expenses[${index}].balanceId`, expense.balanceId);
    requireReference(issues, `expenses[${index}].paymentAccountId`, expense.paymentAccountId, accountIds, "currentAccounts");
    requireUser(`expenses[${index}].userId`, expense.userId);
    requireUser(`expenses[${index}].reviewedBy`, expense.reviewedBy);
    requireBalanceLocal(`expenses[${index}].balanceId`, expense.balanceId, expense.localId);
  });

  data.transfers.forEach((transfer, index) => {
    requireBalance(`transfers[${index}].balanceId`, transfer.balanceId);
    requireReference(issues, `transfers[${index}].clientId`, transfer.clientId, clientIds, "clients");
    requireUser(`transfers[${index}].userId`, transfer.userId);
  });

  data.gifts.forEach((gift, index) => {
    requireBalance(`gifts[${index}].balanceId`, gift.balanceId);
    requireReference(issues, `gifts[${index}].clientId`, gift.clientId, clientIds, "clients");
    gift.clientIds?.forEach((clientId, clientIndex) =>
      requireReference(issues, `gifts[${index}].clientIds[${clientIndex}]`, clientId, clientIds, "clients"),
    );
    requireUser(`gifts[${index}].userId`, gift.userId);
  });

  data.capitalMovements.forEach((movement, index) => {
    requireBalance(`capitalMovements[${index}].balanceId`, movement.balanceId);
    requireLocal(`capitalMovements[${index}].localId`, movement.localId);
    requireUser(`capitalMovements[${index}].userId`, movement.userId);
    requireBalanceLocal(`capitalMovements[${index}].balanceId`, movement.balanceId, movement.localId);
  });

  data.treasuryTransfers.forEach((transfer, index) => {
    requireBalance(`treasuryTransfers[${index}].balanceId`, transfer.balanceId);
    requireLocal(`treasuryTransfers[${index}].localId`, transfer.localId);
    requireUser(`treasuryTransfers[${index}].userId`, transfer.userId);
    requireBalanceLocal(`treasuryTransfers[${index}].balanceId`, transfer.balanceId, transfer.localId);
  });

  data.partnerMovements.forEach((movement, index) => {
    requireBalance(`partnerMovements[${index}].balanceId`, movement.balanceId);
    requireLocal(`partnerMovements[${index}].localId`, movement.localId);
    requireUser(`partnerMovements[${index}].userId`, movement.userId);
    requireBalanceLocal(`partnerMovements[${index}].balanceId`, movement.balanceId, movement.localId);
  });

  data.accountMovements.forEach((movement, index) => {
    requireReference(issues, `accountMovements[${index}].accountId`, movement.accountId, accountIds, "currentAccounts");
    requireLocal(`accountMovements[${index}].localId`, movement.localId);
    requireBalance(`accountMovements[${index}].balanceId`, movement.balanceId);
    requireUser(`accountMovements[${index}].userId`, movement.userId);
    requireReference(
      issues,
      `accountMovements[${index}].reversalOf`,
      movement.reversalOf,
      accountMovementIds,
      "accountMovements",
    );
    requireReference(
      issues,
      `accountMovements[${index}].previousAdjustmentId`,
      movement.previousAdjustmentId,
      accountMovementIds,
      "accountMovements",
    );
    requireBalanceLocal(`accountMovements[${index}].balanceId`, movement.balanceId, movement.localId);
    if (movement.sourceType === "GASTO") {
      requireReference(issues, `accountMovements[${index}].sourceId`, movement.sourceId, expenseIds, "expenses");
    } else if (movement.sourceType === "SUELDO") {
      requireReference(
        issues,
        `accountMovements[${index}].sourceId`,
        movement.sourceId,
        settlementIds,
        "salarySettlements",
      );
    } else if (movement.sourceType === "REGALO") {
      requireReference(issues, `accountMovements[${index}].sourceId`, movement.sourceId, giftIds, "gifts");
    } else if (movement.sourceType === "TRANSFERENCIA") {
      requireReference(issues, `accountMovements[${index}].sourceId`, movement.sourceId, transferIds, "transfers");
    } else if (movement.sourceType === "TRASPASO_CAJA") {
      requireReference(
        issues,
        `accountMovements[${index}].sourceId`,
        movement.sourceId,
        treasuryTransferIds,
        "treasuryTransfers",
      );
    } else if (movement.sourceType === "APORTE_SOCIO" || movement.sourceType === "RETIRO_SOCIO") {
      requireReference(
        issues,
        `accountMovements[${index}].sourceId`,
        movement.sourceId,
        partnerMovementIds,
        "partnerMovements",
      );
    } else if (movement.sourceType === "RESULTADO_MAQUINAS") {
      requireReference(issues, `accountMovements[${index}].sourceId`, movement.sourceId, balanceIds, "balances");
    } else if (movement.sourceType === "APORTE" || movement.sourceType === "RETIRO") {
      requireReference(
        issues,
        `accountMovements[${index}].sourceId`,
        movement.sourceId,
        capitalMovementIds,
        "capitalMovements",
      );
    }
  });

  data.periodicClosures.forEach((closure, index) => {
    requireLocal(`periodicClosures[${index}].localId`, closure.localId);
    requireUser(`periodicClosures[${index}].createdBy`, closure.createdBy);
    closure.balanceIds.forEach((balanceId, referenceIndex) =>
      {
        requireBalance(`periodicClosures[${index}].balanceIds[${referenceIndex}]`, balanceId);
        requireBalanceLocal(`periodicClosures[${index}].balanceIds[${referenceIndex}]`, balanceId, closure.localId);
      },
    );
    closure.principalExpenseIds.forEach((expenseId, referenceIndex) =>
      requireReference(
        issues,
        `periodicClosures[${index}].principalExpenseIds[${referenceIndex}]`,
        expenseId,
        expenseIds,
        "expenses",
      ),
    );
    closure.principalSalarySettlementIds.forEach((settlementId, referenceIndex) =>
      requireReference(
        issues,
        `periodicClosures[${index}].principalSalarySettlementIds[${referenceIndex}]`,
        settlementId,
        settlementIds,
        "salarySettlements",
      ),
    );
    closure.treasuryTransferIds.forEach((transferId, referenceIndex) =>
      requireReference(
        issues,
        `periodicClosures[${index}].treasuryTransferIds[${referenceIndex}]`,
        transferId,
        treasuryTransferIds,
        "treasuryTransfers",
      ),
    );
    closure.partnerMovementIds.forEach((movementId, referenceIndex) =>
      requireReference(
        issues,
        `periodicClosures[${index}].partnerMovementIds[${referenceIndex}]`,
        movementId,
        partnerMovementIds,
        "partnerMovements",
      ),
    );
    closure.principalExpenseIds.forEach((expenseId, referenceIndex) => {
      const expense = expenseById.get(expenseId);
      if (!expense || expense.localId === closure.localId) return;
      issues.push({
        path: `periodicClosures[${index}].principalExpenseIds[${referenceIndex}]`,
        code: "INVARIANT",
        message: `El gasto ${expenseId} pertenece a otro local.`,
      });
    });
    closure.principalSalarySettlementIds.forEach((settlementId, referenceIndex) => {
      const settlement = settlementById.get(settlementId);
      if (!settlement || settlement.localId === closure.localId) return;
      issues.push({
        path: `periodicClosures[${index}].principalSalarySettlementIds[${referenceIndex}]`,
        code: "INVARIANT",
        message: `La liquidacion ${settlementId} pertenece a otro local.`,
      });
    });
    closure.treasuryTransferIds.forEach((transferId, referenceIndex) => {
      const transfer = treasuryTransferById.get(transferId);
      if (!transfer || transfer.localId === closure.localId) return;
      issues.push({
        path: `periodicClosures[${index}].treasuryTransferIds[${referenceIndex}]`,
        code: "INVARIANT",
        message: `El traspaso ${transferId} pertenece a otro local.`,
      });
    });
    closure.partnerMovementIds.forEach((movementId, referenceIndex) => {
      const movement = partnerMovementById.get(movementId);
      if (!movement || movement.localId === closure.localId) return;
      issues.push({
        path: `periodicClosures[${index}].partnerMovementIds[${referenceIndex}]`,
        code: "INVARIANT",
        message: `El movimiento ${movementId} pertenece a otro local.`,
      });
    });
  });

  data.audit.forEach((event, index) => {
    requireUser(`audit[${index}].userId`, event.userId);
    // Local IDs in audit are immutable scope snapshots. They may reference the
    // virtual workshop or a local that was removed after the event was created.
  });

  data.machineLocalHistory.forEach((event, index) => {
    requireLocal(`machineLocalHistory[${index}].localId`, event.localId, true);
    requireUser(`machineLocalHistory[${index}].userId`, event.userId);
    if (!deletedMachineIds.has(event.machineId)) {
      requireReference(issues, `machineLocalHistory[${index}].machineId`, event.machineId, machineIds, "machines");
    }
  });

  return issues;
}

export function validateAppData(value: unknown): AppDataValidationResult {
  const shape = structureIssues(value);
  if (shape.length) return { ok: false, issues: shape, error: issueSummary(shape) };
  const data = value as AppData;
  const references = referenceIssues(data);
  if (references.length) return { ok: false, issues: references, error: issueSummary(references) };
  return { ok: true, data };
}

export function assertValidAppData(value: unknown): AppData {
  const result = validateAppData(value);
  if (!result.ok) throw new AppDataValidationError(result.error, result.issues);
  return result.data;
}

export class AppDataValidationError extends Error {
  constructor(message: string, readonly issues: AppDataValidationIssue[]) {
    super(message);
    this.name = "AppDataValidationError";
  }
}
