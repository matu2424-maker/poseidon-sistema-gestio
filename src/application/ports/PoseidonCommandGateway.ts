import type { Role } from "../../types";

export type PoseidonCommandName =
  | "open_cash"
  | "save_readings"
  | "close_cash"
  | "create_expense"
  | "create_principal_expense"
  | "annul_expense"
  | "review_expense"
  | "create_transfer"
  | "annul_transfer"
  | "create_gift"
  | "annul_gift"
  | "create_treasury_transfer"
  | "annul_treasury_transfer"
  | "create_partner_movement"
  | "annul_partner_movement"
  | "save_salary_settlement"
  | "annul_salary_settlement"
  | "close_salary_period"
  | "start_salary_correction"
  | "close_salary_correction"
  | "cancel_salary_correction"
  | "manage_difference"
  | "save_local"
  | "delete_local"
  | "save_machine"
  | "reset_machine_counters"
  | "move_machine_to_workshop"
  | "delete_machine"
  | "assign_machines_to_local"
  | "create_periodic_closure"
  | "annul_periodic_closure";

export type PoseidonCommandRequest<Payload = unknown> = {
  name: PoseidonCommandName;
  idempotencyKey: string;
  actorFunction: Role;
  localId?: string;
  payload: Payload;
};

export type PoseidonCommandResult<Value = unknown> =
  | { ok: true; value: Value; revision?: string }
  | { ok: false; error: string; code?: string; retryable: boolean };

export interface PoseidonCommandGateway {
  execute<Value = unknown, Payload = unknown>(
    request: PoseidonCommandRequest<Payload>,
  ): Promise<PoseidonCommandResult<Value>>;
}

export const validIdempotencyKey = (value: string) =>
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,199}$/.test(value);
