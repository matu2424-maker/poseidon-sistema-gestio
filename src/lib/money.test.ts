import { describe, expect, it } from "vitest";
import { normalizeRequiredMoneyInput, parseRequiredMoneyInput } from "./money";

describe("importes monetarios obligatorios", () => {
  it("acepta enteros y el formato uruguayo con separadores de miles", () => {
    expect(parseRequiredMoneyInput("1000")).toBe(1000);
    expect(parseRequiredMoneyInput("1.000")).toBe(1000);
    expect(parseRequiredMoneyInput("1.234.567")).toBe(1234567);
  });

  it("rechaza vacios, texto, formatos ambiguos y valores no seguros", () => {
    expect(parseRequiredMoneyInput("")).toBeNull();
    expect(parseRequiredMoneyInput("1x000")).toBeNull();
    expect(parseRequiredMoneyInput("1.00")).toBeNull();
    expect(parseRequiredMoneyInput("-100")).toBeNull();
    expect(parseRequiredMoneyInput("999999999999999999999")).toBeNull();
  });

  it("normaliza solo un importe valido y conserva el texto invalido para corregirlo", () => {
    expect(normalizeRequiredMoneyInput("1000")).toBe("1.000");
    expect(normalizeRequiredMoneyInput("")).toBe("");
    expect(normalizeRequiredMoneyInput("1x000")).toBe("1x000");
  });
});
