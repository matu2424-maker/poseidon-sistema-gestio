import type { AppData, AuditEvent, FinancialMedium, MovementStatus } from "../types";

export type ManagerCashActivityKind = "GASTO" | "CAJA_A_PRINCIPAL" | "PRINCIPAL_A_CAJA";

export type ManagerCashActivityItem = {
  id: string;
  occurredAt: string;
  userName: string;
  kind: ManagerCashActivityKind;
  medium: FinancialMedium;
  detail: string;
  entry: number;
  outflow: number;
  status: MovementStatus;
};

export type ManagerCashActivity = {
  items: ManagerCashActivityItem[];
  cashNet: number;
  bankNet: number;
  activeCount: number;
  annulledCount: number;
};

type AuditPayload = Record<string, unknown>;

const parsePayload = (value: string): AuditPayload | undefined => {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as AuditPayload) : undefined;
  } catch {
    return undefined;
  }
};

const payloadForEvent = (event: AuditEvent) => {
  const next = parsePayload(event.newValue);
  if (next?.id === event.entityId) return next;
  const previous = parsePayload(event.previousValue);
  return previous?.id === event.entityId ? previous : undefined;
};

const isManagerFunction = (event: AuditEvent) => (event.actorRole ?? event.actualRole) === "ENCARGADO";
const stringValue = (value: unknown) => (typeof value === "string" ? value : "");
const amountValue = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const detailFrom = (payload: AuditPayload, expense: boolean) =>
  (expense
    ? [stringValue(payload.category), stringValue(payload.subcategory), stringValue(payload.description)]
    : [stringValue(payload.person), stringValue(payload.note)])
    .filter(Boolean)
    .join(" - ");

export function managerCashActivityForBalance(data: AppData, balanceId: string): ManagerCashActivity {
  const grouped = new Map<string, Array<{ event: AuditEvent; payload: AuditPayload }>>();

  data.audit.forEach((event) => {
    if (!isManagerFunction(event) || !["Gasto", "MovimientoCapital", "TraspasoTesoreria"].includes(event.entity)) return;
    const payload = payloadForEvent(event);
    if (!payload || payload.balanceId !== balanceId) return;
    const key = `${event.entity}:${event.entityId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), { event, payload }]);
  });

  const items = [...grouped.entries()]
    .map(([key, interventions]): ManagerCashActivityItem | undefined => {
      const ordered = [...interventions].sort((left, right) =>
        right.event.createdAt.localeCompare(left.event.createdAt),
      );
      const latest = ordered[0];
      const isExpense = latest.event.entity === "Gasto";
      const isTreasury = latest.event.entity === "TraspasoTesoreria";
      const current = isExpense
        ? data.expenses.find((item) => item.id === latest.event.entityId)
        : isTreasury
          ? data.treasuryTransfers.find((item) => item.id === latest.event.entityId)
          : data.capitalMovements.find((item) => item.id === latest.event.entityId);
      const payload = (current ?? latest.payload) as AuditPayload;
      const amount = amountValue(payload.amount);
      if (amount <= 0) return undefined;
      const status: MovementStatus = current?.status === "ACTIVO" ? "ACTIVO" : "ANULADO";
      const type = stringValue(payload.type);
      const kind: ManagerCashActivityKind = isExpense
        ? "GASTO"
        : ["APORTE", "APORTE_CAJA"].includes(type)
          ? "PRINCIPAL_A_CAJA"
          : "CAJA_A_PRINCIPAL";
      const medium: FinancialMedium = ["TRANSFERENCIA", "BANCO"].includes(stringValue(payload.medium))
        ? "BANCO"
        : "EFECTIVO";
      const userName = [...new Set(ordered.map(({ event }) => event.userName))].join(", ");

      return {
        id: key,
        occurredAt: latest.event.createdAt,
        userName,
        kind,
        medium,
        detail: detailFrom(payload, isExpense),
        entry: kind === "PRINCIPAL_A_CAJA" ? amount : 0,
        outflow: kind === "GASTO" || kind === "CAJA_A_PRINCIPAL" ? amount : 0,
        status,
      };
    })
    .filter((item): item is ManagerCashActivityItem => Boolean(item))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  const activeItems = items.filter((item) => item.status === "ACTIVO");
  const netForMedium = (medium: FinancialMedium) =>
    activeItems
      .filter((item) => item.medium === medium)
      .reduce((total, item) => total + item.entry - item.outflow, 0);

  return {
    items,
    cashNet: netForMedium("EFECTIVO"),
    bankNet: netForMedium("BANCO"),
    activeCount: activeItems.length,
    annulledCount: items.length - activeItems.length,
  };
}
