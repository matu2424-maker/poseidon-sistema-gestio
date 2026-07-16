import { describe, expect, it } from "vitest";
import type { AccountMovement, AppData } from "../../types";
import { clearOperationalData, createSeedData } from "../../data/appData";
import { localCashAccountId } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { openCashCommand } from "../cash/openCash";
import {
  cancelSalaryCorrectionCommand,
  closeSalaryCorrectionCommand,
  closeSalaryPeriodCommand,
  startSalaryCorrectionCommand,
} from "./salaryClosureCommands";
import { annulSalarySettlementCommand, saveSalarySettlementCommand } from "./salarySettlementCommands";

const testContext = (data: ReturnType<typeof createSeedData>) => {
  const user = data.users.find((item) => item.role === "ENCARGADO")!;
  let sequence = 0;
  return commandContext(user, "ENCARGADO", {
    now: () => `2026-08-05T15:00:${String(sequence).padStart(2, "0")}.000Z`,
    id: (prefix) => `${prefix}-test-${++sequence}`,
  });
};

const withLocalCash = (data: AppData, amount: number): AppData => {
  const localId = data.staff.find((item) => item.status === "ACTIVO")!.localId;
  const movement: AccountMovement = {
    id: "account-movement-test-cash",
    accountId: localCashAccountId(localId),
    sourceType: "APORTE",
    sourceId: "test-cash",
    direction: "ENTRADA",
    concept: "APORTE_PRUEBA",
    amount,
    detail: "Fondo de prueba salarial",
    status: "ACTIVO",
    userId: "user-admin",
    createdAt: "2026-08-01T12:00:00.000Z",
  };
  return { ...data, accountMovements: [movement, ...data.accountMovements] };
};

describe("cierre salarial definitivo", () => {
  it("congela importes por empleado y bloquea operaciones ordinarias", () => {
    const data = withLocalCash(clearOperationalData(createSeedData()), 5_000);
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const context = testContext(data);
    const cashier = data.users.find((item) => item.role === "CAJERO")!;
    const denied = closeSalaryPeriodCommand(data, { period: "2026-07" }, commandContext(cashier, "CAJERO"));
    expect(denied).toMatchObject({ ok: false });
    const advance = saveSalarySettlementCommand(
      data,
      {
        staffId: staff.id,
        period: "2026-07",
        concept: "ADELANTO",
        amount: 1000,
        notes: "Adelanto previo al cierre",
        origin: "LIQUIDACION",
      },
      context,
    );
    expect(advance.ok).toBe(true);
    if (!advance.ok) return;

    const closed = closeSalaryPeriodCommand(advance.data, { period: "2026-07" }, context);
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    const employeeSnapshot = closed.value.employeeSnapshots.find((item) => item.staffId === staff.id);
    expect(closed.value).toMatchObject({ kind: "ORDINARIO", revision: 0, status: "CERRADO", snapshotVersion: 1 });
    expect(employeeSnapshot).toMatchObject({ advances: 1000, settlementIds: [advance.value.id] });
    expect(employeeSnapshot?.settlements[0]).toMatchObject({ id: advance.value.id, amount: 1000, concept: "ADELANTO" });
    expect(closed.data.audit.find((event) => event.action === "Cerrar periodo salarial definitivo")?.localIds).toContain(staff.localId);

    const ordinaryChange = saveSalarySettlementCommand(
      closed.data,
      {
        staffId: staff.id,
        period: "2026-07",
        concept: "EXTRA",
        amount: 500,
        notes: "No autorizado",
        origin: "LIQUIDACION",
      },
      context,
    );
    expect(ordinaryChange).toMatchObject({ ok: false });
    if (!ordinaryChange.ok) expect(ordinaryChange.error).toContain("esta cerrado");

    const ordinaryAnnulment = annulSalarySettlementCommand(closed.data, advance.value.id, context);
    expect(ordinaryAnnulment).toMatchObject({ ok: false });
  });

  it("encadena una correccion sin modificar la foto original", () => {
    const data = withLocalCash(clearOperationalData(createSeedData()), 5_000);
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const context = testContext(data);
    const closed = closeSalaryPeriodCommand(data, { period: "2026-07" }, context);
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    const originalSnapshot = structuredClone(closed.value.employeeSnapshots);

    const missingReason = startSalaryCorrectionCommand(
      closed.data,
      { parentClosureId: closed.value.id, note: "" },
      context,
    );
    expect(missingReason).toMatchObject({ ok: false });

    const started = startSalaryCorrectionCommand(
      closed.data,
      { parentClosureId: closed.value.id, note: "Premio omitido en el cierre" },
      context,
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.value).toMatchObject({ kind: "CORRECTIVO", revision: 1, parentClosureId: closed.value.id, status: "CORRECCION_ABIERTA" });

    const noChanges = closeSalaryCorrectionCommand(started.data, started.value.id, context);
    expect(noChanges).toMatchObject({ ok: false });

    const correction = saveSalarySettlementCommand(
      started.data,
      {
        staffId: staff.id,
        period: "2026-07",
        concept: "EXTRA",
        amount: 500,
        notes: "Premio corregido",
        origin: "LIQUIDACION",
        correctionClosureId: started.value.id,
      },
      context,
    );
    expect(correction.ok).toBe(true);
    if (!correction.ok) return;
    expect(correction.value.correctionClosureId).toBe(started.value.id);

    const finished = closeSalaryCorrectionCommand(correction.data, started.value.id, context);
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.value).toMatchObject({ status: "CERRADO", kind: "CORRECTIVO", revision: 1, parentClosureId: closed.value.id });
    expect(finished.value.employeeSnapshots.find((item) => item.staffId === staff.id)?.extraAmount).toBe(500);
    expect(finished.data.salaryClosures.find((item) => item.id === closed.value.id)?.employeeSnapshots).toEqual(originalSnapshot);

    const afterCorrection = saveSalarySettlementCommand(
      finished.data,
      {
        staffId: staff.id,
        period: "2026-07",
        concept: "EXTRA",
        amount: 100,
        notes: "Intento fuera de revision",
        origin: "LIQUIDACION",
        correctionClosureId: started.value.id,
      },
      context,
    );
    expect(afterCorrection).toMatchObject({ ok: false });
    expect(finished.data.audit.some((event) => event.action === "Cerrar ajuste correctivo salarial")).toBe(true);
  });

  it("permite cancelar una correccion vacia sin borrar su auditoria", () => {
    const data = clearOperationalData(createSeedData());
    const context = testContext(data);
    const closed = closeSalaryPeriodCommand(data, { period: "2026-07" }, context);
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    const started = startSalaryCorrectionCommand(
      closed.data,
      { parentClosureId: closed.value.id, note: "Correccion abierta por error" },
      context,
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const cancelled = cancelSalaryCorrectionCommand(started.data, started.value.id, context);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(cancelled.value.status).toBe("ANULADO");
    expect(cancelled.data.salaryClosures.find((item) => item.id === closed.value.id)?.status).toBe("CERRADO");
    expect(cancelled.data.audit.some((event) => event.action === "Cancelar ajuste correctivo salarial")).toBe(true);
    const restarted = startSalaryCorrectionCommand(
      cancelled.data,
      { parentClosureId: closed.value.id, note: "Segundo intento" },
      context,
    );
    expect(restarted.ok).toBe(true);
    if (restarted.ok) expect(restarted.value.revision).toBe(2);
  });

  it("rechaza cerrar salarios con pagos vinculados a una caja abierta", () => {
    const data = clearOperationalData(createSeedData());
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const context = testContext(data);
    const opened = openCashCommand(
      data,
      {
        localId: staff.localId,
        operatingDate: "2026-08-05",
        initialFund: 1_000,
        initialBankFund: 0,
        initialNote: "Prueba salarial",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const payment = saveSalarySettlementCommand(
      opened.data,
      {
        staffId: staff.id,
        period: "2026-08",
        concept: "SALARIO",
        amount: 1000,
        notes: "Pago en caja abierta",
        origin: "CAJA",
        balanceId: opened.value.id,
      },
      context,
    );
    expect(payment.ok).toBe(true);
    if (!payment.ok) return;
    const closed = closeSalaryPeriodCommand(payment.data, { period: "2026-08" }, context);
    expect(closed).toMatchObject({ ok: false });
    if (!closed.ok) expect(closed.error).toContain("caja abierta");
  });
});
