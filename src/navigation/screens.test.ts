import { describe, expect, it } from "vitest";
import type { Role } from "../types";
import {
  canAccessScreen,
  menuGroupsForRole,
  pathForScreen,
  screenDefinitions,
  screenForPath,
  screenRequiresOpenCash,
  titleForScreen,
} from "./screens";

const roles: Role[] = ["CAJERO", "ENCARGADO", "ADMINISTRADOR"];

describe("screen registry", () => {
  it("solo expone en cada menu pantallas permitidas para ese rol", () => {
    roles.forEach((role) => {
      menuGroupsForRole(role).forEach((group) => {
        group.items.forEach((item) => expect(canAccessScreen(item.screen, role)).toBe(true));
      });
    });
  });

  it("reserva el ciclo de caja al cajero y concentra la tesoreria del encargado en cuentas corrientes", () => {
    expect(canAccessScreen("open-cash", "ENCARGADO")).toBe(false);
    expect(canAccessScreen("close-cash", "ADMINISTRADOR")).toBe(false);
    expect(canAccessScreen("open-cash", "CAJERO")).toBe(true);
    expect(canAccessScreen("expenses", "ENCARGADO")).toBe(false);
    expect(canAccessScreen("capital-movements", "ENCARGADO")).toBe(false);
    expect(canAccessScreen("transfers", "ENCARGADO")).toBe(false);
    expect(canAccessScreen("cashier-summary", "ENCARGADO")).toBe(true);
    const managerScreens = menuGroupsForRole("ENCARGADO").flatMap((group) => group.items).map((item) => item.screen);
    expect(managerScreens).not.toContain("open-cash");
    expect(managerScreens).not.toContain("expenses");
    expect(managerScreens).not.toContain("capital-movements");
    expect(managerScreens).toContain("admin-current-accounts");
  });

  it("marca las operaciones que necesitan caja abierta", () => {
    expect(screenRequiresOpenCash("counters")).toBe(true);
    expect(screenRequiresOpenCash("cashier-clients")).toBe(false);
    expect(screenRequiresOpenCash("cashier-summary")).toBe(false);
  });

  it("resuelve titulos dependientes del rol", () => {
    expect(titleForScreen("panel", "ENCARGADO")).toBe("Panel del encargado");
    expect(titleForScreen("panel", "ADMINISTRADOR")).toBe("Reportes y administracion");
  });

  it("define una ruta unica para cada pantalla", () => {
    const paths = Object.values(screenDefinitions).map((definition) => definition.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("resuelve pantalla y ruta en ambos sentidos", () => {
    expect(pathForScreen("differences")).toBe("/diferencias");
    expect(screenForPath("/diferencias")).toBe("differences");
    expect(screenForPath("/caja/contadores/")).toBe("counters");
    expect(screenForPath("/ruta-inexistente")).toBeNull();
  });
});
