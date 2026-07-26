import { describe, expect, it } from "vitest";
import { resolveBackendConfiguration } from "./backendConfiguration";

describe("configuracion publica del backend", () => {
  it("mantiene local como modo seguro por defecto", () => {
    expect(resolveBackendConfiguration({})).toEqual({ ok: true, value: { mode: "local" } });
  });

  it("exige configuracion publica completa para activar Supabase", () => {
    expect(resolveBackendConfiguration({ VITE_POSEIDON_BACKEND: "supabase" })).toEqual({
      ok: false,
      error: "Configura una URL publica valida para Supabase.",
    });
    expect(
      resolveBackendConfiguration({
        VITE_POSEIDON_BACKEND: "supabase",
        VITE_SUPABASE_URL: "https://poseidon.example.supabase.co",
      }),
    ).toEqual({ ok: false, error: "Configura la clave publicable de Supabase." });
  });

  it("normaliza un backend Supabase habilitado explicitamente", () => {
    expect(
      resolveBackendConfiguration({
        VITE_POSEIDON_BACKEND: "SUPABASE",
        VITE_SUPABASE_URL: "https://poseidon.example.supabase.co/",
        VITE_SUPABASE_PUBLISHABLE_KEY: "public-key",
      }),
    ).toEqual({
      ok: true,
      value: {
        mode: "supabase",
        url: "https://poseidon.example.supabase.co",
        publishableKey: "public-key",
      },
    });
  });
});
