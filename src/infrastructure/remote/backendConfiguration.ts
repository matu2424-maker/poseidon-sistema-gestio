export type BackendConfiguration =
  | { mode: "local" }
  | {
      mode: "supabase";
      url: string;
      publishableKey: string;
      schemaVersion: number;
    };

export type BackendConfigurationResult =
  | { ok: true; value: BackendConfiguration }
  | { ok: false; error: string };

type PublicEnvironment = {
  VITE_POSEIDON_BACKEND?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_POSEIDON_REMOTE_SCHEMA?: string;
};

export const SUPPORTED_REMOTE_SCHEMA_VERSION = 2;

const validSupabaseUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
};

export function resolveBackendConfiguration(
  environment: PublicEnvironment,
): BackendConfigurationResult {
  const mode = environment.VITE_POSEIDON_BACKEND?.trim().toLowerCase() || "local";
  if (mode === "local") return { ok: true, value: { mode: "local" } };
  if (mode !== "supabase") {
    return { ok: false, error: "VITE_POSEIDON_BACKEND debe ser local o supabase." };
  }
  const url = environment.VITE_SUPABASE_URL?.trim() ?? "";
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!validSupabaseUrl(url)) {
    return { ok: false, error: "Configura una URL publica valida para Supabase." };
  }
  if (!publishableKey) {
    return { ok: false, error: "Configura la clave publicable de Supabase." };
  }
  const schemaVersion = Number(environment.VITE_POSEIDON_REMOTE_SCHEMA);
  if (schemaVersion !== SUPPORTED_REMOTE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `El backend remoto debe declarar el esquema ${SUPPORTED_REMOTE_SCHEMA_VERSION}.`,
    };
  }
  return {
    ok: true,
    value: {
      mode: "supabase",
      url: url.replace(/\/+$/, ""),
      publishableKey,
      schemaVersion,
    },
  };
}
