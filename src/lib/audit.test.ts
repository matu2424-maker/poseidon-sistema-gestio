import { describe, expect, it } from "vitest";
import { createSeedData } from "../data/appData";
import type { AuditEvent, Local, User } from "../types";
import { appendAuditEvent, auditEventLocalIds, auditEventVisibleToUser } from "./audit";

const managerFor = (localId: string): User => ({
  id: "manager-test",
  name: "Encargado prueba",
  username: "manager-test",
  password: "",
  role: "ENCARGADO",
  status: "ACTIVO",
  localIds: [localId],
});

const eventFor = (patch: Partial<AuditEvent> = {}): AuditEvent => ({
  id: "audit-test",
  userId: "system",
  userName: "Sistema",
  action: "Prueba",
  entity: "Sistema",
  entityId: "global",
  previousValue: "\"\"",
  newValue: "\"\"",
  reason: "",
  createdAt: "2026-07-11T12:00:00.000Z",
  ...patch,
});

describe("alcance local de auditoria", () => {
  it("resuelve el local desde una caja y desde datos estructurados del evento", () => {
    const data = createSeedData();
    const localId = data.locals[0].id;
    const balance = data.balances[0];

    expect(auditEventLocalIds(data, eventFor({ entity: "BalanceDiario", entityId: balance.id }))).toEqual([localId]);
    expect(auditEventLocalIds(data, eventFor({ newValue: JSON.stringify({ localId }) }))).toEqual([localId]);
  });

  it("muestra al encargado solo eventos de sus locales y al administrador todos", () => {
    const data = createSeedData();
    const poseidonId = data.locals[0].id;
    const otherLocal: Local = { ...data.locals[0], id: "local-otro", name: "Otro local" };
    const scoped = { ...data, locals: [...data.locals, otherLocal] };
    const poseidonEvent = eventFor({ newValue: JSON.stringify({ localId: poseidonId }) });
    const otherEvent = eventFor({ id: "audit-other", newValue: JSON.stringify({ localId: otherLocal.id }) });
    const unresolvedEvent = eventFor({ id: "audit-global" });
    const administrator = { ...managerFor(poseidonId), role: "ADMINISTRADOR" as const };

    expect(auditEventVisibleToUser(scoped, poseidonEvent, managerFor(poseidonId))).toBe(true);
    expect(auditEventVisibleToUser(scoped, otherEvent, managerFor(poseidonId))).toBe(false);
    expect(auditEventVisibleToUser(scoped, unresolvedEvent, managerFor(poseidonId))).toBe(false);
    expect(auditEventVisibleToUser(scoped, unresolvedEvent, administrator)).toBe(true);
  });

  it("persiste el contexto local explicito sin perder el formato existente", () => {
    const data = createSeedData();
    const localId = data.locals[0].id;
    const next = appendAuditEvent(data, {}, "Ajustar", "DiferenciaCaja", "balance-test", {}, {}, "Control", {
      id: "audit-explicit",
      createdAt: "2026-07-11T12:00:00.000Z",
      localId,
    });

    expect(auditEventLocalIds(next, next.audit[0])).toEqual([localId]);
    expect(next.audit[0]).toMatchObject({ id: "audit-explicit", createdAt: "2026-07-11T12:00:00.000Z" });
  });
});
