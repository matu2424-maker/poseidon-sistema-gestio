import { describe, expect, it } from "vitest";
import { clearOperationalData, createSeedData, POSEIDON_LOCAL_ID } from "../../data/appData";
import { localAccountBalances, partnerAccountBalance, principalAccountBalances } from "../../lib/currentAccounts";
import { totalsForBalance } from "../../lib/cashTotals";
import { commandContext } from "../command";
import { openCashCommand } from "../cash/openCash";
import {
  annulPartnerMovementCommand,
  annulTreasuryTransferCommand,
  createPartnerMovementCommand,
  createTreasuryTransferCommand,
} from "./treasuryCommands";

function setup() {
  const clean = clearOperationalData(createSeedData());
  const cashier = clean.users.find((user) => user.role === "CAJERO")!;
  const manager = clean.users.find((user) => user.role === "ENCARGADO")!;
  let sequence = 0;
  const cashierContext = commandContext(cashier, "CAJERO", {
    now: () => "2026-07-17T10:00:00.000Z",
    id: (prefix) => `${prefix}-cashier-${++sequence}`,
  });
  const managerContext = commandContext(manager, "ENCARGADO", {
    now: () => "2026-07-17T11:00:00.000Z",
    id: (prefix) => `${prefix}-manager-${++sequence}`,
  });
  const opened = openCashCommand(
    clean,
    {
      localId: POSEIDON_LOCAL_ID,
      operatingDate: "2026-07-17",
      initialFund: 10_000,
      initialBankFund: 5_000,
      initialNote: "Apertura de prueba",
      openingCapitalPerson: "MATHIAS",
      firstOpening: true,
    },
    cashierContext,
  );
  if (!opened.ok) throw new Error(opened.error);
  return { data: opened.data, balance: opened.value, cashierContext, managerContext };
}

describe("tesoreria Caja, Principal y socios", () => {
  it("registra el primer aporte pasando por Principal y deja los fondos asignados a Caja", () => {
    const { data } = setup();
    expect(localAccountBalances(data, POSEIDON_LOCAL_ID)).toEqual({ cash: 10_000, bank: 5_000 });
    expect(principalAccountBalances(data)).toEqual({ cash: 0, bank: 0 });
    expect(partnerAccountBalance(data, "MATHIAS")).toBe(15_000);
    expect(data.partnerMovements).toHaveLength(2);
    expect(data.treasuryTransfers).toHaveLength(2);
  });

  it("exige un aporte real a Principal antes de aportar fondos adicionales a Caja", () => {
    const setupData = setup();
    const before = JSON.stringify(setupData.data);
    const withoutFunds = createTreasuryTransferCommand(
      setupData.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setupData.balance.id,
        type: "APORTE_CAJA",
        medium: "EFECTIVO",
        amount: 1,
        note: "Sin fondos principales",
      },
      setupData.managerContext,
    );
    expect(withoutFunds).toMatchObject({ ok: false });
    expect(JSON.stringify(setupData.data)).toBe(before);

    const partnerContribution = createPartnerMovementCommand(
      setupData.data,
      {
        localId: POSEIDON_LOCAL_ID,
        partner: "RICARDO",
        type: "APORTE_SOCIO",
        medium: "EFECTIVO",
        amount: 3_000,
        note: "Refuerzo real",
      },
      setupData.managerContext,
    );
    expect(partnerContribution.ok).toBe(true);
    if (!partnerContribution.ok) return;
    const toCash = createTreasuryTransferCommand(
      partnerContribution.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setupData.balance.id,
        type: "APORTE_CAJA",
        medium: "EFECTIVO",
        amount: 3_000,
        note: "Asignado a caja",
      },
      setupData.managerContext,
    );
    expect(toCash.ok).toBe(true);
    if (!toCash.ok) return;
    expect(localAccountBalances(toCash.data, POSEIDON_LOCAL_ID).cash).toBe(13_000);
    expect(principalAccountBalances(toCash.data).cash).toBe(0);
    expect(partnerAccountBalance(toCash.data, "RICARDO")).toBe(3_000);
    expect(totalsForBalance(toCash.data, setupData.balance.id).commercialResult).toBe(0);
  });

  it("acepta transferir exactamente el disponible de Caja a Principal y rechaza excedentes sin mutar", () => {
    const setupData = setup();
    const moved = createTreasuryTransferCommand(
      setupData.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setupData.balance.id,
        type: "RETIRO_CAJA",
        medium: "EFECTIVO",
        amount: 10_000,
        note: "Traspaso total",
      },
      setupData.managerContext,
    );
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(localAccountBalances(moved.data, POSEIDON_LOCAL_ID).cash).toBe(0);
    expect(principalAccountBalances(moved.data).cash).toBe(10_000);
    expect(totalsForBalance(moved.data, setupData.balance.id).expectedCash).toBe(0);

    const before = JSON.stringify(moved.data);
    const rejected = createTreasuryTransferCommand(
      moved.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setupData.balance.id,
        type: "RETIRO_CAJA",
        medium: "EFECTIVO",
        amount: 1,
        note: "Excede saldo",
      },
      setupData.managerContext,
    );
    expect(rejected).toMatchObject({ ok: false });
    expect(JSON.stringify(moved.data)).toBe(before);
  });

  it("exige asociar los traspasos a la caja abierta", () => {
    const setupData = setup();
    const before = JSON.stringify(setupData.data);
    const rejected = createTreasuryTransferCommand(
      setupData.data,
      {
        localId: POSEIDON_LOCAL_ID,
        type: "RETIRO_CAJA",
        medium: "EFECTIVO",
        amount: 100,
        note: "No puede quedar fuera de la recaudacion",
      },
      setupData.managerContext,
    );
    expect(rejected).toEqual({
      ok: false,
      error: "Existe una caja abierta: el traspaso debe quedar asociado a esa recaudacion.",
    });
    expect(JSON.stringify(setupData.data)).toBe(before);
  });

  it("protege los traspasos automaticos de apertura y cierre", () => {
    const setupData = setup();
    const openingTransfer = setupData.data.treasuryTransfers.find((transfer) => transfer.timing === "APERTURA")!;
    const before = JSON.stringify(setupData.data);
    const annulled = annulTreasuryTransferCommand(
      setupData.data,
      openingTransfer.id,
      setupData.managerContext,
      "Intento invalido",
    );
    expect(annulled).toEqual({
      ok: false,
      error: "Los traspasos automaticos de apertura y cierre forman parte de la foto auditada y no se anulan.",
    });
    const manualClosing = createTreasuryTransferCommand(
      setupData.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setupData.balance.id,
        type: "RETIRO_CAJA",
        medium: "EFECTIVO",
        timing: "CIERRE",
        amount: 100,
        note: "No permitido",
      },
      setupData.managerContext,
    );
    expect(manualClosing).toEqual({
      ok: false,
      error: "Los traspasos de apertura y cierre solo los generan los comandos de caja.",
    });
    expect(JSON.stringify(setupData.data)).toBe(before);
  });

  it("registra y anula movimientos patrimoniales sin modificar el resultado economico", () => {
    const setupData = setup();
    const contribution = createPartnerMovementCommand(
      setupData.data,
      {
        localId: POSEIDON_LOCAL_ID,
        partner: "RICARDO",
        type: "APORTE_SOCIO",
        medium: "BANCO",
        amount: 2_000,
        note: "Aporte bancario",
      },
      setupData.managerContext,
    );
    expect(contribution.ok).toBe(true);
    if (!contribution.ok) return;
    const withdrawal = createPartnerMovementCommand(
      contribution.data,
      {
        localId: POSEIDON_LOCAL_ID,
        partner: "RICARDO",
        type: "RETIRO_SOCIO",
        medium: "BANCO",
        amount: 500,
        note: "Retiro patrimonial",
      },
      setupData.managerContext,
    );
    expect(withdrawal.ok).toBe(true);
    if (!withdrawal.ok) return;
    expect(principalAccountBalances(withdrawal.data).bank).toBe(1_500);
    expect(partnerAccountBalance(withdrawal.data, "RICARDO")).toBe(1_500);
    expect(totalsForBalance(withdrawal.data, setupData.balance.id).commercialResult).toBe(0);

    const annulled = annulPartnerMovementCommand(
      withdrawal.data,
      withdrawal.value.id,
      setupData.managerContext,
      "Retiro cargado por error",
    );
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(principalAccountBalances(annulled.data).bank).toBe(2_000);
    expect(partnerAccountBalance(annulled.data, "RICARDO")).toBe(2_000);
  });

  it("anula un traspaso mediante reversos conservando el historial", () => {
    const setupData = setup();
    const moved = createTreasuryTransferCommand(
      setupData.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setupData.balance.id,
        type: "RETIRO_CAJA",
        medium: "BANCO",
        amount: 2_000,
        note: "Prueba de anulacion",
      },
      setupData.managerContext,
    );
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    const annulled = annulTreasuryTransferCommand(
      moved.data,
      moved.value.id,
      setupData.managerContext,
      "Movimiento equivocado",
    );
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(localAccountBalances(annulled.data, POSEIDON_LOCAL_ID).bank).toBe(5_000);
    expect(principalAccountBalances(annulled.data).bank).toBe(0);
    expect(annulled.data.accountMovements.filter((movement) => movement.reversalOf)).toHaveLength(2);
  });
});
