import type {
  AppData,
  SalaryClosure,
  SalaryClosureEmployeeSnapshot,
  SalaryClosureSettlementSnapshot,
  SalarySettlement,
  SalaryType,
  StaffMember,
} from "../types";
import { staffFullName } from "./people";
import {
  isSalaryPaymentConcept,
  normalizeSalaryConcept,
  salaryBaseForPeriod,
  salarySettlementAmount,
  salarySettlementDisplayAmount,
  staffWorkedInSalaryPeriod,
} from "./salaryRules";

export type SalaryPeriodEmployeeSummary = {
  staffId: string;
  name: string;
  position: string;
  localId: string;
  salaryType: SalaryType;
  baseSalary: number;
  salaryPaid: number;
  advances: number;
  extraAmount: number;
  bonuses: number;
  otherDeductions: number;
  totalAmount: number;
  baseCoveredAmount: number;
  liquidatedAmount: number;
  pendingAmount: number;
  activeSettlementCount: number;
  status: "Pendiente" | "Borrador" | "Confirmada" | "Anulada" | "Mixta";
  settlements: SalarySettlement[];
  staff?: StaffMember;
};

export type SalaryPeriodTotals = {
  totalBase: number;
  totalExtras: number;
  totalBonuses: number;
  totalDeductions: number;
  totalSalaries: number;
  totalSalaryPaid: number;
  totalAdvances: number;
  totalBaseCovered: number;
  totalLiquidated: number;
  totalPending: number;
};

export const salaryClosurePeriod = (closure: SalaryClosure) => closure.period || closure.startDate.slice(0, 7);

export const closedSalaryClosuresForPeriod = (data: Pick<AppData, "salaryClosures">, period: string) =>
  data.salaryClosures
    .filter((closure) => closure.status === "CERRADO" && salaryClosurePeriod(closure) === period)
    .sort(
      (a, b) =>
        Number(b.revision ?? 0) - Number(a.revision ?? 0) ||
        String(b.closedAt ?? b.createdAt).localeCompare(String(a.closedAt ?? a.createdAt)),
    );

export const latestClosedSalaryClosure = (data: Pick<AppData, "salaryClosures">, period: string) =>
  closedSalaryClosuresForPeriod(data, period)[0];

export const openSalaryCorrection = (data: Pick<AppData, "salaryClosures">, period: string) =>
  data.salaryClosures.find(
    (closure) =>
      closure.kind === "CORRECTIVO" &&
      closure.status === "CORRECCION_ABIERTA" &&
      salaryClosurePeriod(closure) === period,
  );

export function salaryPeriodMutationError(
  data: Pick<AppData, "salaryClosures">,
  period: string,
  correctionClosureId?: string,
) {
  const latestClosure = latestClosedSalaryClosure(data, period);
  if (!latestClosure) {
    return correctionClosureId ? "El ajuste correctivo no corresponde a un periodo cerrado." : "";
  }
  if (!correctionClosureId) {
    return `El periodo ${period} esta cerrado por ${latestClosure.visibleId}. Inicia un ajuste correctivo para modificarlo.`;
  }
  const correction = openSalaryCorrection(data, period);
  if (!correction || correction.id !== correctionClosureId) {
    return "El ajuste correctivo indicado no esta abierto para este periodo.";
  }
  if (correction.parentClosureId !== latestClosure.id) {
    return `El ajuste correctivo debe partir del ultimo cierre ${latestClosure.visibleId}.`;
  }
  return "";
}

const employeeStatus = (settlements: SalarySettlement[], activeSettlements: SalarySettlement[]) => {
  const statuses = [...new Set(settlements.map((settlement) => settlement.status))];
  const activeStatuses = [...new Set(activeSettlements.map((settlement) => settlement.status))];
  if (!settlements.length || !activeSettlements.length) return "Pendiente" as const;
  if (activeStatuses.length > 1) return "Mixta" as const;
  if (activeStatuses[0] === "CONFIRMADA") return "Confirmada" as const;
  if (statuses[0] === "BORRADOR") return "Borrador" as const;
  if (statuses[0] === "ANULADA") return "Anulada" as const;
  return "Pendiente" as const;
};

export function salaryPeriodEmployeeSummaries(data: AppData, period: string): SalaryPeriodEmployeeSummary[] {
  const periodSettlements = data.salarySettlements.filter((settlement) => settlement.period === period);
  const settlementStaffIds = new Set(periodSettlements.map((settlement) => settlement.staffId));
  const relevantStaff = data.staff.filter(
    (staff) => staffWorkedInSalaryPeriod(staff, period) || settlementStaffIds.has(staff.id),
  );
  const staffById = new Map(relevantStaff.map((staff) => [staff.id, staff]));
  const allStaffIds = new Set([...relevantStaff.map((staff) => staff.id), ...settlementStaffIds]);

  return [...allStaffIds]
    .map((staffId) => {
      const staff = staffById.get(staffId) ?? data.staff.find((item) => item.id === staffId);
      const settlements = periodSettlements.filter((settlement) => settlement.staffId === staffId);
      const activeSettlements = settlements.filter((settlement) => settlement.status !== "ANULADA");
      const salaryBase = salaryBaseForPeriod(data, staff, period);
      const salaryPaid = activeSettlements
        .filter((settlement) => isSalaryPaymentConcept(normalizeSalaryConcept(settlement.concept)))
        .reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
      const advances = activeSettlements.reduce((total, settlement) => total + Number(settlement.advances ?? 0), 0);
      const extraAmount = activeSettlements.reduce((total, settlement) => total + Number(settlement.extraAmount ?? 0), 0);
      const bonuses = activeSettlements.reduce(
        (total, settlement) => total + Number(settlement.aguinaldo ?? 0) + Number(settlement.vacationSalary ?? 0),
        0,
      );
      const otherDeductions = activeSettlements.reduce(
        (total, settlement) => total + Number(settlement.otherDeductions ?? 0),
        0,
      );
      const totalAmount = Math.max(0, salaryBase.amount + extraAmount + bonuses - otherDeductions);
      const baseCoveredAmount = salaryPaid + advances + otherDeductions;
      const liquidatedAmount = salaryPaid + advances + extraAmount + bonuses;
      return {
        staffId,
        name: staff ? staffFullName(staff) : settlements[0]?.staffName ?? "Personal sin ficha",
        position: staff?.position ?? "Sin cargo",
        localId: staff?.localId ?? settlements[0]?.localId ?? "1",
        salaryType: salaryBase.salaryType,
        baseSalary: salaryBase.amount,
        salaryPaid,
        advances,
        extraAmount,
        bonuses,
        otherDeductions,
        totalAmount,
        baseCoveredAmount,
        liquidatedAmount,
        pendingAmount: salaryBase.amount - baseCoveredAmount,
        activeSettlementCount: activeSettlements.length,
        status: employeeStatus(settlements, activeSettlements),
        settlements,
        staff,
      } satisfies SalaryPeriodEmployeeSummary;
    })
    .filter((row) => row.baseSalary > 0 || row.settlements.length > 0);
}

export function salaryPeriodTotals(rows: SalaryPeriodEmployeeSummary[]): SalaryPeriodTotals {
  return {
    totalBase: rows.reduce((total, row) => total + row.baseSalary, 0),
    totalExtras: rows.reduce((total, row) => total + row.extraAmount, 0),
    totalBonuses: rows.reduce((total, row) => total + row.bonuses, 0),
    totalDeductions: rows.reduce((total, row) => total + row.otherDeductions, 0),
    totalSalaries: rows.reduce((total, row) => total + row.totalAmount, 0),
    totalSalaryPaid: rows.reduce((total, row) => total + row.salaryPaid, 0),
    totalAdvances: rows.reduce((total, row) => total + row.advances, 0),
    totalBaseCovered: rows.reduce((total, row) => total + row.baseCoveredAmount, 0),
    totalLiquidated: rows.reduce((total, row) => total + row.liquidatedAmount, 0),
    totalPending: rows.reduce((total, row) => total + row.pendingAmount, 0),
  };
}

const settlementSnapshot = (settlement: SalarySettlement): SalaryClosureSettlementSnapshot => ({
  id: settlement.id,
  concept: normalizeSalaryConcept(settlement.concept),
  amount: salarySettlementDisplayAmount(settlement),
  notes: settlement.notes,
  origin: settlement.origin ?? "LIQUIDACION",
  createdByName: settlement.createdByName ?? "Usuario no disponible",
  approvedByName: settlement.approvedByName ?? settlement.createdByName ?? "Usuario no disponible",
  createdAt: settlement.createdAt,
});

export const salaryClosureEmployeeSnapshots = (
  rows: SalaryPeriodEmployeeSummary[],
): SalaryClosureEmployeeSnapshot[] =>
  rows.map((row) => {
    const activeSettlements = row.settlements.filter((settlement) => settlement.status !== "ANULADA");
    return {
      staffId: row.staffId,
      staffName: row.name,
      position: row.position,
      localId: row.localId,
      salaryType: row.salaryType,
      baseSalary: row.baseSalary,
      salaryPaid: row.salaryPaid,
      advances: row.advances,
      extraAmount: row.extraAmount,
      bonuses: row.bonuses,
      deductions: row.otherDeductions,
      totalAmount: row.totalAmount,
      baseCoveredAmount: row.baseCoveredAmount,
      liquidatedAmount: row.liquidatedAmount,
      pendingAmount: row.pendingAmount,
      settlementIds: activeSettlements.map((settlement) => settlement.id),
      settlements: activeSettlements.map(settlementSnapshot),
    };
  });
