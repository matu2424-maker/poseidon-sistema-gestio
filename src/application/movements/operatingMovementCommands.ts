import type {
  AppData,
  Balance,
  CapitalMovement,
  CapitalMovementMedium,
  CapitalMovementPerson,
  CapitalMovementType,
  Expense,
  Gift,
  Role,
  Transfer,
} from "../../types";
import {
  capitalAccountMovement,
  localExpenseAccountMovement,
  localGiftAccountMovement,
  localTransferCashAccountMovement,
  localTransferAccountMovement,
  reverseSourceAccountMovements,
  transferAccountMovement,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import {
  createTransferCurrentAccount,
  ensureLocalCurrentAccounts,
  TRANSFER_ACCOUNT_ID,
} from "../../lib/currentAccounts";
import { balanceCashReconciliationError, localCashOutflowError } from "../../lib/cashAvailability";
import {
  auditCommand,
  commandError,
  commandSuccess,
  type CommandContext,
  type CommandResult,
} from "../command";

const CASHIER_ONLY: readonly Role[] = ["CAJERO"];
const CASHIER_OR_MANAGER: readonly Role[] = ["CAJERO", "ENCARGADO"];

const actorRoleBelongsToUser = (context: CommandContext) =>
  context.actorRole === context.user.role ||
  (context.actorRole === "CAJERO" && ["ENCARGADO", "ADMINISTRADOR"].includes(context.user.role));

function openCash(
  data: AppData,
  balanceId: string,
  context: CommandContext,
  allowedRoles: readonly Role[] = CASHIER_ONLY,
): Balance | string {
  if (!actorRoleBelongsToUser(context)) return "La funcion activa no corresponde al usuario autenticado.";
  if (!allowedRoles.includes(context.actorRole)) {
    return allowedRoles.includes("ENCARGADO")
      ? "Esta operacion requiere funcion Cajero o Encargado."
      : "Para operar movimientos hay que trabajar con la funcion Cajero.";
  }
  if (context.user.status !== "ACTIVO") return "El usuario no esta activo.";
  const balance = data.balances.find((item) => item.id === balanceId);
  if (!balance || balance.status !== "EN_PROCESO") return "La caja ya no esta abierta.";
  if (context.user.role !== "ADMINISTRADOR" && !context.user.localIds.includes(balance.localId)) {
    return "El usuario no esta asignado al local de esta caja.";
  }
  return balance;
}

export type CreateExpenseInput = {
  balanceId: string;
  category: string;
  subcategory: string;
  amount: number;
  description: string;
  receiptFileName?: string;
  receiptFileType?: string;
};

export function createExpenseCommand(
  data: AppData,
  input: CreateExpenseInput,
  context: CommandContext,
): CommandResult<Expense> {
  const balance = openCash(data, input.balanceId, context, CASHIER_OR_MANAGER);
  if (typeof balance === "string") return commandError(balance);
  const category = data.expenseCategories.find(
    (item) => item.status === "ACTIVA" && item.name === input.category.trim(),
  );
  if (!category || !input.subcategory.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    return commandError("Categoria, subcategoria y monto son obligatorios.");
  }
  if (!category.subcategories.includes(input.subcategory.trim())) {
    return commandError("La subcategoria no pertenece a la categoria seleccionada.");
  }
  const reconciliationError = balanceCashReconciliationError(data, balance.id);
  if (reconciliationError) return commandError(reconciliationError);
  const cashError = localCashOutflowError(data, balance.localId, input.amount);
  if (cashError) return commandError(cashError);
  const expense: Expense = {
    id: context.id("expense"),
    balanceId: balance.id,
    category: category.name,
    subcategory: input.subcategory.trim(),
    amount: input.amount,
    description: input.description.trim(),
    receipt: input.receiptFileName ?? "",
    receiptFileName: input.receiptFileName,
    receiptFileType: input.receiptFileType,
    receiptDataUrl: undefined,
    status: "ACTIVO",
    userId: context.user.id,
    createdAt: context.now(),
  };
  const nextData = auditCommand(
    {
      ...data,
      currentAccounts: ensureLocalCurrentAccounts(data, balance.localId),
      accountMovements: upsertAccountMovement(
        data.accountMovements,
        localExpenseAccountMovement(expense, balance.localId),
      ),
      expenses: [expense, ...data.expenses],
    },
    context,
    "Crear gasto",
    "Gasto",
    expense.id,
    "",
    expense,
  );
  return commandSuccess(nextData, expense);
}

export function deleteExpenseCommand(
  data: AppData,
  balanceId: string,
  expenseId: string,
  context: CommandContext,
): CommandResult<Expense> {
  const balance = openCash(data, balanceId, context, CASHIER_OR_MANAGER);
  if (typeof balance === "string") return commandError("Solo se pueden eliminar gastos antes de cerrar la caja.");
  const expense = data.expenses.find((item) => item.id === expenseId && item.balanceId === balance.id);
  if (!expense) return commandError("No se encontro el gasto de esta caja.");
  const nextData = auditCommand(
    {
      ...data,
      accountMovements: data.accountMovements.filter(
        (movement) => movement.sourceType !== "GASTO" || movement.sourceId !== expense.id,
      ),
      expenses: data.expenses.filter((item) => item.id !== expense.id),
    },
    context,
    "Eliminar gasto antes de cierre",
    "Gasto",
    expense.id,
    expense,
    "",
    "Caja abierta",
  );
  return commandSuccess(nextData, expense);
}

export type CreateTransferInput = {
  balanceId: string;
  clientId?: string;
  receipt: string;
  name: string;
  amount: number;
  account: string;
};

export function createTransferCommand(
  data: AppData,
  input: CreateTransferInput,
  context: CommandContext,
): CommandResult<Transfer> {
  const balance = openCash(data, input.balanceId, context);
  if (typeof balance === "string") return commandError(balance);
  if (!input.receipt.trim() || !input.name.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    return commandError("Comprobante, nombre y monto son obligatorios.");
  }
  if (input.clientId && !data.clients.some((client) => client.id === input.clientId && client.status === "ACTIVO")) {
    return commandError("El cliente seleccionado no esta activo.");
  }
  const reconciliationError = balanceCashReconciliationError(data, balance.id);
  if (reconciliationError) return commandError(reconciliationError);
  const cashError = localCashOutflowError(data, balance.localId, input.amount);
  if (cashError) return commandError(cashError);
  const transfer: Transfer = {
    id: context.id("transfer"),
    balanceId: balance.id,
    clientId: input.clientId,
    receipt: input.receipt.trim(),
    name: input.name.trim(),
    amount: input.amount,
    account: input.account.trim() || "Cuenta unica inicial",
    status: "ACTIVO",
    userId: context.user.id,
    createdAt: context.now(),
  };
  const transferAccounts = data.currentAccounts.some((account) => account.id === TRANSFER_ACCOUNT_ID)
    ? data.currentAccounts
    : [createTransferCurrentAccount(), ...data.currentAccounts];
  const currentAccounts = ensureLocalCurrentAccounts({ ...data, currentAccounts: transferAccounts }, balance.localId);
  const accountMovements = upsertAccountMovement(
    upsertAccountMovement(
      upsertAccountMovement(data.accountMovements, transferAccountMovement(transfer)),
      localTransferAccountMovement(transfer, balance.localId),
    ),
    localTransferCashAccountMovement(transfer, balance.localId),
  );
  return commandSuccess(
    auditCommand(
      { ...data, currentAccounts, accountMovements, transfers: [transfer, ...data.transfers] },
      context,
      "Crear transferencia",
      "Transferencia",
      transfer.id,
      "",
      transfer,
    ),
    transfer,
  );
}

export function annulTransferCommand(
  data: AppData,
  balanceId: string,
  transferId: string,
  context: CommandContext,
): CommandResult<Transfer> {
  const balance = openCash(data, balanceId, context);
  if (typeof balance === "string") return commandError("Solo se pueden anular transferencias antes de cerrar la caja.");
  const previous = data.transfers.find((item) => item.id === transferId && item.balanceId === balance.id);
  if (!previous) return commandError("No se encontro la transferencia de esta caja.");
  if (previous.status === "ANULADO") return commandError("La transferencia ya esta anulada.");
  const next: Transfer = { ...previous, status: "ANULADO" };
  const transfers = data.transfers.map((item) => (item.id === previous.id ? next : item));
  const accountMovements = reverseSourceAccountMovements(
    data.accountMovements,
    ["TRANSFERENCIA"],
    previous.id,
    context.user.id,
    "Anulacion operativa",
    context.now(),
  );
  return commandSuccess(
    auditCommand(
      { ...data, transfers, accountMovements },
      context,
      "Anular transferencia",
      "Transferencia",
      previous.id,
      previous,
      next,
      "Anulacion operativa",
    ),
    next,
  );
}

export type CreateGiftInput = {
  balanceId: string;
  clientIds: string[];
  amount: number;
  reference: string;
  description: string;
};

export function createGiftCommand(
  data: AppData,
  input: CreateGiftInput,
  context: CommandContext,
): CommandResult<Gift> {
  const balance = openCash(data, input.balanceId, context);
  if (typeof balance === "string") return commandError(balance);
  const clientIds = [...new Set(input.clientIds)];
  const allClientsActive = clientIds.every((id) =>
    data.clients.some((client) => client.id === id && client.status === "ACTIVO"),
  );
  if (!clientIds.length || !allClientsActive || !input.reference.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    return commandError("Cliente, referencia y monto son obligatorios.");
  }
  const reconciliationError = balanceCashReconciliationError(data, balance.id);
  if (reconciliationError) return commandError(reconciliationError);
  const cashError = localCashOutflowError(data, balance.localId, input.amount);
  if (cashError) return commandError(cashError);
  const gift: Gift = {
    id: context.id("gift"),
    balanceId: balance.id,
    clientId: clientIds[0],
    clientIds,
    type: "EFECTIVO",
    cashAmount: input.amount,
    creditAmount: 0,
    reference: input.reference.trim(),
    description: input.description.trim(),
    status: "ACTIVO",
    userId: context.user.id,
    createdAt: context.now(),
  };
  return commandSuccess(
    auditCommand(
      {
        ...data,
        currentAccounts: ensureLocalCurrentAccounts(data, balance.localId),
        accountMovements: upsertAccountMovement(
          data.accountMovements,
          localGiftAccountMovement(gift, balance.localId),
        ),
        gifts: [gift, ...data.gifts],
      },
      context,
      "Crear regalo",
      "Regalo",
      gift.id,
      "",
      gift,
    ),
    gift,
  );
}

export function deleteGiftCommand(
  data: AppData,
  balanceId: string,
  giftId: string,
  context: CommandContext,
): CommandResult<Gift> {
  const balance = openCash(data, balanceId, context);
  if (typeof balance === "string") return commandError("Solo se pueden eliminar regalos antes de cerrar la caja.");
  const gift = data.gifts.find((item) => item.id === giftId && item.balanceId === balance.id);
  if (!gift) return commandError("No se encontro el regalo de esta caja.");
  return commandSuccess(
    auditCommand(
      {
        ...data,
        accountMovements: data.accountMovements.filter(
          (movement) => movement.sourceType !== "REGALO" || movement.sourceId !== gift.id,
        ),
        gifts: data.gifts.filter((item) => item.id !== gift.id),
      },
      context,
      "Eliminar regalo antes de cierre",
      "Regalo",
      gift.id,
      gift,
      "",
      "Caja abierta",
    ),
    gift,
  );
}

export type CreateCapitalMovementInput = {
  balanceId: string;
  type: CapitalMovementType;
  medium: CapitalMovementMedium;
  person: CapitalMovementPerson;
  amount: number;
  note: string;
};

export function createCapitalMovementCommand(
  data: AppData,
  input: CreateCapitalMovementInput,
  context: CommandContext,
): CommandResult<CapitalMovement> {
  const balance = openCash(data, input.balanceId, context, CASHIER_OR_MANAGER);
  if (typeof balance === "string") return commandError(balance);
  if (!(["RETIRO", "APORTE"] as string[]).includes(input.type)) {
    return commandError("Selecciona si es retiro o aporte.");
  }
  if (!(["EFECTIVO", "TRANSFERENCIA"] as string[]).includes(input.medium)) {
    return commandError("Selecciona un medio valido.");
  }
  if (!(["RICARDO", "MATHIAS"] as string[]).includes(input.person)) {
    return commandError("Selecciona una persona valida.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return commandError("El monto es obligatorio y debe ser un numero finito mayor a cero.");
  }
  const reconciliationError = balanceCashReconciliationError(data, balance.id);
  if (reconciliationError) return commandError(reconciliationError);
  if (input.type === "RETIRO" && input.medium === "EFECTIVO") {
    const cashError = localCashOutflowError(data, balance.localId, input.amount);
    if (cashError) return commandError(cashError);
  }
  const movement: CapitalMovement = {
    id: context.id("capital"),
    balanceId: balance.id,
    localId: balance.localId,
    type: input.type,
    medium: input.medium,
    timing: "OPERATIVO",
    person: input.person,
    amount: input.amount,
    note: input.note.trim(),
    status: "ACTIVO",
    userId: context.user.id,
    createdAt: context.now(),
  };
  return commandSuccess(
    auditCommand(
      {
        ...data,
        currentAccounts: ensureLocalCurrentAccounts(data, balance.localId),
        accountMovements: upsertAccountMovement(data.accountMovements, capitalAccountMovement(movement)),
        capitalMovements: [movement, ...data.capitalMovements],
      },
      context,
      movement.type === "RETIRO" ? "Crear retiro" : "Crear aporte de capital",
      "MovimientoCapital",
      movement.id,
      "",
      movement,
    ),
    movement,
  );
}

export function annulCapitalMovementCommand(
  data: AppData,
  balanceId: string,
  movementId: string,
  context: CommandContext,
): CommandResult<CapitalMovement> {
  const balance = openCash(data, balanceId, context, CASHIER_OR_MANAGER);
  if (typeof balance === "string") return commandError("Solo se pueden anular movimientos antes de cerrar la caja.");
  const previous = data.capitalMovements.find(
    (item) => item.id === movementId && item.balanceId === balance.id,
  );
  if (!previous) return commandError("No se encontro el retiro o aporte de esta caja.");
  if (previous.status === "ANULADO") return commandError("El movimiento ya esta anulado.");
  const next: CapitalMovement = { ...previous, status: "ANULADO" };
  const capitalMovements = data.capitalMovements.map((item) => (item.id === previous.id ? next : item));
  const accountMovements = reverseSourceAccountMovements(
    data.accountMovements,
    ["RETIRO", "APORTE"],
    previous.id,
    context.user.id,
    "Anulacion operativa",
    context.now(),
  );
  return commandSuccess(
    auditCommand(
      { ...data, capitalMovements, accountMovements },
      context,
      "Anular retiro/aporte",
      "MovimientoCapital",
      previous.id,
      previous,
      next,
      "Anulacion operativa",
    ),
    next,
  );
}
