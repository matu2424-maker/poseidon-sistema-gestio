import { describe, expect, it } from "vitest";
import { historicalYearOptions, periodEndDate, periodForMode, periodRange } from "./periods";

describe("periodos mensuales", () => {
  it("calcula correctamente el final de mes, incluido febrero bisiesto", () => {
    expect(periodEndDate("2028-02")).toBe("2028-02-29");
    expect(periodEndDate("2027-02")).toBe("2027-02-28");
    expect(periodEndDate("2026-07")).toBe("2026-07-31");
  });

  it("construye un rango mensual completo", () => {
    expect(periodRange("2026-06")).toEqual({ start: "2026-06-01", end: "2026-06-30" });
  });

  it("resuelve mes actual, anterior o historico desde un unico helper", () => {
    expect(periodForMode("current", "2026-07", "2026-06", "03", "2024")).toBe("2026-07");
    expect(periodForMode("previous", "2026-07", "2026-06", "03", "2024")).toBe("2026-06");
    expect(periodForMode("custom", "2026-07", "2026-06", "03", "2024")).toBe("2024-03");
  });

  it("deduplica y ordena los anos historicos", () => {
    expect(historicalYearOptions("2026-07", "2025-01-10", "2026-02", undefined, "dato-invalido")).toEqual(["2026", "2025"]);
  });
});
