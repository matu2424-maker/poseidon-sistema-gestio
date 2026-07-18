import { describe, expect, it } from "vitest";
import type { CurrentAccount, CurrentAccountKind } from "../../types";
import { filterAndOrderAccountSelector } from "./CurrentAccounts";

function account(id: string, kind: CurrentAccountKind, name: string, entityId?: string): CurrentAccount {
  return {
    id,
    kind,
    entityId,
    name,
    currency: "UYU",
    status: "ACTIVA",
    createdAt: "2026-07-18T12:00:00.000Z",
    updatedAt: "2026-07-18T12:00:00.000Z",
  };
}

const unorderedAccounts = [
  account("principal-bank", "PRINCIPAL_BANCO", "Principal - A Banco"),
  account("partner", "SOCIO", "Socio - Mathias", "MATHIAS"),
  account("local-bank", "LOCAL_BANCO", "Poseidon - A Banco", "local-poseidon"),
  account("transfers", "TRANSFERENCIAS", "Transferencias"),
  account("principal-cash", "PRINCIPAL_EFECTIVO", "Principal - Z Efectivo"),
  account("local-cash", "LOCAL_EFECTIVO", "Poseidon - Z Efectivo", "local-poseidon"),
];

describe("filterAndOrderAccountSelector", () => {
  it("prioriza Efectivo sobre Banco en Caja y Principal con un criterio explicito", () => {
    expect(filterAndOrderAccountSelector(unorderedAccounts, "").map((item) => item.kind)).toEqual([
      "LOCAL_EFECTIVO",
      "LOCAL_BANCO",
      "PRINCIPAL_EFECTIVO",
      "PRINCIPAL_BANCO",
      "SOCIO",
      "TRANSFERENCIAS",
    ]);
  });

  it("conserva el orden relativo al buscar cuentas de Caja o Principal", () => {
    expect(filterAndOrderAccountSelector(unorderedAccounts, "poseidon").map((item) => item.kind)).toEqual([
      "LOCAL_EFECTIVO",
      "LOCAL_BANCO",
    ]);
    expect(filterAndOrderAccountSelector(unorderedAccounts, "principal").map((item) => item.kind)).toEqual([
      "PRINCIPAL_EFECTIVO",
      "PRINCIPAL_BANCO",
    ]);
  });

  it("deja Efectivo como seleccion inicial al tomar la primera cuenta visible", () => {
    const [firstAccount] = filterAndOrderAccountSelector(unorderedAccounts, "");

    expect(firstAccount.id).toBe("local-cash");
  });
});
