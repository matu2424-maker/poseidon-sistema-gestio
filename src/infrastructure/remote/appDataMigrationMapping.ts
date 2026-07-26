import type {
  AppData,
  Balance,
  Local,
  SalaryHistory,
  SalarySettlement,
} from "../../types";

export type RemoteStaffPosition =
  | "CAJERO_A"
  | "ENCARGADO_A"
  | "MANTENIMIENTO"
  | "LIMPIEZA";

export const remoteTablesByAppDataCollection = {
  users: ["profiles", "user_locals"],
  staff: ["staff", "staff_schedules"],
  salarySettlements: ["salary_settlements"],
  salaryHistories: ["salary_history"],
  salaryClosures: [
    "salary_closures",
    "salary_closure_locals",
    "salary_closure_employee_snapshots",
    "salary_closure_settlement_snapshots",
  ],
  clients: ["clients", "attachments"],
  periodicClosures: [
    "periodic_closures",
    "periodic_closure_balances",
    "periodic_closure_expenses",
    "periodic_closure_salary_settlements",
    "periodic_closure_treasury_transfers",
    "periodic_closure_partner_movements",
  ],
  currentAccounts: ["current_accounts"],
  accountMovements: ["account_movements"],
  capitalMovements: ["capital_movements"],
  treasuryTransfers: ["treasury_transfers"],
  partnerMovements: ["partner_movements"],
  locals: ["locals", "attachments"],
  machines: ["machines"],
  balances: ["cash_balances"],
  readings: ["machine_readings"],
  expenseCategories: ["expense_categories", "expense_subcategories"],
  expenses: ["expenses", "attachments"],
  transfers: ["transfers"],
  gifts: ["gifts", "gift_clients"],
  audit: ["audit_events", "audit_event_locals"],
  machineLocalHistory: ["machine_history"],
} as const satisfies Record<keyof AppData, readonly string[]>;

export type MigrationMappingIssue = {
  path: string;
  message: string;
};

const normalizedPosition = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();

export function mapStaffPosition(value: string): RemoteStaffPosition | null {
  switch (normalizedPosition(value)) {
    case "CAJERO":
    case "CAJERA":
    case "CAJERA/O":
    case "CAJERO/A":
      return "CAJERO_A";
    case "ENCARGADO":
    case "ENCARGADA":
    case "ENCARGADO/A":
    case "ENCARGADA/O":
      return "ENCARGADO_A";
    case "MANTENIMIENTO":
      return "MANTENIMIENTO";
    case "LIMPIEZA":
      return "LIMPIEZA";
    default:
      return null;
  }
}

export function mapLocalIdentity(local: Local) {
  if (!/^[0-9]{1,9}$/.test(local.id)) {
    return {
      ok: false as const,
      error: `El local ${local.id} no tiene un ID corto numerico compatible.`,
    };
  }
  return {
    ok: true as const,
    value: { legacyId: local.id, visibleId: local.id },
  };
}

export function mapSalaryHistoryActor(history: SalaryHistory) {
  return {
    changedByLegacyId: history.userId,
    changedByNameSnapshot: history.userName,
  };
}

export function resolveSalaryPaymentAccount(
  data: Pick<AppData, "accountMovements" | "currentAccounts">,
  settlement: SalarySettlement,
) {
  const monetaryKinds = new Set([
    "LOCAL_EFECTIVO",
    "LOCAL_BANCO",
    "PRINCIPAL_EFECTIVO",
    "PRINCIPAL_BANCO",
  ]);
  if (
    settlement.paymentAccountId &&
    data.currentAccounts.some(
      (account) =>
        account.id === settlement.paymentAccountId && monetaryKinds.has(account.kind),
    )
  ) {
    return {
      paymentAccountId: settlement.paymentAccountId,
      source: "SETTLEMENT" as const,
    };
  }

  const candidateIds = new Set(
    data.accountMovements
      .filter(
        (movement) =>
          movement.sourceType === "SUELDO" &&
          movement.sourceId === settlement.id &&
          movement.direction === "SALIDA" &&
          movement.status === "ACTIVO",
      )
      .map((movement) => movement.accountId)
      .filter((accountId) =>
        data.currentAccounts.some(
          (account) => account.id === accountId && monetaryKinds.has(account.kind),
        ),
      ),
  );

  if (candidateIds.size === 1) {
    return {
      paymentAccountId: [...candidateIds][0],
      source: "LEDGER" as const,
    };
  }

  return {
    paymentAccountId: null,
    source: "UNRESOLVED" as const,
  };
}

type WithdrawalAlias = {
  field: string;
  value: number | undefined;
};

const resolveAlias = (aliases: WithdrawalAlias[]) => {
  const defined = aliases.filter(
    (alias): alias is { field: string; value: number } => alias.value !== undefined,
  );
  const values = new Set(defined.map((alias) => alias.value));
  return {
    value: defined[0]?.value ?? 0,
    conflict: values.size > 1 ? defined : [],
  };
};

export function mapBalanceFinalTransfers(balance: Balance) {
  const cash = resolveAlias([
    {
      field: "finalTransferToPrincipalCash",
      value: balance.finalTransferToPrincipalCash,
    },
    { field: "finalWithdrawalCash", value: balance.finalWithdrawalCash },
    { field: "withdrawal", value: balance.withdrawal },
  ]);
  const bank = resolveAlias([
    {
      field: "finalTransferToPrincipalBank",
      value: balance.finalTransferToPrincipalBank,
    },
    { field: "finalWithdrawalBank", value: balance.finalWithdrawalBank },
  ]);
  return {
    finalTransferToPrincipalCash: cash.value,
    finalTransferToPrincipalBank: bank.value,
    conflicts: [...cash.conflict, ...bank.conflict],
  };
}

export function inspectRemoteMigrationCompatibility(data: AppData) {
  const issues: MigrationMappingIssue[] = [];

  data.locals.forEach((local, index) => {
    const identity = mapLocalIdentity(local);
    if (!identity.ok) {
      issues.push({ path: `locals[${index}].id`, message: identity.error });
    }
  });

  data.staff.forEach((staff, index) => {
    if (!mapStaffPosition(staff.position)) {
      issues.push({
        path: `staff[${index}].position`,
        message: `El cargo "${staff.position}" no tiene equivalencia remota.`,
      });
    }
  });

  data.salarySettlements.forEach((settlement, index) => {
    const resolved = resolveSalaryPaymentAccount(data, settlement);
    if (!resolved.paymentAccountId) {
      issues.push({
        path: `salarySettlements[${index}].paymentAccountId`,
        message: "No se pudo identificar de forma univoca la cuenta que pago.",
      });
    }
  });

  data.balances.forEach((balance, index) => {
    const mapping = mapBalanceFinalTransfers(balance);
    if (mapping.conflicts.length > 0) {
      issues.push({
        path: `balances[${index}]`,
        message: `Aliases de retiro incompatibles: ${mapping.conflicts
          .map((alias) => `${alias.field}=${alias.value}`)
          .join(", ")}.`,
      });
    }
  });

  return issues;
}
