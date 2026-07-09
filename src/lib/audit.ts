import type { AppData, Role, User } from "../types";
import { nowIso } from "./dates";
import { uid } from "./ids";

type AuditActor = {
  user?: User | null;
  actorRole?: Role | null;
};

export function appendAuditEvent(
  current: AppData,
  actor: AuditActor,
  action: string,
  entity: string,
  entityId: string,
  previousValue: unknown,
  newValue: unknown,
  reason = "",
): AppData {
  const user = actor.user;
  return {
    ...current,
    audit: [
      {
        id: uid("audit"),
        userId: user?.id ?? "system",
        userName: user?.name ?? "Sistema",
        actualRole: user?.role,
        actorRole: actor.actorRole ?? user?.role,
        action,
        entity,
        entityId,
        previousValue: JSON.stringify(previousValue ?? ""),
        newValue: JSON.stringify(newValue ?? ""),
        reason,
        createdAt: nowIso(),
      },
      ...current.audit,
    ],
  };
}
