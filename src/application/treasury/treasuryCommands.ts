import type {
  AppData,
  FinancialMedium,
  Partner,
  PartnerMovement,
  PartnerMovementType,
  Role,
  TreasuryTransfer,
  TreasuryTransferTiming,
  TreasuryTransferType,
} from "../../types";
import {
  partnerMovementAccountMovements,
  reverseSourceAccountMovements,
  treasuryTransferAccountMovements,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import { accountOutflowError, balanceCashReconciliationError } from "../../lib/cashAvailability";
import {
  ensureFinancialCurrentAccounts,
  localAccountIdForFinancialMedium,
  principalAccountIdForMedium,
} from "../../lib/currentAccounts";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";

const TREASURY_ROLES: readonly Role[] = ["ENCARGADO", "ADMINISTRADOR"];
const TRANSFER_ROLES: readonly Role[] = ["CAJERO", "ENCARGADO", "ADMINISTRADOR"];

function actorRoleBelongsToUser(context: CommandContext) {
  return (
    context.actorRole === context.user.role ||
    (context.actorRole === "CAJERO" && ["ENCARGADO", "ADMINISTRADOR"].includes(context.user.role))
  );
}

function localAccessError(data: AppData, localId: string, context: CommandContext, allowedRoles: readonly Role[]) {
  if (!actorRoleBelongsToUser(context)) return "La funcion activa no corresponde al usuario autenticado.";
  if (!allowedRoles.includes(context.actorRole)) return "La funcion activa no permite operar estas cuentas.";
  if (context.user.status !== "ACTIVO") return "El usuario no esta activo.";
  if (!data.locals.some((local) => local.id === localId)) return "No se encontro el local.";
  if (context.user.role !== "ADMINISTRADOR" && !context.user.localIds.includes(localId)) {
    return "El usuario no esta asignado al local seleccionado.";
  }
  return "";
}

function linkedOpenBalanceError(data: AppData, localId: string, balanceId: string | undefined, actorRole: Role) {
  const openBalance = data.balances.find((balance) => balance.localId === localId && balance.status === "EN_PROCESO");
  if (openBalance && balanceId !== openBalance.id) {
    return "Existe una caja abierta: el traspaso debe quedar asociado a esa recaudacion.";
  }
  if (!balanceId) return actorRole === "CAJERO" ? "El cajero necesita una caja abierta para mover fondos." : "";
  const balance = data.balances.find((item) => item.id === balanceId);
  if (!balance || balance.localId !== localId || balance.status !== "EN_PROCESO") {
    return "La caja asociada ya no esta abierta o no corresponde al local.";
  }
  return "";
}

function upsertMovements(data: AppData, movements: ReturnType<typeof treasuryTransferAccountMovements>) {
  return movements.reduce(upsertAccountMovement, data.accountMovements);
}

export type CreateTreasuryTransferInput = {
  localId: string;
  balanceId?: string;
  type: TreasuryTransferType;
  medium: FinancialMedium;
  timing?: TreasuryTransferTiming;
  amount: number;
  note: string;
};

export function createTreasuryTransferCommand(
  data: AppData,
  input: CreateTreasuryTransferInput,
  context: CommandContext,
): CommandResult<TreasuryTransfer> {
  const accessError = localAccessError(data, input.localId, context, TRANSFER_ROLES);
  if (accessError) return commandError(accessError);
  const balanceError = linkedOpenBalanceError(data, input.localId, input.balanceId, context.actorRole);
  if (balanceError) return commandError(balanceError);
  if (!(input.type === "RETIRO_CAJA" || input.type === "APORTE_CAJA")) {
    return commandError("Selecciona si es retiro de caja o aporte a caja.");
  }
  if (input.timing && input.timing !== "OPERATIVO") {
    return commandError("Los traspasos de apertura y cierre solo los generan los comandos de caja.");
  }
  if (!(input.medium === "EFECTIVO" || input.medium === "BANCO")) return commandError("Selecciona un medio valido.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return commandError("El monto debe ser un numero finito mayor a cero.");
  }

  const prepared: AppData = {
    ...data,
    currentAccounts: ensureFinancialCurrentAccounts(data, input.localId),
  };
  if (input.balanceId && input.medium === "EFECTIVO") {
    const reconciliationError = balanceCashReconciliationError(prepared, input.balanceId);
    if (reconciliationError) return commandError(reconciliationError);
  }
  const sourceAccountId =
    input.type === "RETIRO_CAJA"
      ? localAccountIdForFinancialMedium(input.localId, input.medium)
      : principalAccountIdForMedium(input.medium);
  const availabilityError = accountOutflowError(prepared, sourceAccountId, input.amount);
  if (availabilityError) return commandError(availabilityError);

  const transfer: TreasuryTransfer = {
    id: context.id("treasury-transfer"),
    balanceId: input.balanceId,
    localId: input.localId,
    type: input.type,
    medium: input.medium,
    timing: input.timing ?? "OPERATIVO",
    amount: input.amount,
    currency: "UYU",
    note: input.note.trim(),
    status: "ACTIVO",
    userId: context.user.id,
    createdAt: context.now(),
  };
  const accountMovements = upsertMovements(prepared, treasuryTransferAccountMovements(transfer));
  const mutated = {
    ...prepared,
    treasuryTransfers: [transfer, ...prepared.treasuryTransfers],
    accountMovements,
  };
  if (input.balanceId && input.medium === "EFECTIVO") {
    const postconditionError = balanceCashReconciliationError(mutated, input.balanceId);
    if (postconditionError) return commandError(postconditionError);
  }
  return commandSuccess(
    auditCommand(
      mutated,
      context,
      transfer.type === "RETIRO_CAJA" ? "Retirar fondos de caja a principal" : "Aportar fondos desde principal a caja",
      "TraspasoTesoreria",
      transfer.id,
      "",
      transfer,
    ),
    transfer,
  );
}

export function annulTreasuryTransferCommand(
  data: AppData,
  transferId: string,
  context: CommandContext,
  reason: string,
): CommandResult<TreasuryTransfer> {
  const previous = data.treasuryTransfers.find((item) => item.id === transferId);
  if (!previous) return commandError("No se encontro el traspaso.");
  const accessError = localAccessError(data, previous.localId, context, TRANSFER_ROLES);
  if (accessError) return commandError(accessError);
  if (previous.status === "ANULADO") return commandError("El traspaso ya esta anulado.");
  if (previous.timing !== "OPERATIVO") {
    return commandError("Los traspasos automaticos de apertura y cierre forman parte de la foto auditada y no se anulan.");
  }
  const note = reason.trim();
  if (!note) return commandError("La anulacion requiere un motivo.");
  const linkedBalance = previous.balanceId
    ? data.balances.find((balance) => balance.id === previous.balanceId)
    : undefined;
  if (linkedBalance && linkedBalance.status !== "EN_PROCESO") {
    return commandError("Un traspaso asociado a una caja cerrada no se anula; requiere un ajuste auditado.");
  }
  const openBalance = data.balances.find((balance) => balance.localId === previous.localId && balance.status === "EN_PROCESO");
  if (openBalance && openBalance.id !== previous.balanceId) {
    return commandError("No se puede anular un traspaso historico mientras el local tiene otra caja abierta.");
  }
  const prepared: AppData = {
    ...data,
    currentAccounts: ensureFinancialCurrentAccounts(data, previous.localId),
  };
  const reversalSourceAccountId =
    previous.type === "RETIRO_CAJA"
      ? principalAccountIdForMedium(previous.medium)
      : localAccountIdForFinancialMedium(previous.localId, previous.medium);
  const availabilityError = accountOutflowError(prepared, reversalSourceAccountId, previous.amount);
  if (availabilityError) return commandError(availabilityError);
  if (previous.balanceId && previous.medium === "EFECTIVO") {
    const reconciliationError = balanceCashReconciliationError(prepared, previous.balanceId);
    if (reconciliationError) return commandError(reconciliationError);
  }
  const next: TreasuryTransfer = { ...previous, status: "ANULADO" };
  const timestamp = context.now();
  const mutated = {
    ...prepared,
    treasuryTransfers: prepared.treasuryTransfers.map((item) => (item.id === previous.id ? next : item)),
    accountMovements: reverseSourceAccountMovements(
      prepared.accountMovements,
      ["TRASPASO_CAJA"],
      previous.id,
      context.user.id,
      note,
      timestamp,
    ),
  };
  if (previous.balanceId && previous.medium === "EFECTIVO") {
    const postconditionError = balanceCashReconciliationError(mutated, previous.balanceId);
    if (postconditionError) return commandError(postconditionError);
  }
  return commandSuccess(
    auditCommand(mutated, context, "Anular traspaso de tesoreria", "TraspasoTesoreria", previous.id, previous, next, note),
    next,
  );
}

export type CreatePartnerMovementInput = {
  localId: string;
  balanceId?: string;
  partner: Partner;
  type: PartnerMovementType;
  medium: FinancialMedium;
  amount: number;
  note: string;
};

export function createPartnerMovementCommand(
  data: AppData,
  input: CreatePartnerMovementInput,
  context: CommandContext,
): CommandResult<PartnerMovement> {
  const accessError = localAccessError(data, input.localId, context, TREASURY_ROLES);
  if (accessError) return commandError(accessError);
  if (!(input.partner === "MATHIAS" || input.partner === "RICARDO")) return commandError("Selecciona un socio.");
  if (!(input.type === "APORTE_SOCIO" || input.type === "RETIRO_SOCIO")) {
    return commandError("Selecciona aporte o retiro de socio.");
  }
  if (!(input.medium === "EFECTIVO" || input.medium === "BANCO")) return commandError("Selecciona un medio valido.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return commandError("El monto debe ser un numero finito mayor a cero.");
  }
  const prepared: AppData = {
    ...data,
    currentAccounts: ensureFinancialCurrentAccounts(data, input.localId),
  };
  if (input.type === "RETIRO_SOCIO") {
    const availabilityError = accountOutflowError(prepared, principalAccountIdForMedium(input.medium), input.amount);
    if (availabilityError) return commandError(availabilityError);
  }
  const movement: PartnerMovement = {
    id: context.id("partner-movement"),
    balanceId: input.balanceId,
    localId: input.localId,
    partner: input.partner,
    type: input.type,
    medium: input.medium,
    amount: input.amount,
    currency: "UYU",
    note: input.note.trim(),
    status: "ACTIVO",
    userId: context.user.id,
    createdAt: context.now(),
  };
  const accountMovements = partnerMovementAccountMovements(movement).reduce(
    upsertAccountMovement,
    prepared.accountMovements,
  );
  const mutated = {
    ...prepared,
    partnerMovements: [movement, ...prepared.partnerMovements],
    accountMovements,
  };
  return commandSuccess(
    auditCommand(
      mutated,
      context,
      movement.type === "APORTE_SOCIO" ? "Registrar aporte de socio" : "Registrar retiro de socio",
      "MovimientoSocio",
      movement.id,
      "",
      movement,
    ),
    movement,
  );
}

export function annulPartnerMovementCommand(
  data: AppData,
  movementId: string,
  context: CommandContext,
  reason: string,
): CommandResult<PartnerMovement> {
  const previous = data.partnerMovements.find((item) => item.id === movementId);
  if (!previous) return commandError("No se encontro el movimiento del socio.");
  const accessError = localAccessError(data, previous.localId, context, TREASURY_ROLES);
  if (accessError) return commandError(accessError);
  if (previous.status === "ANULADO") return commandError("El movimiento ya esta anulado.");
  const note = reason.trim();
  if (!note) return commandError("La anulacion requiere un motivo.");
  const prepared: AppData = {
    ...data,
    currentAccounts: ensureFinancialCurrentAccounts(data, previous.localId),
  };
  if (previous.type === "APORTE_SOCIO") {
    const availabilityError = accountOutflowError(prepared, principalAccountIdForMedium(previous.medium), previous.amount);
    if (availabilityError) return commandError(availabilityError);
  }
  const next: PartnerMovement = { ...previous, status: "ANULADO" };
  const mutated = {
    ...prepared,
    partnerMovements: prepared.partnerMovements.map((item) => (item.id === previous.id ? next : item)),
    accountMovements: reverseSourceAccountMovements(
      prepared.accountMovements,
      [previous.type],
      previous.id,
      context.user.id,
      note,
      context.now(),
    ),
  };
  return commandSuccess(
    auditCommand(mutated, context, "Anular movimiento de socio", "MovimientoSocio", previous.id, previous, next, note),
    next,
  );
}
