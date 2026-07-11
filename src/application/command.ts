import type { AppData, Role, User } from "../types";
import { appendAuditEvent } from "../lib/audit";
import { nowIso } from "../lib/dates";
import { uid } from "../lib/ids";

export type CommandContext = {
  user: User;
  actorRole: Role;
  now: () => string;
  id: (prefix: string) => string;
};

export type CommandResult<Value = undefined> =
  | { ok: true; data: AppData; value: Value }
  | { ok: false; error: string };

export const commandContext = (
  user: User,
  actorRole: Role,
  overrides: Partial<Pick<CommandContext, "now" | "id">> = {},
): CommandContext => ({
  user,
  actorRole,
  now: overrides.now ?? nowIso,
  id: overrides.id ?? uid,
});

export const commandError = (error: string): CommandResult<never> => ({ ok: false, error });

export const commandSuccess = <Value>(data: AppData, value: Value): CommandResult<Value> => ({ ok: true, data, value });

export function auditCommand(
  data: AppData,
  context: CommandContext,
  action: string,
  entity: string,
  entityId: string,
  previousValue: unknown,
  newValue: unknown,
  reason = "",
  options: { localId?: string } = {},
) {
  return appendAuditEvent(
    data,
    { user: context.user, actorRole: context.actorRole },
    action,
    entity,
    entityId,
    previousValue,
    newValue,
    reason,
    { id: context.id("audit"), createdAt: context.now(), localId: options.localId },
  );
}
