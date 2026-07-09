import type { AppData, SalaryConcept, SalarySettlement, StaffMember } from "../types";
import { today } from "./dates";
import { money } from "./money";

export const salaryConceptLabels: Record<SalaryConcept, string> = {
  SALARIO: "Salario",
  SUELDO: "Salario",
  ADELANTO: "Adelanto",
  EXTRA: "Premio / Gratificacion",
  HORAS_EXTRAS: "Horas extras",
  AJUSTE: "Premio / Gratificacion",
  DESCUENTO: "Descuento",
  AGUINALDO: "Aguinaldo",
  SALARIO_VACACIONAL: "Salario vacacional",
};

export const salaryConceptOptions: SalaryConcept[] = ["ADELANTO", "SALARIO", "EXTRA", "HORAS_EXTRAS", "AGUINALDO", "SALARIO_VACACIONAL", "DESCUENTO"];

export const cashierSalaryConceptOptions: SalaryConcept[] = ["SALARIO", "ADELANTO"];

export const salaryConceptLabel = (concept: SalaryConcept) => salaryConceptLabels[concept] ?? concept;

export const movementConceptLabel = (concept: string | undefined) => (concept ? salaryConceptLabels[concept as SalaryConcept] ?? concept : "-");

export const normalizeSalaryConcept = (concept: unknown): SalaryConcept => {
  if (concept === "SUELDO") return "SALARIO";
  if (concept === "AJUSTE") return "EXTRA";
  if (
    concept === "SALARIO" ||
    concept === "ADELANTO" ||
    concept === "EXTRA" ||
    concept === "HORAS_EXTRAS" ||
    concept === "DESCUENTO" ||
    concept === "AGUINALDO" ||
    concept === "SALARIO_VACACIONAL"
  ) {
    return concept;
  }
  return "SALARIO";
};

export const isSalaryPaymentConcept = (concept: SalaryConcept) => concept === "SALARIO" || concept === "SUELDO";

export const salaryConceptBreakdown = (concept: SalaryConcept, amount: number) => {
  const normalizedConcept = normalizeSalaryConcept(concept);
  const extraAmount = normalizedConcept === "HORAS_EXTRAS" || normalizedConcept === "EXTRA" ? amount : 0;
  return {
    baseSalary: 0,
    advances: normalizedConcept === "ADELANTO" ? amount : 0,
    extraAmount,
    extraConcept: normalizedConcept === "HORAS_EXTRAS" ? "Horas extras" : normalizedConcept === "EXTRA" ? "Premio / Gratificacion" : "",
    aguinaldo: normalizedConcept === "AGUINALDO" ? amount : 0,
    vacationSalary: normalizedConcept === "SALARIO_VACACIONAL" ? amount : 0,
    otherDeductions: normalizedConcept === "DESCUENTO" ? amount : 0,
    totalToPay: isSalaryPaymentConcept(normalizedConcept) ? amount : 0,
  };
};

export const salarySettlementAmount = (settlement: SalarySettlement) => {
  const concept = normalizeSalaryConcept(settlement.concept);
  if (concept === "ADELANTO") return Number(settlement.advances ?? 0);
  if (concept === "DESCUENTO") return 0;
  const totalCash = Number(settlement.totalToPay ?? 0);
  if (totalCash !== 0) return totalCash;
  return (
    Number(settlement.baseSalary ?? 0) +
    Number(settlement.extraAmount ?? 0) +
    Number(settlement.aguinaldo ?? 0) +
    Number(settlement.vacationSalary ?? 0)
  );
};

export const salarySettlementDisplayAmount = (settlement: SalarySettlement) =>
  normalizeSalaryConcept(settlement.concept) === "DESCUENTO" ? Number(settlement.otherDeductions ?? 0) : salarySettlementAmount(settlement);

export const salarySettlementTotalDelta = (settlement: SalarySettlement) =>
  Number(settlement.extraAmount ?? 0) +
  Number(settlement.aguinaldo ?? 0) +
  Number(settlement.vacationSalary ?? 0) -
  Number(settlement.otherDeductions ?? 0);

export const salaryPeriodEndDate = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return `${period}-31`;
  return new Date(year, month, 0).toISOString().slice(0, 10);
};

export const isValidSalaryPeriod = (period: string) => /^\d{4}-\d{2}$/.test(period);

export const shiftSalaryPeriod = (period: string, offsetMonths: number) => {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return today().slice(0, 7);
  const date = new Date(year, month - 1 + offsetMonths, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const suggestedWorkedPeriodFromOperatingDate = (operatingDate: string) => {
  const [year, month, day] = operatingDate.slice(0, 10).split("-").map(Number);
  if (!year || !month) return today().slice(0, 7);
  const currentPeriod = `${year}-${String(month).padStart(2, "0")}`;
  return day >= 1 && day <= 10 ? shiftSalaryPeriod(currentPeriod, -1) : currentPeriod;
};

export const suggestedSalaryPeriodModeFromDate = (date: string): "current" | "previous" => {
  const day = Number(date.slice(8, 10));
  return day >= 1 && day <= 10 ? "previous" : "current";
};

export function salaryBaseForPeriod(data: Pick<AppData, "salaryHistories">, staff: StaffMember | undefined, period: string) {
  if (!staff || staff.status !== "ACTIVO") {
    return { amount: 0, salaryType: staff?.salaryType ?? "MENSUAL" };
  }
  const endDate = salaryPeriodEndDate(period);
  const latestHistory = data.salaryHistories
    .filter((history) => history.staffId === staff.id && history.effectiveDate <= endDate)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.createdAt.localeCompare(a.createdAt))[0];
  return {
    amount: Number(latestHistory?.newNominalSalary ?? staff.nominalSalary ?? 0),
    salaryType: latestHistory?.newSalaryType ?? staff.salaryType,
  };
}

export function validateSalarySettlementLimit(
  data: Pick<AppData, "salaryHistories" | "salarySettlements">,
  staff: StaffMember,
  period: string,
  concept: SalaryConcept,
  amount: number,
  excludeSettlementId?: string,
) {
  const salaryBase = salaryBaseForPeriod(data, staff, period).amount;
  const normalizedConcept = normalizeSalaryConcept(concept);
  const samePeriodSettlements = data.salarySettlements.filter(
    (settlement) =>
      settlement.staffId === staff.id &&
      settlement.period === period &&
      settlement.status !== "ANULADA" &&
      settlement.id !== excludeSettlementId,
  );
  const currentSalaryPaid = samePeriodSettlements
    .filter((settlement) => isSalaryPaymentConcept(normalizeSalaryConcept(settlement.concept)))
    .reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
  const currentAdvances = samePeriodSettlements.reduce((total, settlement) => total + Number(settlement.advances ?? 0), 0);
  const currentDeductions = samePeriodSettlements.reduce((total, settlement) => total + Number(settlement.otherDeductions ?? 0), 0);
  const nextSalaryPaid = currentSalaryPaid + (isSalaryPaymentConcept(normalizedConcept) ? amount : 0);
  const nextAdvances = currentAdvances + (normalizedConcept === "ADELANTO" ? amount : 0);
  const nextDeductions = currentDeductions + (normalizedConcept === "DESCUENTO" ? amount : 0);

  if (isSalaryPaymentConcept(normalizedConcept) && amount > salaryBase) {
    return `El salario no puede superar el salario base (${money(salaryBase)}).`;
  }
  if (nextSalaryPaid > salaryBase) {
    return `El salario pagado acumulado no puede superar el salario base (${money(salaryBase)}).`;
  }
  if (nextSalaryPaid + nextAdvances > salaryBase) {
    return `La suma de salario pagado y adelantos no puede superar el salario base (${money(salaryBase)}).`;
  }
  if (nextSalaryPaid + nextAdvances + nextDeductions > salaryBase) {
    return `La suma de salario pagado, adelantos y descuentos no puede superar el salario base (${money(salaryBase)}).`;
  }
  return "";
}
