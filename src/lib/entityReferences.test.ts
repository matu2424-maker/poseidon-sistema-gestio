import { describe, expect, it } from "vitest";
import { createSeedData } from "../data/appData";
import { closeSalaryPeriodCommand } from "../application/salaries/salaryClosureCommands";
import { commandContext } from "../application/command";
import { today } from "./dates";
import { clientDeletionReferences, localDeletionReferences, staffDeletionReferences } from "./entityReferences";

describe("integridad referencial para bajas definitivas", () => {
  it("detecta operaciones vinculadas a personal y clientes", () => {
    const data = createSeedData();
    const staffId = data.salarySettlements[0]?.staffId ?? "";
    const clientId = data.gifts[0]?.clientIds?.[0] ?? "";
    expect(staffDeletionReferences(data, staffId).some((item) => item.label === "liquidaciones salariales")).toBe(true);
    expect(clientDeletionReferences(data, clientId).some((item) => item.label === "regalos")).toBe(true);
  });

  it("protege clientes con transferencias aunque no tengan regalos", () => {
    const data = createSeedData();
    const clientId = data.clients[0].id;
    const scoped = {
      ...data,
      gifts: data.gifts.map((gift) => ({ ...gift, clientId: undefined, clientIds: [] })),
      transfers: data.transfers.map((transfer, index) => ({
        ...transfer,
        clientId: index === 0 ? clientId : undefined,
      })),
    };
    expect(clientDeletionReferences(scoped, clientId).map((item) => item.label)).toEqual(["transferencias"]);
  });

  it("protege el historial salarial aunque no existan liquidaciones", () => {
    const data = createSeedData();
    const staffId = data.staff[0].id;
    const scoped = {
      ...data,
      salarySettlements: data.salarySettlements.filter((settlement) => settlement.staffId !== staffId),
      accountMovements: data.accountMovements.filter((movement) => movement.accountId !== `account-staff-${staffId}`),
    };
    expect(staffDeletionReferences(scoped, staffId).map((item) => item.label)).toContain("historial salarial");
  });

  it("protege locales con recaudaciones e historial", () => {
    const data = createSeedData();
    expect(localDeletionReferences(data, data.locals[0].id).map((item) => item.label)).toContain("recaudaciones");
    expect(localDeletionReferences(data, data.locals[0].id).map((item) => item.label)).toContain("maquinas");
  });

  it("protege personal y local incluidos en una foto salarial cerrada", () => {
    const data = createSeedData();
    const user = data.users.find((item) => item.role === "ENCARGADO")!;
    const closed = closeSalaryPeriodCommand(
      { ...data, salaryClosures: [] },
      { period: today().slice(0, 7) },
      commandContext(user, "ENCARGADO"),
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    const staffId = data.staff[0].id;
    const scoped = {
      ...closed.data,
      salarySettlements: [],
      salaryHistories: [],
      accountMovements: [],
    };
    expect(staffDeletionReferences(scoped, staffId).map((item) => item.label)).toContain("cierres salariales");
    expect(localDeletionReferences(scoped, data.locals[0].id).map((item) => item.label)).toContain("cierres salariales");
  });
});
