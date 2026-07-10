import { describe, expect, it } from "vitest";
import { localDate, monthRange } from "./dates";

describe("fechas operativas locales", () => {
  it("usa el calendario local y no el corte UTC", () => {
    expect(localDate(new Date(2026, 5, 30, 23, 45))).toBe("2026-06-30");
    expect(localDate(new Date(2026, 6, 1, 0, 15))).toBe("2026-07-01");
  });

  it("calcula rangos mensuales desde una fecha explicita", () => {
    expect(monthRange(0, "2026-07-31")).toEqual({ start: "2026-07-01", end: "2026-07-31" });
    expect(monthRange(-1, "2026-03-01")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
});
