import { describe, expect, it } from "vitest";
import { createSeedData } from "../../data/appData";
import type { AppData, Balance, SalarySettlement } from "../../types";
import {
  inspectRemoteMigrationCompatibility,
  mapBalanceFinalTransfers,
  mapLocalIdentity,
  mapSalaryHistoryActor,
  mapStaffPosition,
  remoteTablesByAppDataCollection,
  resolveSalaryPaymentAccount,
} from "./appDataMigrationMapping";

describe("mapeo de AppData al backend relacional", () => {
  it("declara un destino para las 22 colecciones del snapshot", () => {
    expect(Object.keys(remoteTablesByAppDataCollection).sort()).toEqual(
      [
        "accountMovements",
        "audit",
        "balances",
        "capitalMovements",
        "clients",
        "currentAccounts",
        "expenseCategories",
        "expenses",
        "gifts",
        "locals",
        "machineLocalHistory",
        "machines",
        "partnerMovements",
        "periodicClosures",
        "readings",
        "salaryClosures",
        "salaryHistories",
        "salarySettlements",
        "staff",
        "transfers",
        "treasuryTransfers",
        "users",
      ].sort(),
    );
  });

  it("mapea IDs locales y cargos sin inventar equivalencias", () => {
    const seed = createSeedData();
    expect(mapLocalIdentity(seed.locals[0])).toEqual({
      ok: true,
      value: { legacyId: seed.locals[0].id, visibleId: seed.locals[0].id },
    });
    expect(mapLocalIdentity({ ...seed.locals[0], id: "local-x" })).toMatchObject({
      ok: false,
    });
    expect(mapStaffPosition("Cajera/o")).toBe("CAJERO_A");
    expect(mapStaffPosition("Encargado")).toBe("ENCARGADO_A");
    expect(mapStaffPosition("Mantenimiento")).toBe("MANTENIMIENTO");
    expect(mapStaffPosition("Cargo inventado")).toBeNull();
  });

  it("conserva el nombre historico del actor salarial", () => {
    const history = createSeedData().salaryHistories[0];
    expect(mapSalaryHistoryActor(history)).toEqual({
      changedByLegacyId: history.userId,
      changedByNameSnapshot: history.userName,
    });
  });

  it("resuelve la cuenta salarial solo desde el dato o un asiento univoco", () => {
    const seed = createSeedData();
    const account = seed.currentAccounts[0];
    const settlement: SalarySettlement = {
      ...seed.salarySettlements[0],
      id: "salary-mapping",
      paymentAccountId: undefined,
    };
    const data: AppData = {
      ...seed,
      accountMovements: [
        {
          id: "salary-ledger",
          accountId: account.id,
          localId: settlement.localId,
          sourceType: "SUELDO",
          sourceId: settlement.id,
          direction: "SALIDA",
          concept: "Pago",
          amount: 100,
          currency: "UYU",
          detail: "Pago de prueba",
          status: "ACTIVO",
          userId: seed.users[0].id,
          createdAt: "2026-07-26T10:00:00.000Z",
        },
      ],
    };

    expect(resolveSalaryPaymentAccount(data, settlement)).toEqual({
      paymentAccountId: account.id,
      source: "LEDGER",
    });
    expect(
      resolveSalaryPaymentAccount(
        { currentAccounts: seed.currentAccounts, accountMovements: [] },
        settlement,
      ),
    ).toEqual({ paymentAccountId: null, source: "UNRESOLVED" });
  });

  it("normaliza aliases de retiro compatibles y denuncia contradicciones", () => {
    const base = createSeedData().balances[0] as Balance;
    expect(
      mapBalanceFinalTransfers({
        ...base,
        withdrawal: 100,
        finalWithdrawalCash: 100,
        finalTransferToPrincipalCash: 100,
      }),
    ).toMatchObject({
      finalTransferToPrincipalCash: 100,
      conflicts: [],
    });
    expect(
      mapBalanceFinalTransfers({
        ...base,
        withdrawal: 100,
        finalWithdrawalCash: 200,
        finalTransferToPrincipalCash: undefined,
      }).conflicts,
    ).toHaveLength(2);
  });

  it("el seed vigente no presenta incompatibilidades silenciosas", () => {
    expect(inspectRemoteMigrationCompatibility(createSeedData())).toEqual([]);
  });
});
