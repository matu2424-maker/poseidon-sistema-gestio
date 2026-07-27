import { describe, expect, it, vi } from "vitest";
import { createSupabaseCommandGateway } from "./supabaseCommandGateway";

const localId = "22000000-0000-4000-8000-000000000001";

describe("SupabaseCommandGateway", () => {
  it("envia identidad por token y no acepta usuario real desde el payload de transporte", async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ ok: true, value: { visibleId: "POSE-20" }, revision: "20" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const gateway = createSupabaseCommandGateway({
      url: "https://poseidon.example.supabase.co/",
      publishableKey: "public-key",
      accessToken: async () => "user-access-token",
      fetch: request,
    });

    const result = await gateway.execute({
      name: "open_cash",
      idempotencyKey: "cash-open:poseidon:20",
      actorFunction: "CAJERO",
      localId,
      payload: { operatingDate: "2026-07-26" },
    });

    expect(result).toEqual({ ok: true, value: { visibleId: "POSE-20" }, revision: "20" });
    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("https://poseidon.example.supabase.co/rest/v1/rpc/poseidon_open_cash");
    expect(init?.headers).toMatchObject({
      apikey: "public-key",
      Authorization: "Bearer user-access-token",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      p_idempotency_key: "cash-open:poseidon:20",
      p_actor_function: "CAJERO",
      p_local_id: localId,
      p_payload: { operatingDate: "2026-07-26" },
    });
  });

  it("rechaza configuracion, sesion e idempotencia invalidas antes de hacer red", async () => {
    const request = vi.fn();
    const unconfigured = createSupabaseCommandGateway({
      url: "",
      publishableKey: "",
      accessToken: async () => "token",
      fetch: request,
    });
    await expect(
      unconfigured.execute({
        name: "close_cash",
        idempotencyKey: "cash-close:20",
        actorFunction: "CAJERO",
        payload: {},
      }),
    ).resolves.toMatchObject({ ok: false, retryable: false });

    const configured = createSupabaseCommandGateway({
      url: "https://poseidon.example.supabase.co",
      publishableKey: "public-key",
      accessToken: async () => null,
      fetch: request,
    });
    await expect(
      configured.execute({
        name: "close_cash",
        idempotencyKey: "short",
        actorFunction: "CAJERO",
        payload: {},
      }),
    ).resolves.toEqual({ ok: false, error: "La clave de idempotencia no es valida.", retryable: false });
    await expect(
      configured.execute({
        name: "close_cash",
        idempotencyKey: "cash-close:20",
        actorFunction: "CAJERO",
        payload: {},
      }),
    ).resolves.toEqual({ ok: false, error: "La sesion remota no esta autenticada.", retryable: false });
    await expect(
      configured.execute({
        name: "close_cash",
        idempotencyKey: "cash-close:invalid-local",
        actorFunction: "CAJERO",
        localId: "1",
        payload: {},
      }),
    ).resolves.toEqual({
      ok: false,
      error: "El identificador remoto del local no es un UUID valido.",
      retryable: false,
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("clasifica errores HTTP y de red sin reintentar rechazos de negocio", async () => {
    const rejected = createSupabaseCommandGateway({
      url: "https://poseidon.example.supabase.co",
      publishableKey: "public-key",
      accessToken: async () => "token",
      fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return new Response(JSON.stringify({ code: "P0001", message: "Saldo insuficiente" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }),
    });
    await expect(
      rejected.execute({
        name: "create_expense",
        idempotencyKey: "expense:create:100",
        actorFunction: "ENCARGADO",
        localId,
        payload: { amount: 100 },
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Saldo insuficiente",
      code: "P0001",
      retryable: false,
    });

    const offline = createSupabaseCommandGateway({
      url: "https://poseidon.example.supabase.co",
      publishableKey: "public-key",
      accessToken: async () => "token",
      fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        throw new Error("offline");
      }),
    });
    await expect(
      offline.execute({
        name: "create_expense",
        idempotencyKey: "expense:create:101",
        actorFunction: "ENCARGADO",
        localId,
        payload: { amount: 100 },
      }),
    ).resolves.toEqual({
      ok: false,
      error: "No se pudo comunicar con el backend remoto.",
      retryable: true,
    });
  });

  it("trata un fallo al recuperar la sesion como error remoto reintentable", async () => {
    const request = vi.fn();
    const gateway = createSupabaseCommandGateway({
      url: "https://poseidon.example.supabase.co",
      publishableKey: "public-key",
      accessToken: async () => {
        throw new Error("auth unavailable");
      },
      fetch: request,
    });

    await expect(
      gateway.execute({
        name: "review_expense",
        idempotencyKey: `expense:review:${"x".repeat(185)}`,
        actorFunction: "ENCARGADO",
        localId,
        payload: { expenseId: "expense-1" },
      }),
    ).resolves.toEqual({
      ok: false,
      error: "No se pudo validar la sesion remota.",
      retryable: true,
    });
    expect(request).not.toHaveBeenCalled();
  });
});
