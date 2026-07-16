import { describe, expect, it } from "vitest";
import { clearOperationalData, createSeedData } from "../../data/appData";
import { accountTotalsFromMovements } from "../../lib/accountMovements";
import { commandContext } from "../command";
import { closeCashCommand } from "./closeCash";
import { openCashCommand } from "./openCash";
import { saveReadingCommand } from "./saveReading";

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
    expect(result.data.capitalMovements).toHaveLength(2);
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
        finalWithdrawalCash: 0,
        finalWithdrawalBank: 0,
        withdrawalCashPerson: "MATHIAS",
        withdrawalBankPerson: "MATHIAS",
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
          finalWithdrawalCash: 0,
          finalWithdrawalBank: 0,
          withdrawalCashPerson: "MATHIAS",
          withdrawalBankPerson: "MATHIAS",
          differenceNote: "",
        },
        context,
      ),
    ).toMatchObject({ ok: false, error: "Toda diferencia requiere observacion." });
  });

  it.each([
    ["declaredCash", Number.NaN],
    ["declaredCash", Number.POSITIVE_INFINITY],
    ["declaredCash", Number.NEGATIVE_INFINITY],
    ["declaredBank", Number.NaN],
    ["declaredBank", Number.POSITIVE_INFINITY],
    ["declaredBank", Number.NEGATIVE_INFINITY],
    ["finalWithdrawalCash", Number.NaN],
    ["finalWithdrawalCash", Number.POSITIVE_INFINITY],
    ["finalWithdrawalCash", Number.NEGATIVE_INFINITY],
    ["finalWithdrawalBank", Number.NaN],
    ["finalWithdrawalBank", Number.POSITIVE_INFINITY],
    ["finalWithdrawalBank", Number.NEGATIVE_INFINITY],
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
      finalWithdrawalCash: 0,
      finalWithdrawalBank: 0,
      withdrawalCashPerson: "MATHIAS" as const,
      withdrawalBankPerson: "MATHIAS" as const,
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
          finalWithdrawalCash: 0,
          finalWithdrawalBank: 0,
          withdrawalCashPerson: "MATHIAS",
          withdrawalBankPerson: "MATHIAS",
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
        firstOpening: false,
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
