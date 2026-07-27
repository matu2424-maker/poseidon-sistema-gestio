import { describe, expect, it, vi } from "vitest";
import { createSupabaseSessionGateway } from "./supabaseSessionGateway";

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("SupabaseSessionGateway", () => {
  it("carga el perfil derivado del token y resuelve locales UUID visibles por RLS", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          schema_version: 3,
          profile: {
            id: "12000000-0000-4000-8000-000000000001",
            legacy_id: "encargado",
            username: "encargado",
            display_name: "Encargado",
            role: "ENCARGADO",
          },
          locals: [
          {
            id: "22000000-0000-4000-8000-000000000001",
            legacy_id: "1",
            visible_id: "1",
            name: "Poseidon",
            status: "ACTIVO",
          },
          ],
        }),
      );
    const gateway = createSupabaseSessionGateway({
      url: "https://poseidon.example.supabase.co/",
      publishableKey: "public-key",
      accessToken: async () => "access-token",
      fetch: request,
    });

    await expect(gateway.load()).resolves.toEqual({
      ok: true,
      value: {
        schemaVersion: 3,
        profile: {
          id: "12000000-0000-4000-8000-000000000001",
          legacyId: "encargado",
          username: "encargado",
          displayName: "Encargado",
          role: "ENCARGADO",
        },
        locals: [
          {
            id: "22000000-0000-4000-8000-000000000001",
            legacyId: "1",
            visibleId: "1",
            name: "Poseidon",
            status: "ACTIVO",
          },
        ],
      },
    });
    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0];
    expect(url).toBe(
      "https://poseidon.example.supabase.co/rest/v1/rpc/poseidon_session_context",
    );
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        apikey: "public-key",
        Authorization: "Bearer access-token",
      },
      body: "{}",
    });
  });

  it("rechaza perfiles ambiguos o payloads fuera del contrato", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(
        jsonResponse({
          schema_version: 2,
          profile: {},
          locals: [],
        }),
      );
    const gateway = createSupabaseSessionGateway({
      url: "https://poseidon.example.supabase.co",
      publishableKey: "public-key",
      accessToken: async () => "access-token",
      fetch: request,
    });

    await expect(gateway.load()).resolves.toEqual({
      ok: false,
      error: "El backend devolvio un contexto de sesion invalido.",
      retryable: false,
    });
    await expect(gateway.load()).resolves.toEqual({
      ok: false,
      error: "El backend devolvio un contexto de sesion invalido.",
      retryable: false,
    });
  });

  it("clasifica configuracion, sesion, HTTP y red antes de exponer datos", async () => {
    await expect(
      createSupabaseSessionGateway({
        url: "",
        publishableKey: "",
        accessToken: async () => "token",
      }).load(),
    ).resolves.toMatchObject({ ok: false, retryable: false });

    const request = vi.fn<typeof fetch>();
    await expect(
      createSupabaseSessionGateway({
        url: "https://poseidon.example.supabase.co",
        publishableKey: "public-key",
        accessToken: async () => null,
        fetch: request,
      }).load(),
    ).resolves.toMatchObject({ ok: false, retryable: false });
    expect(request).not.toHaveBeenCalled();

    const rejected = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({}, 503));
    await expect(
      createSupabaseSessionGateway({
        url: "https://poseidon.example.supabase.co",
        publishableKey: "public-key",
        accessToken: async () => "token",
        fetch: rejected,
      }).load(),
    ).resolves.toMatchObject({ ok: false, retryable: true });

    await expect(
      createSupabaseSessionGateway({
        url: "https://poseidon.example.supabase.co",
        publishableKey: "public-key",
        accessToken: async () => "token",
        fetch: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
      }).load(),
    ).resolves.toMatchObject({ ok: false, retryable: true });
  });
});
