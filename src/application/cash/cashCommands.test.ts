import { describe, expect, it } from "vitest";
import { clearOperationalData, createSeedData } from "../../data/appData";
import { accountTotalsFromMovements } from "../../lib/accountMovements";
import { totalsForBalance } from "../../lib/cashTotals";
import {
  localAccountBalances,
  partnerAccountBalance,
  principalAccountBalances,
} from "../../lib/currentAccounts";
import { commandContext } from "../command";
import {
  createPartnerMovementCommand,
  createTreasuryTransferCommand,
} from "../treasury/treasuryCommands";
import { closeCashCommand } from "./closeCash";
import { openCashCommand } from "./openCash";
import { saveReadingCommand, saveReadingsCommand } from "./saveReading";

const fixedContext = () => {
  const user = createSeedData().users.find((item) => item.id === "user-cajero1")!;
  let sequence = 0;
  return commandContext(user, "CAJERO", {
    now: () => "2026-07-10T20:00:00.000Z",
    id: (prefix) => `${prefix}-test-${++sequence}`,
  });
};

describe("comandos de caja", () => {
  it("abre caja, crea lecturas, aportes y auditoria de forma atomica", () => {
    const data = clearOperationalData(createSeedData());
    const result = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 1000,
        initialBankFund: 500,
        initialNote: "Inicio",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      fixedContext(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.balances[0]).toMatchObject({ status: "EN_PROCESO", initialFund: 1000, openedByRole: "CAJERO" });
    expect(result.data.readings.filter((item) => item.balanceId === result.value.id)).toHaveLength(3);
    expect(result.data.partnerMovements).toHaveLength(2);
    expect(result.data.treasuryTransfers).toHaveLength(2);
    expect(result.data.audit[0]).toMatchObject({ action: "Abrir caja", actorRole: "CAJERO" });
  });

  it("guarda contadores con validacion y cierra una caja sin diferencia", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const opened = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 1000,
        initialBankFund: 0,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    let current = opened.data;
    const readings = current.readings.filter((item) => item.balanceId === opened.value.id);
    readings.forEach((reading, index) => {
      const saved = saveReadingCommand(
        current,
        opened.value.id,
        reading.id,
        { inActual: reading.inPrevious + (index === 0 ? 500 : 0), outActual: reading.outPrevious, status: "CARGADA" },
        context,
      );
      expect(saved.ok).toBe(true);
      if (saved.ok) current = saved.data;
    });
    const invalid = saveReadingCommand(current, opened.value.id, readings[0].id, { inActual: -1 }, context);
    expect(invalid).toMatchObject({ ok: false });
    const closed = closeCashCommand(
      current,
      {
        balanceId: opened.value.id,
        declaredCash: 1500,
        declaredBank: 0,
        transferToPrincipalCash: 0,
        transferToPrincipalBank: 0,
        differenceNote: "",
      },
      context,
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.value).toMatchObject({ status: "CERRADO", cashDifference: 0, bankDifference: 0 });
    expect(closed.data.machineLocalHistory.filter((item) => item.action === "CONTADORES")).toHaveLength(3);
    expect(accountTotalsFromMovements(closed.data.accountMovements.filter((item) => item.accountId === "account-local-1-efectivo")).balance).toBe(1500);
    expect(closed.data.audit[0].action).toBe("Cerrar caja");
  });

  it("guarda toda la grilla de contadores de forma atomica", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const opened = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 1000,
        initialBankFund: 0,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const readings = opened.data.readings.filter((item) => item.balanceId === opened.value.id);
    const saved = saveReadingsCommand(
      opened.data,
      opened.value.id,
      readings.map((reading, index) => ({
        readingId: reading.id,
        patch: {
          inActual: reading.inPrevious + (index + 1) * 100,
          outActual: reading.outPrevious,
          status: "CARGADA" as const,
        },
      })),
      context,
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value).toHaveLength(readings.length);
    expect(saved.data.audit.filter((event) => event.action === "Guardar contador")).toHaveLength(readings.length);

    const invalidUpdates = readings.map((reading, index) => ({
      readingId: reading.id,
      patch: {
        inActual: index === readings.length - 1 ? reading.inPrevious - 1 : reading.inPrevious + 500,
        outActual: reading.outPrevious,
        status: "CARGADA" as const,
      },
    }));
    const beforeRejected = structuredClone(opened.data);
    const rejected = saveReadingsCommand(opened.data, opened.value.id, invalidUpdates, context);
    expect(rejected).toEqual({ ok: false, error: "El IN actual debe ser igual o mayor al IN anterior." });
    expect(opened.data).toEqual(beforeRejected);
  });

  it("traspasa fondos del cierre a Principal y reabre con el remanente de Caja", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const opened = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 1_000,
        initialBankFund: 500,
        initialNote: "Apertura con traspaso final",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    if (!opened.ok) throw new Error(opened.error);
    const ready = {
      ...opened.data,
      readings: opened.data.readings.map((reading) => ({
        ...reading,
        status: "SIN_LECTURA" as const,
        observation: "Sin actividad",
      })),
    };
    const closed = closeCashCommand(
      ready,
      {
        balanceId: opened.value.id,
        declaredCash: 400,
        declaredBank: 300,
        transferToPrincipalCash: 600,
        transferToPrincipalBank: 200,
        differenceNote: "",
      },
      context,
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.value).toMatchObject({
      status: "CERRADO",
      finalTransferToPrincipalCash: 600,
      finalTransferToPrincipalBank: 200,
      cashDifference: 0,
      bankDifference: 0,
    });
    expect(localAccountBalances(closed.data, "1")).toEqual({ cash: 400, bank: 300 });
    expect(principalAccountBalances(closed.data)).toEqual({ cash: 600, bank: 200 });
    expect(partnerAccountBalance(closed.data, "MATHIAS")).toBe(1_500);
    expect(totalsForBalance(closed.data, opened.value.id).commercialResult).toBe(0);
    expect(closed.data.treasuryTransfers.filter((transfer) => transfer.timing === "CIERRE")).toHaveLength(2);

    const reopened = openCashCommand(
      closed.data,
      {
        localId: "1",
        operatingDate: "2026-07-11",
        initialFund: 400,
        initialBankFund: 300,
        initialNote: "Remanente heredado",
        openingCapitalPerson: "MATHIAS",
        firstOpening: false,
      },
      context,
    );
    expect(reopened.ok).toBe(true);
    if (reopened.ok) expect(reopened.value).toMatchObject({ initialFund: 400, initialBankFund: 300 });
  });

  it("rechaza un cierre con diferencia sin observacion", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const opened = openCashCommand(
      data,
      { localId: "1", operatingDate: "2026-07-10", initialFund: 0, initialBankFund: 0, initialNote: "", openingCapitalPerson: "MATHIAS", firstOpening: true },
      context,
    );
    if (!opened.ok) throw new Error(opened.error);
    const withoutPending = {
      ...opened.data,
      readings: opened.data.readings.map((reading) => ({ ...reading, status: "SIN_LECTURA" as const, observation: "Sin actividad" })),
    };
    expect(
      closeCashCommand(
        withoutPending,
        {
          balanceId: opened.value.id,
          declaredCash: 100,
          declaredBank: 0,
          transferToPrincipalCash: 0,
          transferToPrincipalBank: 0,
          differenceNote: "",
        },
        context,
      ),
    ).toMatchObject({ ok: false, error: "Toda diferencia requiere observacion." });
  });

  it("prioriza el error de efectivo esperado negativo y permite cerrar despues de un aporte", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const opened = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 1_000,
        initialBankFund: 0,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    if (!opened.ok) throw new Error(opened.error);
    const reading = opened.data.readings.find((item) => item.balanceId === opened.value.id)!;
    const saved = saveReadingCommand(
      opened.data,
      opened.value.id,
      reading.id,
      {
        inActual: reading.inPrevious,
        outActual: reading.outPrevious + 1_500,
        status: "CARGADA",
      },
      context,
    );
    if (!saved.ok) throw new Error(saved.error);
    const negative = {
      ...saved.data,
      readings: saved.data.readings.map((item) =>
        item.balanceId === opened.value.id && item.id !== reading.id
          ? { ...item, status: "SIN_LECTURA" as const, observation: "Sin actividad" }
          : item,
      ),
    };
    const before = JSON.stringify(negative);
    expect(totalsForBalance(negative, opened.value.id).commercialResult).toBe(-1_500);
    const rejected = closeCashCommand(
      negative,
      {
        balanceId: opened.value.id,
        declaredCash: 0,
        declaredBank: 0,
        transferToPrincipalCash: 0,
        transferToPrincipalBank: 0,
        differenceNote: "",
      },
      context,
    );
    expect(rejected).toMatchObject({ ok: false });
    if (!rejected.ok) {
      expect(rejected.error).toContain("efectivo esperado es negativo");
      expect(rejected.error).not.toContain("no puede superar");
    }
    expect(JSON.stringify(negative)).toBe(before);
    expect(negative.balances.find((item) => item.id === opened.value.id)?.status).toBe("EN_PROCESO");
    expect(negative.accountMovements.some((item) => item.sourceType === "DIFERENCIA_CAJA")).toBe(false);

    const manager = negative.users.find((item) => item.role === "ENCARGADO")!;
    const managerContext = commandContext(manager, "ENCARGADO", {
      now: () => "2026-07-10T20:30:00.000Z",
      id: (prefix) => `${prefix}-manager`,
    });
    const partnerContribution = createPartnerMovementCommand(
      negative,
      {
        localId: opened.value.localId,
        type: "APORTE_SOCIO",
        medium: "EFECTIVO",
        partner: "RICARDO",
        amount: 500,
        note: "Fondos reales para cubrir resultado negativo",
      },
      managerContext,
    );
    expect(partnerContribution.ok).toBe(true);
    if (!partnerContribution.ok) return;
    const contribution = createTreasuryTransferCommand(
      partnerContribution.data,
      {
        balanceId: opened.value.id,
        localId: opened.value.localId,
        type: "APORTE_CAJA",
        medium: "EFECTIVO",
        amount: 500,
        note: "Principal a Caja",
      },
      managerContext,
    );
    expect(contribution.ok).toBe(true);
    if (!contribution.ok) return;
    expect(totalsForBalance(contribution.data, opened.value.id).commercialResult).toBe(-1_500);
    expect(localAccountBalances(contribution.data, opened.value.localId).bank).toBe(0);
    const closed = closeCashCommand(
      contribution.data,
      {
        balanceId: opened.value.id,
        declaredCash: 0,
        declaredBank: 0,
        transferToPrincipalCash: 0,
        transferToPrincipalBank: 0,
        differenceNote: "",
      },
      context,
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.value).toMatchObject({ status: "CERRADO", cashDifference: 0 });
    expect(totalsForBalance(closed.data, opened.value.id).commercialResult).toBe(-1_500);
  });

  it("prioriza la inconsistencia tecnica y no permite cerrarla ni ocultarla con un aporte", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const opened = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 1_000,
        initialBankFund: 0,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    if (!opened.ok) throw new Error(opened.error);
    const inconsistent = {
      ...opened.data,
      readings: opened.data.readings.map((reading) => ({
        ...reading,
        status: "SIN_LECTURA" as const,
        observation: "Sin actividad",
      })),
      accountMovements: [
        {
          id: "account-movement-migration-inconsistent",
          accountId: "account-local-1-efectivo",
          balanceId: opened.value.id,
          sourceType: "MIGRACION" as const,
          sourceId: "migration-inconsistent",
          direction: "SALIDA" as const,
          concept: "INCONSISTENCIA_TECNICA",
          amount: 14_000,
          currency: "UYU" as const,
          detail: "Desacople de prueba",
          status: "ACTIVO" as const,
          userId: "system",
          createdAt: "2026-07-10T20:30:00.000Z",
        },
        ...opened.data.accountMovements,
      ],
    };
    const before = JSON.stringify(inconsistent);
    const rejected = closeCashCommand(
      inconsistent,
      {
        balanceId: opened.value.id,
        declaredCash: 0,
        declaredBank: 0,
        transferToPrincipalCash: 0,
        transferToPrincipalBank: 0,
        differenceNote: "",
      },
      context,
    );
    expect(rejected).toMatchObject({ ok: false });
    if (!rejected.ok) {
      expect(rejected.error).toContain("no coincide con Caja / Efectivo");
      expect(rejected.error).toContain("Diferencia tecnica");
      expect(rejected.error).not.toContain("no puede superar");
    }
    expect(JSON.stringify(inconsistent)).toBe(before);

    const manager = inconsistent.users.find((item) => item.role === "ENCARGADO")!;
    const managerContext = commandContext(manager, "ENCARGADO", {
      now: () => "2026-07-10T20:45:00.000Z",
      id: (prefix) => `${prefix}-manager`,
    });
    const fakeContribution = createTreasuryTransferCommand(
      inconsistent,
      {
        localId: opened.value.localId,
        balanceId: opened.value.id,
        type: "APORTE_CAJA",
        medium: "EFECTIVO",
        amount: 14_000,
        note: "No debe ocultar el desacople",
      },
      managerContext,
    );
    expect(fakeContribution).toMatchObject({ ok: false });
    if (!fakeContribution.ok) expect(fakeContribution.error).toContain("un traspaso comun no corrige");
    expect(JSON.stringify(inconsistent)).toBe(before);
  });

  it.each([
    ["declaredCash", Number.NaN],
    ["declaredCash", Number.POSITIVE_INFINITY],
    ["declaredCash", Number.NEGATIVE_INFINITY],
    ["declaredBank", Number.NaN],
    ["declaredBank", Number.POSITIVE_INFINITY],
    ["declaredBank", Number.NEGATIVE_INFINITY],
    ["transferToPrincipalCash", Number.NaN],
    ["transferToPrincipalCash", Number.POSITIVE_INFINITY],
    ["transferToPrincipalCash", Number.NEGATIVE_INFINITY],
    ["transferToPrincipalBank", Number.NaN],
    ["transferToPrincipalBank", Number.POSITIVE_INFINITY],
    ["transferToPrincipalBank", Number.NEGATIVE_INFINITY],
  ] as const)("rechaza %s no finito antes de cerrar", (field, invalidAmount) => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const opened = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 0,
        initialBankFund: 0,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    if (!opened.ok) throw new Error(opened.error);
    const input = {
      balanceId: opened.value.id,
      declaredCash: 0,
      declaredBank: 0,
      transferToPrincipalCash: 0,
      transferToPrincipalBank: 0,
      differenceNote: "",
      [field]: invalidAmount,
    };

    expect(closeCashCommand(opened.data, input, context)).toMatchObject({
      ok: false,
      error: "Los importes del cierre deben ser numeros finitos.",
    });
  });

  it("rechaza totales derivados no finitos antes de persistir", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const opened = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 0,
        initialBankFund: 0,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    if (!opened.ok) throw new Error(opened.error);
    const firstReadingId = opened.data.readings.find((reading) => reading.balanceId === opened.value.id)!.id;
    const invalidData = {
      ...opened.data,
      readings: opened.data.readings.map((reading) => ({
        ...reading,
        status: reading.id === firstReadingId ? ("CARGADA" as const) : ("SIN_LECTURA" as const),
        result: reading.id === firstReadingId ? Number.POSITIVE_INFINITY : reading.result,
        observation: "Validada",
      })),
    };
    expect(
      closeCashCommand(
        invalidData,
        {
          balanceId: opened.value.id,
          declaredCash: 0,
          declaredBank: 0,
          transferToPrincipalCash: 0,
          transferToPrincipalBank: 0,
          differenceNote: "",
        },
        context,
      ),
    ).toMatchObject({ ok: false, error: "Los importes del cierre deben ser numeros finitos." });
  });

  it("impide abrir dos cajas en proceso para el mismo local aunque tengan distinta fecha", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const first = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 0,
        initialBankFund: 0,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    if (!first.ok) throw new Error(first.error);

    expect(
      openCashCommand(
        first.data,
        {
          localId: "1",
          operatingDate: "2026-07-11",
          initialFund: 0,
          initialBankFund: 0,
          initialNote: "",
          openingCapitalPerson: "MATHIAS",
          firstOpening: false,
        },
        context,
      ),
    ).toMatchObject({ ok: false, error: "Ya existe una caja abierta para ese local. Primero hay que cerrarla." });
  });

  it("rechaza una apertura heredada si los saldos recibidos no coinciden con el libro", () => {
    const data = clearOperationalData(createSeedData());
    const context = fixedContext();
    const first = openCashCommand(
      data,
      {
        localId: "1",
        operatingDate: "2026-07-09",
        initialFund: 1_000,
        initialBankFund: 500,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: true,
      },
      context,
    );
    if (!first.ok) throw new Error(first.error);
    const closed = {
      ...first.data,
      balances: first.data.balances.map((balance) =>
        balance.id === first.value.id ? { ...balance, status: "CERRADO" as const } : balance,
      ),
    };
    const rejected = openCashCommand(
      closed,
      {
        localId: "1",
        operatingDate: "2026-07-10",
        initialFund: 999,
        initialBankFund: 500,
        initialNote: "",
        openingCapitalPerson: "MATHIAS",
        firstOpening: false,
      },
      context,
    );
    expect(rejected).toEqual({
      ok: false,
      error: "La caja debe abrir con los saldos vigentes de Caja / Efectivo y Caja / Banco.",
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rechaza saldos iniciales no finitos: %s",
    (invalidAmount) => {
      const data = clearOperationalData(createSeedData());
      expect(
        openCashCommand(
          data,
          {
            localId: "1",
            operatingDate: "2026-07-10",
            initialFund: invalidAmount,
            initialBankFund: 0,
            initialNote: "",
            openingCapitalPerson: "MATHIAS",
            firstOpening: true,
          },
          fixedContext(),
        ),
      ).toMatchObject({ ok: false, error: "Los saldos iniciales deben ser numeros finitos." });
    },
  );
});
