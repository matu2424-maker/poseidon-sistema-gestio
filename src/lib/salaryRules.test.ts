import { describe, expect, it } from "vitest";
import type { SalarySettlement, StaffMember } from "../types";
import { isValidSalaryPeriod, salaryBaseForPeriod, staffWorkedInSalaryPeriod, validateSalarySettlementLimit } from "./salaryRules";

const staff = {
  id: "staff-1",
  status: "ACTIVO",
  salaryType: "MENSUAL",
  nominalSalary: 50000,
} as StaffMember;

const settlement = (patch: Partial<SalarySettlement>): SalarySettlement => ({
  id: "settlement-1",
  period: "2026-07",
  staffId: staff.id,
  staffName: "Empleado",
  localId: "1",
  baseSalary: 0,
  advances: 0,
  extraAmount: 0,
  extraConcept: "",
  aguinaldo: 0,
  vacationSalary: 0,
  otherDeductions: 0,
  totalToPay: 0,
  concept: "SALARIO",
  notes: "",
  status: "CONFIRMADA",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
  ...patch,
});

describe("limites de liquidacion salarial", () => {
  it.each(["2026-01", "2026-07", "2026-12"])("acepta el periodo mensual valido %s", (period) => {
    expect(isValidSalaryPeriod(period)).toBe(true);
  });

  it.each(["2026-00", "2026-13", "2026-99", "26-07", "2026-7", "2026-07-01"])(
    "rechaza el periodo mensual invalido %s",
    (period) => {
      expect(isValidSalaryPeriod(period)).toBe(false);
    },
  );

  it("impide que un pago de salario supere el salario base", () => {
    const error = validateSalarySettlementLimit({ salaryHistories: [], salarySettlements: [] }, staff, "2026-07", "SALARIO", 50001);
    expect(error).toContain("no puede superar el salario base");
  });

  it("permite completar exactamente la base luego de un adelanto", () => {
    const data = { salaryHistories: [], salarySettlements: [settlement({ concept: "ADELANTO", advances: 10000 })] };
    expect(validateSalarySettlementLimit(data, staff, "2026-07", "SALARIO", 40000)).toBe("");
  });

  it("impide que salario y adelantos acumulados excedan la base", () => {
    const data = { salaryHistories: [], salarySettlements: [settlement({ concept: "ADELANTO", advances: 10000 })] };
    expect(validateSalarySettlementLimit(data, staff, "2026-07", "SALARIO", 40001)).toContain("salario pagado y adelantos");
  });

  it("conserva la base historica de una persona que hoy esta de baja", () => {
    const inactiveStaff = {
      ...staff,
      status: "BAJA",
      hireDate: "2026-01-01",
      terminatedAt: "2026-08-15T12:00:00.000Z",
    } as StaffMember;
    expect(staffWorkedInSalaryPeriod(inactiveStaff, "2026-07")).toBe(true);
    expect(salaryBaseForPeriod({ salaryHistories: [] }, inactiveStaff, "2026-07").amount).toBe(50000);
    expect(staffWorkedInSalaryPeriod(inactiveStaff, "2026-09")).toBe(false);
    expect(salaryBaseForPeriod({ salaryHistories: [] }, inactiveStaff, "2026-09").amount).toBe(0);
  });
});
