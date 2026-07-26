import {
  validIdempotencyKey,
  type PoseidonCommandGateway,
  type PoseidonCommandName,
  type PoseidonCommandRequest,
  type PoseidonCommandResult,
} from "../../application/ports/PoseidonCommandGateway";

type FetchLike = typeof fetch;

export type SupabaseCommandGatewayOptions = {
  url: string;
  publishableKey: string;
  accessToken: () => Promise<string | null>;
  fetch?: FetchLike;
};

const rpcByCommand: Record<PoseidonCommandName, string> = {
  open_cash: "poseidon_open_cash",
  save_readings: "poseidon_save_readings",
  close_cash: "poseidon_close_cash",
  create_expense: "poseidon_create_expense",
  create_principal_expense: "poseidon_create_principal_expense",
  annul_expense: "poseidon_annul_expense",
  review_expense: "poseidon_review_expense",
  create_transfer: "poseidon_create_transfer",
  annul_transfer: "poseidon_annul_transfer",
  create_gift: "poseidon_create_gift",
  annul_gift: "poseidon_annul_gift",
  create_treasury_transfer: "poseidon_create_treasury_transfer",
  annul_treasury_transfer: "poseidon_annul_treasury_transfer",
  create_partner_movement: "poseidon_create_partner_movement",
  annul_partner_movement: "poseidon_annul_partner_movement",
  save_salary_settlement: "poseidon_save_salary_settlement",
  annul_salary_settlement: "poseidon_annul_salary_settlement",
  close_salary_period: "poseidon_close_salary_period",
  start_salary_correction: "poseidon_start_salary_correction",
  close_salary_correction: "poseidon_close_salary_correction",
  cancel_salary_correction: "poseidon_cancel_salary_correction",
  manage_difference: "poseidon_manage_difference",
  save_local: "poseidon_save_local",
  delete_local: "poseidon_delete_local",
  save_machine: "poseidon_save_machine",
  reset_machine_counters: "poseidon_reset_machine_counters",
  move_machine_to_workshop: "poseidon_move_machine_to_workshop",
  delete_machine: "poseidon_delete_machine",
  assign_machines_to_local: "poseidon_assign_machines_to_local",
  create_periodic_closure: "poseidon_create_periodic_closure",
  annul_periodic_closure: "poseidon_annul_periodic_closure",
};

const normalizedBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const parseCommandResult = <Value>(value: unknown): PoseidonCommandResult<Value> => {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "El backend devolvio una respuesta invalida.", retryable: false };
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.ok === true) {
    return {
      ok: true,
      value: candidate.value as Value,
      revision: typeof candidate.revision === "string" ? candidate.revision : undefined,
    };
  }
  return {
    ok: false,
    error: typeof candidate.error === "string" ? candidate.error : "El comando remoto fue rechazado.",
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    retryable: candidate.retryable === true,
  };
};

export function createSupabaseCommandGateway(
  options: SupabaseCommandGatewayOptions,
): PoseidonCommandGateway {
  const baseUrl = normalizedBaseUrl(options.url);
  const request = options.fetch ?? fetch;

  return {
    async execute<Value, Payload>(
      command: PoseidonCommandRequest<Payload>,
    ): Promise<PoseidonCommandResult<Value>> {
      if (!baseUrl || !options.publishableKey.trim()) {
        return { ok: false, error: "El backend remoto no esta configurado.", retryable: false };
      }
      if (!validIdempotencyKey(command.idempotencyKey)) {
        return { ok: false, error: "La clave de idempotencia no es valida.", retryable: false };
      }
      let token: string | null;
      try {
        token = await options.accessToken();
      } catch {
        return {
          ok: false,
          error: "No se pudo validar la sesion remota.",
          retryable: true,
        };
      }
      if (!token) {
        return { ok: false, error: "La sesion remota no esta autenticada.", retryable: false };
      }

      try {
        const response = await request(`${baseUrl}/rest/v1/rpc/${rpcByCommand[command.name]}`, {
          method: "POST",
          headers: {
            apikey: options.publishableKey,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_idempotency_key: command.idempotencyKey,
            p_actor_function: command.actorFunction,
            p_local_id: command.localId ?? null,
            p_payload: command.payload,
          }),
        });
        const body = (await response.json().catch(() => undefined)) as unknown;
        if (!response.ok) {
          const errorBody = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
          return {
            ok: false,
            error:
              typeof errorBody.message === "string"
                ? errorBody.message
                : `El backend rechazo el comando (${response.status}).`,
            code: typeof errorBody.code === "string" ? errorBody.code : undefined,
            retryable: response.status >= 500 || response.status === 429,
          };
        }
        return parseCommandResult<Value>(body);
      } catch {
        return {
          ok: false,
          error: "No se pudo comunicar con el backend remoto.",
          retryable: true,
        };
      }
    },
  };
}
