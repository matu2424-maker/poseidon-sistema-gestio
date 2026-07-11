import { describe, expect, it } from "vitest";
import type { Role } from "../types";
import { canAccessScreen, menuGroupsForRole, screenRequiresOpenCash, titleForScreen } from "./screens";

const roles: Role[] = ["CAJERO", "ENCARGADO", "ADMINISTRADOR"];

describe("screen registry", () => {
  it("solo expone en cada menu pantallas permitidas para ese rol", () => {
    roles.forEach((role) => {
      menuGroupsForRole(role).forEach((group) => {
        group.items.forEach((item) => expect(canAccessScreen(item.screen, role)).toBe(true));
      });
    });
  });

  it("obliga a cambiar a funcion cajero para operar caja", () => {
    expect(canAccessScreen("open-cash", "ENCARGADO")).toBe(false);
    expect(canAccessScreen("close-cash", "ADMINISTRADOR")).toBe(false);
    expect(canAccessScreen("open-cash", "CAJERO")).toBe(true);
    expect(canAccessScreen("cashier-summary", "ENCARGADO")).toBe(true);
    expect(menuGroupsForRole("ENCARGADO").flatMap((group) => group.items).some((item) => item.screen === "open-cash")).toBe(false);
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
});
