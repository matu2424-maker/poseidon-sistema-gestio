import { describe, expect, it } from "vitest";
import { createSeedData, POSEIDON_LOCAL_ID } from "../../data/appData";
import { WORKSHOP_LOCAL_ID } from "../../data/appDataIds";
import { localBankAccountId, localCashAccountId } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { deleteLocalCommand, saveLocalCommand } from "../locations/localCommands";
import {
  assignMachinesToLocalCommand,
  deleteMachineCommand,
  moveMachineToWorkshopCommand,
  resetMachineCountersCommand,
  saveMachineCommand,
} from "./machineCommands";

function setup() {
  const data = createSeedData();
  const user = data.users.find((item) => item.username === "admin")!;
  let sequence = 0;
  const context = commandContext(user, "ADMINISTRADOR", {
    now: () => "2026-07-11T14:00:00.000Z",
    id: (prefix) => `${prefix}-asset-${++sequence}`,
  });
  return { data, context };
}

describe("comandos de locales y maquinas", () => {
  it("crea un local con maquina del taller y al cerrarlo devuelve la maquina", () => {
    const base = setup();
    const workshopMachine = { ...base.data.machines[0], localId: WORKSHOP_LOCAL_ID, location: "Taller" };
    const data = {
      ...base.data,
      machines: base.data.machines.map((machine) => (machine.id === workshopMachine.id ? workshopMachine : machine)),
    };
    const created = saveLocalCommand(
      data,
      {
        id: "2",
        name: "Local Norte",
        tenantName: "Locatario",
        phone: "099123456",
        email: "local@example.com",
        address: "Calle 1",
        googleMapsUrl: "",
        images: [],
        status: "ACTIVO",
        selectedWorkshopMachineIds: [workshopMachine.id],
      },
      base.context,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.machines.find((machine) => machine.id === workshopMachine.id)?.localId).toBe("2");
    expect(created.data.currentAccounts.some((account) => account.id === localCashAccountId("2"))).toBe(true);
    expect(created.data.currentAccounts.some((account) => account.id === localBankAccountId("2"))).toBe(true);
    expect(created.data.machineLocalHistory.slice(0, 2).every((event) => event.createdAt === "2026-07-11T14:00:00.000Z")).toBe(true);

    const closed = saveLocalCommand(
      created.data,
      {
        localId: "2",
        id: "2",
        name: "Local Norte",
        tenantName: "Locatario",
        phone: "099123456",
        email: "local@example.com",
        address: "Calle 1",
        googleMapsUrl: "",
        images: [],
        status: "CERRADO",
      },
      base.context,
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.data.machines.find((machine) => machine.id === workshopMachine.id)?.localId).toBe(WORKSHOP_LOCAL_ID);
    expect(closed.data.currentAccounts.find((account) => account.id === localCashAccountId("2"))?.status).toBe("INACTIVA");
    expect(closed.data.audit[0]).toMatchObject({ action: "Cerrar local", actorRole: "ADMINISTRADOR" });
  });

  it("elimina un local sin referencias y rechaza uno con historial", () => {
    const base = setup();
    const created = saveLocalCommand(
      base.data,
      {
        id: "3",
        name: "Local Temporal",
        tenantName: "",
        phone: "",
        email: "",
        address: "",
        googleMapsUrl: "",
        images: [],
        status: "INACTIVO",
      },
      base.context,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const deleted = deleteLocalCommand(created.data, "3", base.context);
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.data.locals.some((local) => local.id === "3")).toBe(false);
    expect(deleted.data.currentAccounts.some((account) => account.entityId === "3")).toBe(false);

    const protectedResult = deleteLocalCommand(base.data, POSEIDON_LOCAL_ID, base.context);
    expect(protectedResult).toEqual({ ok: false, error: "El local principal no se puede quitar." });
  });

  it("crea, asigna, ajusta, resetea, envia al taller y elimina una maquina sin recaudaciones", () => {
    const base = setup();
    const created = saveMachineCommand(
      base.data,
      {
        visibleId: "20",
        name: "Maquina prueba",
        localId: POSEIDON_LOCAL_ID,
        location: "Salon",
        status: "ACTIVA",
        lastIn: 9_000,
        lastOut: 8_000,
        notes: "Nueva",
      },
      base.context,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value).toMatchObject({ localId: WORKSHOP_LOCAL_ID, lastIn: 0, lastOut: 0 });

    const assigned = assignMachinesToLocalCommand(
      created.data,
      POSEIDON_LOCAL_ID,
      [created.value.id],
      base.context,
    );
    expect(assigned.ok).toBe(true);
    if (!assigned.ok) return;
    const assignedMachine = assigned.value[0];
    expect(assignedMachine.localId).toBe(POSEIDON_LOCAL_ID);

    const adjusted = saveMachineCommand(
      assigned.data,
      {
        machineId: assignedMachine.id,
        visibleId: assignedMachine.visibleId,
        name: assignedMachine.name,
        localId: assignedMachine.localId,
        location: assignedMachine.location,
        status: assignedMachine.status,
        lastIn: 5_000,
        lastOut: 1_000,
        notes: assignedMachine.notes,
      },
      base.context,
    );
    expect(adjusted.ok).toBe(true);
    if (!adjusted.ok) return;

    const withOpenCash = {
      ...adjusted.data,
      balances: [
        {
          ...adjusted.data.balances[0],
          id: "balance-open-test",
          localId: POSEIDON_LOCAL_ID,
          operatingDate: "2026-07-11",
          status: "EN_PROCESO" as const,
        },
        ...adjusted.data.balances,
      ],
    };
    const blockedReset = resetMachineCountersCommand(withOpenCash, assignedMachine.id, base.context);
    expect(blockedReset.ok).toBe(false);
    expect(moveMachineToWorkshopCommand(withOpenCash, assignedMachine.id, base.context)).toMatchObject({
      ok: false,
      error: "No se puede enviar la maquina al Taller mientras su local tenga una caja abierta.",
    });
    expect(
      saveMachineCommand(
        withOpenCash,
        {
          machineId: assignedMachine.id,
          visibleId: assignedMachine.visibleId,
          name: assignedMachine.name,
          localId: assignedMachine.localId,
          location: assignedMachine.location,
          status: assignedMachine.status,
          lastIn: 6_000,
          lastOut: 1_000,
          notes: assignedMachine.notes,
        },
        base.context,
      ),
    ).toMatchObject({
      ok: false,
      error: "No se puede mover la maquina ni ajustar sus contadores mientras el local tenga una caja abierta.",
    });

    const reset = resetMachineCountersCommand(adjusted.data, assignedMachine.id, base.context);
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    expect(reset.value).toMatchObject({ lastIn: 0, lastOut: 0 });
    const workshop = moveMachineToWorkshopCommand(reset.data, assignedMachine.id, base.context);
    expect(workshop.ok).toBe(true);
    if (!workshop.ok) return;
    const deleted = deleteMachineCommand(workshop.data, assignedMachine.id, base.context);
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.data.machines.some((machine) => machine.id === assignedMachine.id)).toBe(false);
    expect(deleted.data.machineLocalHistory[0]).toMatchObject({ action: "QUITADA", userId: base.context.user.id });
  });

  it("bloquea asignaciones y cierre de local mientras exista una caja abierta", () => {
    const base = setup();
    const workshopMachine = { ...base.data.machines[0], localId: WORKSHOP_LOCAL_ID, location: "Taller" };
    const data = {
      ...base.data,
      machines: base.data.machines.map((machine) => (machine.id === workshopMachine.id ? workshopMachine : machine)),
      balances: [
        {
          ...base.data.balances[0],
          id: "balance-open-guards",
          localId: POSEIDON_LOCAL_ID,
          operatingDate: "2026-07-12",
          status: "EN_PROCESO" as const,
        },
        ...base.data.balances,
      ],
    };

    expect(assignMachinesToLocalCommand(data, POSEIDON_LOCAL_ID, [workshopMachine.id], base.context)).toMatchObject({
      ok: false,
      error: "No se pueden asignar maquinas mientras el local tenga una caja abierta.",
    });
    expect(
      saveLocalCommand(
        data,
        {
          localId: POSEIDON_LOCAL_ID,
          id: POSEIDON_LOCAL_ID,
          name: data.locals[0].name,
          tenantName: data.locals[0].tenantName,
          phone: data.locals[0].phone,
          email: data.locals[0].email,
          address: data.locals[0].address,
          googleMapsUrl: data.locals[0].googleMapsUrl,
          images: data.locals[0].images,
          status: "CERRADO",
        },
        base.context,
      ),
    ).toMatchObject({ ok: false, error: "No se puede cerrar el local mientras tenga una caja abierta." });
  });

  it("impide eliminar una maquina con recaudaciones y asignar desuso", () => {
    const base = setup();
    const machine = base.data.machines[0];
    const workshop = moveMachineToWorkshopCommand(base.data, machine.id, base.context);
    expect(workshop.ok).toBe(true);
    if (!workshop.ok) return;
    expect(deleteMachineCommand(workshop.data, machine.id, base.context)).toEqual({
      ok: false,
      error: "No se puede eliminar una maquina que tenga recaudaciones.",
    });

    const disusedData = {
      ...workshop.data,
      machines: workshop.data.machines.map((item) =>
        item.id === machine.id ? { ...item, status: "DESUSO" as const } : item,
      ),
    };
    expect(assignMachinesToLocalCommand(disusedData, POSEIDON_LOCAL_ID, [machine.id], base.context)).toEqual({
      ok: false,
      error: "Solo se pueden asignar maquinas disponibles del Taller.",
    });
  });
});
