import { describe, expect, it } from "vitest";
import { clearOperationalData, createSeedData } from "../../data/appData";
import { localAccountBalances, principalAccountBalances } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { demoDataSummary, loadDemoDataCommand } from "./loadDemoData";

describe("carga integral de datos demo", () => {
  it("reemplaza la base limpia por un escenario completo y auditado", () => {
    const clean = clearOperationalData(createSeedData());
    const current = {
      ...clean,
      locals: clean.locals.map((local) => ({ ...local, tenantName: "Locatario personalizado" })),
    };
    const admin = current.users.find((user) => user.role === "ADMINISTRADOR")!;
    const result = loadDemoDataCommand(
      current,
      commandContext(admin, "ADMINISTRADOR", {
        now: () => "2026-07-18T13:00:00.000-03:00",
        id: (prefix) => `${prefix}-load-demo`,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toMatchObject({
      users: 4,
      staff: 1,
      clients: 2,
      machines: 3,
      closedBalances: 3,
      pendingDifferences: 1,
    });
    expect(result.value.expenses).toBeGreaterThan(0);
    expect(result.value.transfers).toBeGreaterThan(0);
    expect(result.value.gifts).toBeGreaterThan(0);
    expect(result.value.salarySettlements).toBeGreaterThan(0);
    expect(result.value.accountMovements).toBeGreaterThan(0);
    expect(result.data.balances.every((balance) => balance.status === "CERRADO")).toBe(true);
    expect(result.data.locals[0].tenantName).toBe("Locatario inicial");
    expect(
      Object.values(localAccountBalances(result.data, result.data.locals[0].id)).every(
        (amount) => Number.isFinite(amount) && amount >= 0,
      ),
    ).toBe(true);
    expect(
      Object.values(principalAccountBalances(result.data)).every((amount) => Number.isFinite(amount) && amount >= 0),
    ).toBe(true);
    expect(result.data.audit[0]).toMatchObject({
      id: "audit-load-demo",
      userId: admin.id,
      actorRole: "ADMINISTRADOR",
      action: "Cargar escenario demo integral",
      entity: "Sistema",
      entityId: "demo-data",
      createdAt: "2026-07-18T13:00:00.000-03:00",
    });
  });

  it("rechaza usuarios inactivos o una funcion distinta de Administrador", () => {
    const data = createSeedData();
    const admin = data.users.find((user) => user.role === "ADMINISTRADOR")!;
    const inactive = { ...admin, status: "INACTIVO" as const };

    expect(loadDemoDataCommand(data, commandContext(admin, "CAJERO"))).toEqual({
      ok: false,
      error: "Solo un Administrador en funcion Administrador puede cargar los datos demo.",
    });
    expect(loadDemoDataCommand(data, commandContext(inactive, "ADMINISTRADOR"))).toEqual({
      ok: false,
      error: "El usuario no esta activo.",
    });
    expect(demoDataSummary(data).closedBalances).toBe(3);
  });
});
