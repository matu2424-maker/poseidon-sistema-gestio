import type { AppData, AuditEvent, Role, User } from "../types";
import { nowIso } from "./dates";
import { uid } from "./ids";

type AuditActor = {
  user?: User | null;
  actorRole?: Role | null;
};

type AuditOptions = {
  id?: string;
  createdAt?: string;
  localId?: string;
};

const auditJson = (value: unknown) =>
  JSON.stringify(value ?? "", (key, item: unknown) => {
    const normalizedKey = key.toLocaleLowerCase("es-UY");
    if (normalizedKey === "password") return "[dato sensible omitido]";
    if (normalizedKey === "dataurl" || normalizedKey === "receiptdataurl") return "[archivo omitido]";
    if (typeof item === "string" && item.startsWith("data:") && item.length > 500) return "[archivo omitido]";
    return item;
  });

const parseAuditJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const localForBalance = (data: AppData, balanceId: string | undefined) =>
  balanceId ? data.balances.find((balance) => balance.id === balanceId)?.localId : undefined;

const localForAccount = (data: AppData, accountId: string | undefined) => {
  if (!accountId) return undefined;
  const account = data.currentAccounts.find((item) => item.id === accountId);
  return account && (account.kind === "LOCAL_EFECTIVO" || account.kind === "LOCAL_BANCO") ? account.entityId : undefined;
};

function collectPayloadLocalIds(data: AppData, value: unknown, target: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectPayloadLocalIds(data, item, target));
    return;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (key === "localId" && typeof item === "string") target.add(item);
    if (key === "localIds" && Array.isArray(item)) {
      item.forEach((localId) => {
        if (typeof localId === "string") target.add(localId);
      });
    }
    if (key === "balanceId" && typeof item === "string") {
      const localId = localForBalance(data, item);
      if (localId) target.add(localId);
    }
    if (key === "accountId" && typeof item === "string") {
      const localId = localForAccount(data, item);
      if (localId) target.add(localId);
    }
    if (key === "machineId" && typeof item === "string") {
      const localId = data.machines.find((machine) => machine.id === item)?.localId;
      if (localId) target.add(localId);
    }
    if (key === "staffId" && typeof item === "string") {
      const localId = data.staff.find((staff) => staff.id === item)?.localId;
      if (localId) target.add(localId);
    }
    if (key === "clientId" && typeof item === "string") {
      const localId = data.clients.find((client) => client.id === item)?.localId;
      if (localId) target.add(localId);
    }
    collectPayloadLocalIds(data, item, target);
  });
}

function collectEntityLocalIds(data: AppData, event: AuditEvent, target: Set<string>) {
  const directLocal = data.locals.find((local) => local.id === event.entityId)?.id;
  if (directLocal) target.add(directLocal);

  const balance = data.balances.find((item) => item.id === event.entityId);
  if (balance) target.add(balance.localId);

  const balanceLinkedId =
    data.readings.find((item) => item.id === event.entityId)?.balanceId ??
    data.expenses.find((item) => item.id === event.entityId)?.balanceId ??
    data.transfers.find((item) => item.id === event.entityId)?.balanceId ??
    data.gifts.find((item) => item.id === event.entityId)?.balanceId ??
    data.accountMovements.find((item) => item.id === event.entityId)?.balanceId;
  const linkedLocal = localForBalance(data, balanceLinkedId);
  if (linkedLocal) target.add(linkedLocal);

  const directSources = [
    data.capitalMovements.find((item) => item.id === event.entityId)?.localId,
    data.salarySettlements.find((item) => item.id === event.entityId)?.localId,
    data.staff.find((item) => item.id === event.entityId)?.localId,
    data.clients.find((item) => item.id === event.entityId)?.localId,
    data.machines.find((item) => item.id === event.entityId)?.localId,
    data.periodicClosures.find((item) => item.id === event.entityId)?.localId,
    data.machineLocalHistory.find((item) => item.id === event.entityId)?.localId,
  ];
  directSources.forEach((localId) => {
    if (localId) target.add(localId);
  });

  data.salaryClosures
    .find((item) => item.id === event.entityId)
    ?.employeeSnapshots.forEach((snapshot) => target.add(snapshot.localId));

  const accountMovement = data.accountMovements.find((item) => item.id === event.entityId);
  const currentAccount = data.currentAccounts.find((item) => item.id === (accountMovement?.accountId ?? event.entityId));
  if (currentAccount && (currentAccount.kind === "LOCAL_EFECTIVO" || currentAccount.kind === "LOCAL_BANCO") && currentAccount.entityId) {
    target.add(currentAccount.entityId);
  }

  const eventUser = data.users.find((item) => item.id === event.entityId);
  eventUser?.localIds.forEach((localId) => target.add(localId));
}

export function auditEventLocalIds(data: AppData, event: AuditEvent) {
  const frozenLocalIds = event.localIds?.filter(Boolean) ?? [];
  if (frozenLocalIds.length) return [...new Set(frozenLocalIds)].sort();
  const localIds = new Set<string>();
  const explicitLocalId = event.localId;
  if (explicitLocalId) localIds.add(explicitLocalId);
  if (explicitLocalId) return [...localIds].sort();
  collectEntityLocalIds(data, event, localIds);
  collectPayloadLocalIds(data, parseAuditJson(event.previousValue), localIds);
  collectPayloadLocalIds(data, parseAuditJson(event.newValue), localIds);
  return [...localIds].sort();
}

export function auditEventVisibleToUser(data: AppData, event: AuditEvent, user: User) {
  if (user.role === "ADMINISTRADOR") return true;
  const eventLocalIds = auditEventLocalIds(data, event);
  if (user.role === "ENCARGADO") return eventLocalIds.some((localId) => user.localIds.includes(localId));
  return event.userId === user.id && eventLocalIds.some((localId) => user.localIds.includes(localId));
}

export function appendAuditEvent(
  current: AppData,
  actor: AuditActor,
  action: string,
  entity: string,
  entityId: string,
  previousValue: unknown,
  newValue: unknown,
  reason = "",
  options: AuditOptions = {},
): AppData {
  const user = actor.user;
  const eventBase: AuditEvent = {
    id: options.id ?? uid("audit"),
    userId: user?.id ?? "system",
    userName: user?.name ?? "Sistema",
    actualRole: user?.role,
    actorRole: actor.actorRole ?? user?.role,
    action,
    entity,
    entityId,
    previousValue: auditJson(previousValue),
    newValue: auditJson(newValue),
    reason,
    createdAt: options.createdAt ?? nowIso(),
    ...(options.localId ? { localId: options.localId } : {}),
  };
  const event: AuditEvent = {
    ...eventBase,
    localIds: auditEventLocalIds(current, eventBase),
  };
  return {
    ...current,
    audit: [
      event,
      ...current.audit,
    ],
  };
}
