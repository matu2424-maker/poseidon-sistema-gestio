import { describe, expect, it } from "vitest";
import { localDate, monthRange, operatingDateFromTimestamp } from "./dates";

describe("fechas operativas locales", () => {
  it("usa el calendario local y no el corte UTC", () => {
    expect(localDate(new Date(2026, 5, 30, 23, 45))).toBe("2026-06-30");
    expect(localDate(new Date(2026, 6, 1, 0, 15))).toBe("2026-07-01");
  });

  it("calcula rangos mensuales desde una fecha explicita", () => {
    expect(monthRange(0, "2026-07-31")).toEqual({ start: "2026-07-01", end: "2026-07-31" });
    expect(monthRange(-1, "2026-03-01")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("resuelve el periodo operativo en la zona horaria de Uruguay", () => {
    expect(operatingDateFromTimestamp("2026-08-01T01:30:00.000Z")).toBe("2026-07-31");
    expect(operatingDateFromTimestamp("2026-08-01T03:30:00.000Z")).toBe("2026-08-01");
    expect(operatingDateFromTimestamp("valor-invalido")).toBe("");
  });
});
