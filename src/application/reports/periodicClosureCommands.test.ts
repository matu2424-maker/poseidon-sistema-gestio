import { describe, expect, it } from "vitest";
import { createSeedData, POSEIDON_LOCAL_ID } from "../../data/appData";
import { validateAppData } from "../../infrastructure/storage/appDataValidation";
import { commandContext } from "../command";
import { annulPeriodicClosureCommand, createPeriodicClosureCommand } from "./periodicClosureCommands";

const fixedContext = () => {
  const data = createSeedData();
  const manager = data.users.find((user) => user.role === "ENCARGADO")!;
  let sequence = 0;
  return {
    data,
    manager,
    context: commandContext(manager, "ENCARGADO", {
      now: () => "2026-07-19T12:00:00.000Z",
      id: (prefix) => `${prefix}-periodic-${++sequence}`,
    }),
  };
};

describe("comandos de cierre periodico", () => {
  it("genera una foto atomica de un unico local y la deja auditada", () => {
    const setup = fixedContext();
    const result = createPeriodicClosureCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        type: "MENSUAL",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        note: "Cierre mensual de control",
      },
      setup.context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      id: "periodic-periodic-1",
      visibleId: "PER-1",
      localId: POSEIDON_LOCAL_ID,
      status: "GENERADO",
      createdBy: setup.manager.id,
      note: "Cierre mensual de control",
    });
    expect(result.value.balanceIds).toHaveLength(3);
    expect(result.value.balanceIds.every((balanceId) => result.data.balances.find((item) => item.id === balanceId)?.localId === POSEIDON_LOCAL_ID)).toBe(true);
    expect(result.data.audit[0]).toMatchObject({
      action: "Generar cierre periodico",
      actorRole: "ENCARGADO",
      localId: POSEIDON_LOCAL_ID,
    });
    expect(validateAppData(result.data)).toMatchObject({ ok: true });
  });

  it("rechaza fechas, periodos vacios y funciones suplantadas sin mutar", () => {
    const setup = fixedContext();
    const before = JSON.stringify(setup.data);
    expect(
      createPeriodicClosureCommand(
        setup.data,
        {
          localId: POSEIDON_LOCAL_ID,
          type: "MENSUAL",
          startDate: "2026-07-31",
          endDate: "2026-07-01",
          note: "",
        },
        setup.context,
      ),
    ).toEqual({ ok: false, error: "La fecha inicial no puede ser mayor a la fecha final." });
    expect(
      createPeriodicClosureCommand(
        setup.data,
        {
          localId: POSEIDON_LOCAL_ID,
          type: "MENSUAL",
          startDate: "2026-08-01",
          endDate: "2026-08-31",
          note: "",
        },
        setup.context,
      ),
    ).toEqual({ ok: false, error: "No hay cajas cerradas dentro del periodo seleccionado." });

    const cashier = setup.data.users.find((user) => user.role === "CAJERO")!;
    const spoofed = commandContext(cashier, "ENCARGADO");
    expect(
      createPeriodicClosureCommand(
        setup.data,
        {
          localId: POSEIDON_LOCAL_ID,
          type: "MENSUAL",
          startDate: "2026-07-01",
          endDate: "2026-07-31",
          note: "",
        },
        spoofed,
      ),
    ).toEqual({ ok: false, error: "La funcion activa no corresponde al usuario autenticado." });
    expect(JSON.stringify(setup.data)).toBe(before);
  });

  it("anula sin recalcular ni borrar la foto y rechaza una segunda anulacion", () => {
    const setup = fixedContext();
    const created = createPeriodicClosureCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        type: "MENSUAL",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        note: "Foto original",
      },
      setup.context,
    );
    if (!created.ok) throw new Error(created.error);

    const annulled = annulPeriodicClosureCommand(
      created.data,
      created.value.id,
      "Periodo seleccionado por error",
      setup.context,
    );
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(annulled.value).toEqual({ ...created.value, status: "ANULADO" });
    expect(annulled.data.audit[0]).toMatchObject({
      action: "Anular cierre periodico",
      reason: "Periodo seleccionado por error",
      actorRole: "ENCARGADO",
    });
    expect(annulPeriodicClosureCommand(annulled.data, created.value.id, "Repetida", setup.context)).toEqual({
      ok: false,
      error: "El cierre periodico ya esta anulado.",
    });
  });
});
