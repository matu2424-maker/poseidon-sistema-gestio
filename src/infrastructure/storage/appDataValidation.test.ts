import { describe, expect, it } from "vitest";
import type { AppData } from "../../types";
import { createSeedData } from "../../data/appData";
import { WORKSHOP_LOCAL_ID } from "../../data/appDataIds";
import { AppDataValidationError, assertValidAppData, validateAppData } from "./appDataValidation";

describe("validacion profunda de AppData", () => {
  it("acepta el escenario vigente completo", () => {
    const data = createSeedData();
    expect(validateAppData(data)).toEqual({ ok: true, data });
  });

  it("informa colecciones faltantes y enums invalidos con su ruta", () => {
    const seed = createSeedData();
    const withoutGifts: Partial<AppData> = { ...seed };
    delete withoutGifts.gifts;
    const invalid = {
      ...withoutGifts,
      machines: seed.machines.map((machine, index) =>
        index === 0 ? { ...machine, status: "ROTA" } : machine,
      ),
    };
    const result = validateAppData(invalid);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "gifts", code: "STRUCTURE" }),
        expect.objectContaining({ path: "machines[0].status", code: "STRUCTURE" }),
      ]),
    );
  });

  it("detecta IDs duplicados y referencias huerfanas", () => {
    const seed = createSeedData();
    const invalid: AppData = {
      ...seed,
      users: [...seed.users, { ...seed.users[0] }],
      expenses: seed.expenses.map((expense, index) =>
        index === 0 ? { ...expense, paymentAccountId: "account-inexistente" } : expense,
      ),
    };
    const result = validateAppData(invalid);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "users[0].id", code: "DUPLICATE_ID" }),
        expect.objectContaining({ path: "expenses[0].paymentAccountId", code: "MISSING_REFERENCE" }),
      ]),
    );
  });

  it("detecta entidades asociadas a otra caja y asientos sin fuente", () => {
    const seed = createSeedData();
    const otherLocal = { ...seed.locals[0], id: "2", name: "Local 2" };
    const invalid: AppData = {
      ...seed,
      locals: [...seed.locals, otherLocal],
      expenses: seed.expenses.map((expense, index) =>
        index === 0 ? { ...expense, localId: otherLocal.id } : expense,
      ),
      accountMovements: seed.accountMovements.map((movement, index) =>
        index === 0 ? { ...movement, sourceId: "salary-inexistente" } : movement,
      ),
    };
    const result = validateAppData(invalid);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "expenses[0].balanceId", code: "INVARIANT" }),
        expect.objectContaining({ path: "accountMovements[0].sourceId", code: "MISSING_REFERENCE" }),
      ]),
    );
  });

  it("permite conservar el historial de una maquina eliminada en Taller", () => {
    const seed = createSeedData();
    const deletedMachineId = "machine-deleted";
    const data: AppData = {
      ...seed,
      machineLocalHistory: [
        {
          id: "history-deleted-machine",
          machineId: deletedMachineId,
          machineVisibleId: "999",
          machineName: "Maquina eliminada",
          localId: WORKSHOP_LOCAL_ID,
          action: "QUITADA",
          detail: "Baja definitiva desde taller",
          createdAt: "2026-07-19T10:00:00.000Z",
          userId: seed.users[0].id,
        },
        {
          id: "history-deleted-machine-previous",
          machineId: deletedMachineId,
          machineVisibleId: "999",
          machineName: "Maquina eliminada",
          localId: WORKSHOP_LOCAL_ID,
          action: "AGREGADA",
          detail: "Alta historica",
          createdAt: "2026-07-18T10:00:00.000Z",
          userId: seed.users[0].id,
        },
        ...seed.machineLocalHistory,
      ],
    };
    expect(validateAppData(data).ok).toBe(true);
  });

  it("permite conservar el alcance de auditoria de Taller y de un local eliminado", () => {
    const seed = createSeedData();
    const historicalLocalId = "99";
    const data: AppData = {
      ...seed,
      audit: [
        {
          ...seed.audit[0],
          id: "audit-local-eliminado",
          entity: "Local",
          entityId: historicalLocalId,
          localId: historicalLocalId,
          localIds: [historicalLocalId, WORKSHOP_LOCAL_ID],
        },
        ...seed.audit,
      ],
    };

    expect(validateAppData(data)).toMatchObject({ ok: true });
  });

  it("rechaza dos cajas abiertas para el mismo local", () => {
    const seed = createSeedData();
    const closed = seed.balances.find((balance) => balance.status === "CERRADO")!;
    const invalid: AppData = {
      ...seed,
      balances: [
        { ...closed, id: "open-a", visibleId: "OPEN-A", status: "EN_PROCESO", closedAt: undefined },
        { ...closed, id: "open-b", visibleId: "OPEN-B", status: "EN_PROCESO", closedAt: undefined },
        ...seed.balances,
      ],
    };
    const result = validateAppData(invalid);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "balances[1].status", code: "INVARIANT" })]),
    );
  });

  it("expone un error tipado con el informe completo", () => {
    expect(() => assertValidAppData({ users: [], locals: [], machines: [] })).toThrow(AppDataValidationError);
  });
});
