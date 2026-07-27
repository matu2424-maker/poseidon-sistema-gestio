import type { Role } from "../../types";
import { SUPPORTED_REMOTE_SCHEMA_VERSION } from "./backendConfiguration";

type FetchLike = typeof fetch;

export type RemoteSessionLocal = {
  id: string;
  legacyId: string;
  visibleId: string;
  name: string;
  status: "ACTIVO" | "INACTIVO" | "CERRADO";
};

export type RemoteSessionContext = {
  schemaVersion: number;
  profile: {
    id: string;
    legacyId: string;
    username: string;
    displayName: string;
    role: Role;
  };
  locals: RemoteSessionLocal[];
};

export type RemoteSessionResult =
  | { ok: true; value: RemoteSessionContext }
  | { ok: false; error: string; retryable: boolean };

export type SupabaseSessionGatewayOptions = {
  url: string;
  publishableKey: string;
  accessToken: () => Promise<string | null>;
  fetch?: FetchLike;
};

const normalizedBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");
const roles = new Set<Role>(["CAJERO", "ENCARGADO", "ADMINISTRADOR"]);
const localStatuses = new Set(["ACTIVO", "INACTIVO", "CERRADO"]);

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stringField = (value: Record<string, unknown>, key: string) =>
  typeof value[key] === "string" ? value[key] : null;

const parseProfile = (value: unknown) => {
  const row = record(value);
  if (!row) return null;
  const id = stringField(row, "id");
  const legacyId = stringField(row, "legacy_id");
  const username = stringField(row, "username");
  const displayName = stringField(row, "display_name");
  const role = stringField(row, "role") as Role | null;
  if (!id || !legacyId || !username || !displayName || !role || !roles.has(role)) {
    return null;
  }
  return { id, legacyId, username, displayName, role };
};

const parseLocal = (value: unknown): RemoteSessionLocal | null => {
  const row = record(value);
  if (!row) return null;
  const id = stringField(row, "id");
  const legacyId = stringField(row, "legacy_id");
  const visibleId = stringField(row, "visible_id");
  const name = stringField(row, "name");
  const status = stringField(row, "status");
  if (
    !id ||
    !legacyId ||
    !visibleId ||
    !name ||
    !status ||
    !localStatuses.has(status)
  ) {
    return null;
  }
  return {
    id,
    legacyId,
    visibleId,
    name,
    status: status as RemoteSessionLocal["status"],
  };
};

export function createSupabaseSessionGateway(
  options: SupabaseSessionGatewayOptions,
) {
  const baseUrl = normalizedBaseUrl(options.url);
  const request = options.fetch ?? fetch;

  return {
    async load(): Promise<RemoteSessionResult> {
      if (!baseUrl || !options.publishableKey.trim()) {
        return {
          ok: false,
          error: "El backend remoto no esta configurado.",
          retryable: false,
        };
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
        return {
          ok: false,
          error: "La sesion remota no esta autenticada.",
          retryable: false,
        };
      }

      const headers = {
        apikey: options.publishableKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      try {
        const response = await request(
          `${baseUrl}/rest/v1/rpc/poseidon_session_context`,
          { method: "POST", headers, body: "{}" },
        );
        if (!response.ok) {
          return {
            ok: false,
            error: `No se pudo cargar el contexto remoto (${response.status}).`,
            retryable: response.status >= 500 || response.status === 429,
          };
        }
        const payload = record((await response.json()) as unknown);
        if (
          !payload ||
          payload.schema_version !== SUPPORTED_REMOTE_SCHEMA_VERSION ||
          !Array.isArray(payload.locals)
        ) {
          return {
            ok: false,
            error: "El backend devolvio un contexto de sesion invalido.",
            retryable: false,
          };
        }
        const profile = parseProfile(payload.profile);
        const locals = payload.locals.map(parseLocal);
        if (!profile || locals.some((local) => local === null)) {
          return {
            ok: false,
            error: "El backend devolvio un contexto de sesion invalido.",
            retryable: false,
          };
        }
        return {
          ok: true,
          value: {
            schemaVersion: SUPPORTED_REMOTE_SCHEMA_VERSION,
            profile,
            locals: locals as RemoteSessionLocal[],
          },
        };
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
