import { describe, expect, it } from "vitest";
import type { AccountMovement, AppData, Balance, Local } from "../types";
import { balanceForMovement, balanceReferenceLabel } from "./balanceReferences";

const local = { id: "1", name: "Poseidon" } as Local;
const balance = { id: "balance-1", visibleId: "POSE-1", localId: "1", operatingDate: "2026-07-01" } as Balance;
const data = { locals: [local], balances: [balance] } as AppData;

describe("referencias de recaudacion", () => {
  it("resuelve el balance relacionado desde balanceId", () => {
    const movement = { balanceId: balance.id } as AccountMovement;
    expect(balanceForMovement(data, movement)).toBe(balance);
  });

  it("produce una etiqueta comun y maneja referencias ausentes", () => {
    expect(balanceReferenceLabel(data, balance)).toBe("POSE-1 - 2026-07-01");
    expect(balanceReferenceLabel(data, undefined)).toBe("Sin recaudacion asociada");
  });
});
