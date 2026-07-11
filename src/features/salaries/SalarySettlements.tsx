import { useState } from "react";
import type { AccountMovement, AppData, SalaryClosure, SalarySettlement, SalarySettlementStatus, SalaryType, StaffMember, User } from "../../types";
import { localSalaryAccountMovement, salaryAccountMovement, upsertAccountMovement } from "../../lib/accountMovements";
import { balanceForMovement, balanceReferenceLabel } from "../../lib/balanceReferences";
import { createStaffCurrentAccount, ensureLocalCurrentAccounts, staffAccountId } from "../../lib/currentAccounts";
import { formatDateTime, monthRange, nowIso, today } from "../../lib/dates";
import { confirmAction } from "../../lib/confirmations";
import { localName, userDisplayName } from "../../lib/display";
import { exportCsv } from "../../lib/export";
import { uid } from "../../lib/ids";
import { money } from "../../lib/money";
import { historicalYearOptions, monthLabel, periodForMode, periodRange, type MonthlyPeriodMode } from "../../lib/periods";
import { staffFullName } from "../../lib/people";
import {
  isSalaryPaymentConcept,
  movementConceptLabel,
  normalizeSalaryConcept,
  salaryBaseForPeriod,
  salaryConceptLabel,
  salarySettlementAmount,
  salarySettlementTotalDelta,
  suggestedSalaryPeriodModeFromDate,
} from "../../lib/salaryRules";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { InfoCard, Modal } from "../../components/ui";
import { MonthlyPeriodSelector } from "../../components/MonthlyPeriodSelector";
import { ClosedBalanceSummary } from "../cashier/ClosedBalanceSummary";
import { commandContext } from "../../application/command";
import { annulSalarySettlementCommand } from "../../application/salaries/salarySettlementCommands";
import { SalarySettlementEditor } from "./SalarySettlementEditor";

const POSEIDON_LOCAL_ID = "1";
export function AdminSalarySettlements({
  data,
  user,
  patchData,
  audit,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  type SalaryEmployeeRow = {
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

  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [editorStaffId, setEditorStaffId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffMovementId, setSelectedStaffMovementId] = useState<string | null>(null);
  const [showSelectedStaffMovementBalance, setShowSelectedStaffMovementBalance] = useState(false);
  const [closureMessage, setClosureMessage] = useState("");
  const [settlementSort, setSettlementSort] = useState<
    SortState<"period" | "concept" | "salaryPaid" | "advances" | "extraPrize" | "hoursExtra" | "bonuses" | "otherDeductions" | "status">
  >({
    key: "period",
    direction: "desc",
  });
  const [staffAccountSort, setStaffAccountSort] = useState<SortState<"createdAt" | "concept" | "amount" | "totalAfter" | "pendingAfter" | "user">>({
    key: "createdAt",
    direction: "desc",
  });
  const suggestedPeriodMode = suggestedSalaryPeriodModeFromDate(today());
  const currentRange = monthRange(0);
  const previousRange = monthRange(-1);
  const currentPeriod = currentRange.start.slice(0, 7);
  const previousPeriod = previousRange.start.slice(0, 7);
  const suggestedPeriodMonth = suggestedPeriodMode === "previous" ? previousPeriod : currentPeriod;
  const [periodMode, setPeriodMode] = useState<MonthlyPeriodMode>(() => suggestedPeriodMode);
  const [customMonth, setCustomMonth] = useState(suggestedPeriodMonth.slice(5, 7));
  const [customYear, setCustomYear] = useState(suggestedPeriodMonth.slice(0, 4));
  const [sort, setSort] = useState<SortState<"name" | "baseSalary" | "extraAmount" | "bonuses" | "otherDeductions" | "totalAmount" | "advances" | "salaryPaid" | "pendingAmount">>({
    key: "name",
    direction: "asc",
  });
  const [closureSort, setClosureSort] = useState<
    SortState<"visibleId" | "periodLabel" | "employeeCount" | "totalSalaries" | "totalBaseCovered" | "totalLiquidated" | "totalPending" | "createdByName" | "createdAt" | "status">
  >({
    key: "createdAt",
    direction: "desc",
  });
  const selectedPeriod = periodForMode(periodMode, currentPeriod, previousPeriod, customMonth, customYear);
  const activeRange = periodRange(selectedPeriod);
  const startMonth = selectedPeriod;
  const endMonth = selectedPeriod;
  const defaultPeriod = startMonth;
  const monthsInPeriod = [selectedPeriod];
  const projectedSalaryBase = (staff: StaffMember | undefined) =>
    staff?.status === "ACTIVO" ? monthsInPeriod.reduce((total, period) => total + salaryBaseForPeriod(data, staff, period).amount, 0) : 0;
  const suggestedPeriodLabel = monthLabel(suggestedPeriodMonth);
  const periodLabel = monthLabel(startMonth);
  const currentYear = Number(currentPeriod.slice(0, 4));
  const availableYears = historicalYearOptions(
    currentPeriod,
    previousPeriod,
    `${currentYear - 1}`,
    `${currentYear + 1}`,
    ...data.salarySettlements.map((settlement) => settlement.period),
    ...data.salaryHistories.map((history) => history.effectiveDate),
  );
  const rangeSettlements = data.salarySettlements.filter((settlement) => settlement.period >= startMonth && settlement.period <= endMonth);
  const payableRows = rangeSettlements.filter((settlement) => settlement.status !== "ANULADA");
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");
  const allRelevantStaff = data.staff.filter((staff) => staff.status !== "PAPELERA");

  const employeeRowsMap = new Map<string, SalaryEmployeeRow>();
  const ensureEmployeeRow = (staff: StaffMember | undefined, settlement?: SalarySettlement) => {
    const staffId = staff?.id ?? settlement?.staffId ?? "";
    const existing = employeeRowsMap.get(staffId);
    if (existing) return existing;
    const row: SalaryEmployeeRow = {
      staffId,
      name: staff ? staffFullName(staff) : settlement?.staffName ?? "Personal sin ficha",
      position: staff?.position ?? "Sin cargo",
      localId: staff?.localId ?? settlement?.localId ?? POSEIDON_LOCAL_ID,
      salaryType: salaryBaseForPeriod(data, staff, endMonth).salaryType,
      baseSalary: projectedSalaryBase(staff),
      salaryPaid: 0,
      advances: 0,
      extraAmount: 0,
      bonuses: 0,
      otherDeductions: 0,
      totalAmount: projectedSalaryBase(staff),
      baseCoveredAmount: 0,
      liquidatedAmount: 0,
      pendingAmount: projectedSalaryBase(staff),
      activeSettlementCount: 0,
      status: "Pendiente",
      settlements: [],
      staff,
    };
    employeeRowsMap.set(staffId, row);
    return row;
  };

  activeStaff.forEach((staff) => ensureEmployeeRow(staff));
  rangeSettlements.forEach((settlement) => {
    const staff = allRelevantStaff.find((item) => item.id === settlement.staffId);
    const row = ensureEmployeeRow(staff, settlement);
    row.settlements.push(settlement);
  });

  const employeeRowsAll: SalaryEmployeeRow[] = [...employeeRowsMap.values()].map((row) => {
    const activeSettlements = row.settlements.filter((settlement) => settlement.status !== "ANULADA");
    const statuses = [...new Set(row.settlements.map((settlement) => settlement.status))];
    const activeStatuses = [...new Set(activeSettlements.map((settlement) => settlement.status))];
    const baseSalary = projectedSalaryBase(row.staff);
    const salaryPaid = activeSettlements
      .filter((settlement) => isSalaryPaymentConcept(normalizeSalaryConcept(settlement.concept)))
      .reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
    const advances = activeSettlements.reduce((total, settlement) => total + Number(settlement.advances ?? 0), 0);
    const extraAmount = activeSettlements.reduce((total, settlement) => total + Number(settlement.extraAmount ?? 0), 0);
    const bonuses = activeSettlements.reduce((total, settlement) => total + Number(settlement.aguinaldo ?? 0) + Number(settlement.vacationSalary ?? 0), 0);
    const otherDeductions = activeSettlements.reduce((total, settlement) => total + Number(settlement.otherDeductions ?? 0), 0);
    const totalAmount = Math.max(0, baseSalary + extraAmount + bonuses - otherDeductions);
    const baseCoveredAmount = salaryPaid + advances + otherDeductions;
    const liquidatedAmount = salaryPaid + advances + extraAmount + bonuses;
    const pendingAmount = baseSalary - baseCoveredAmount;
    const status: SalaryEmployeeRow["status"] =
      row.settlements.length === 0 || (row.staff?.status === "ACTIVO" && activeSettlements.length === 0)
        ? "Pendiente"
        : activeStatuses.length > 1
          ? "Mixta"
          : activeStatuses[0] === "CONFIRMADA"
            ? "Confirmada"
            : statuses[0] === "BORRADOR"
              ? "Borrador"
              : statuses[0] === "ANULADA"
              ? "Anulada"
              : "Pendiente";
    return { ...row, baseSalary, salaryPaid, advances, extraAmount, bonuses, otherDeductions, totalAmount, baseCoveredAmount, liquidatedAmount, pendingAmount, activeSettlementCount: activeSettlements.length, status };
  });
  const summaryRows = employeeRowsAll.filter((row) => row.staff?.status === "ACTIVO" || row.settlements.length > 0);
  const periodTotal = summaryRows.reduce((total, row) => total + row.totalAmount, 0);
  const periodPending = summaryRows.reduce((total, row) => total + row.pendingAmount, 0);
  const periodBase = summaryRows.reduce((total, row) => total + row.baseSalary, 0);
  const periodSalaryPaid = summaryRows.reduce((total, row) => total + row.salaryPaid, 0);
  const periodAdvances = summaryRows.reduce((total, row) => total + row.advances, 0);
  const periodExtras = summaryRows.reduce((total, row) => total + row.extraAmount, 0);
  const periodBonuses = summaryRows.reduce((total, row) => total + row.bonuses, 0);
  const periodDeductions = summaryRows.reduce((total, row) => total + row.otherDeductions, 0);
  const periodBaseCovered = summaryRows.reduce((total, row) => total + row.baseCoveredAmount, 0);
  const periodLiquidated = summaryRows.reduce((total, row) => total + row.liquidatedAmount, 0);
  const employeeValue = (row: SalaryEmployeeRow, key: typeof sort.key): string | number => {
    if (key === "name") return row.name;
    return row[key];
  };
  const settlementSortValue = (settlement: SalarySettlement, key: typeof settlementSort.key): string | number => {
    const concept = normalizeSalaryConcept(settlement.concept);
    if (key === "period") return settlement.period;
    if (key === "concept") return salaryConceptLabel(concept);
    if (key === "salaryPaid") return isSalaryPaymentConcept(concept) ? salarySettlementAmount(settlement) : 0;
    if (key === "extraPrize") return concept === "EXTRA" ? Number(settlement.extraAmount ?? 0) : 0;
    if (key === "hoursExtra") return concept === "HORAS_EXTRAS" ? Number(settlement.extraAmount ?? 0) : 0;
    if (key === "bonuses") return Number(settlement.aguinaldo ?? 0) + Number(settlement.vacationSalary ?? 0);
    if (key === "status") return settlement.status;
    if (key === "advances") return Number(settlement.advances ?? 0);
    if (key === "otherDeductions") return Number(settlement.otherDeductions ?? 0);
    return 0;
  };
  const sortedSettlements = (settlements: SalarySettlement[]) =>
    [...settlements].sort((a, b) => {
      const result = compareValues(settlementSortValue(a, settlementSort.key), settlementSortValue(b, settlementSort.key));
      return settlementSort.direction === "asc" ? result : -result;
    });
  const rows = employeeRowsAll.sort((a, b) => {
      const result = compareValues(employeeValue(a, sort.key), employeeValue(b, sort.key));
      return sort.direction === "asc" ? result : -result;
    });
  const selectedEmployee = selectedStaffId ? employeeRowsAll.find((row) => row.staffId === selectedStaffId) : undefined;
  const salarySettlementForMovement = (movement: AccountMovement) =>
    movement.sourceType === "SUELDO" ? data.salarySettlements.find((settlement) => settlement.id === movement.sourceId) : undefined;
  const selectedPeriodSalaryMovements = selectedEmployee
    ? data.salarySettlements
        .filter(
          (settlement) =>
            settlement.staffId === selectedEmployee.staffId &&
            settlement.status !== "ANULADA" &&
            settlement.period >= startMonth &&
            settlement.period <= endMonth,
        )
        .map((settlement) => salaryAccountMovement(settlement, settlement.approvedBy ?? settlement.createdBy ?? "system"))
    : [];
  const movementMatchesSelectedSalaryPeriod = (movement: AccountMovement) => {
    const settlement = salarySettlementForMovement(movement);
    if (settlement) return settlement.period >= startMonth && settlement.period <= endMonth;
    return movement.createdAt.slice(0, 10) >= activeRange.start && movement.createdAt.slice(0, 10) <= activeRange.end;
  };
  const selectedAccountMovementMap = new Map<string, AccountMovement>();
  selectedPeriodSalaryMovements.forEach((movement) => selectedAccountMovementMap.set(movement.id, movement));
  if (selectedEmployee) {
    data.accountMovements
      .filter(
        (movement) =>
          movement.accountId === staffAccountId(selectedEmployee.staffId) &&
          movement.status === "ACTIVO" &&
          movementMatchesSelectedSalaryPeriod(movement),
      )
      .forEach((movement) => selectedAccountMovementMap.set(movement.id, movement));
  }
  const selectedAccountMovements = [...selectedAccountMovementMap.values()]
    .filter((movement) => movement.status === "ACTIVO")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pendingReductionForMovement = (movement: AccountMovement) => {
    if (movement.sourceType !== "SUELDO" || movement.status !== "ACTIVO" || movement.direction !== "SALIDA") return 0;
    const settlement = salarySettlementForMovement(movement);
    const concept = normalizeSalaryConcept(settlement?.concept ?? movement.concept);
    if (isSalaryPaymentConcept(concept)) return settlement ? salarySettlementAmount(settlement) : movement.amount;
    if (concept === "ADELANTO") return settlement ? Number(settlement.advances ?? movement.amount) : movement.amount;
    if (concept === "DESCUENTO") return settlement ? Number(settlement.otherDeductions ?? movement.amount) : movement.amount;
    return 0;
  };
  const totalDeltaForMovement = (movement: AccountMovement) => {
    if (movement.sourceType !== "SUELDO" || movement.status !== "ACTIVO" || movement.direction !== "SALIDA") return 0;
    const settlement = salarySettlementForMovement(movement);
    if (settlement) return salarySettlementTotalDelta(settlement);
    const concept = normalizeSalaryConcept(movement.concept);
    if (concept === "EXTRA" || concept === "HORAS_EXTRAS" || concept === "AGUINALDO" || concept === "SALARIO_VACACIONAL") return movement.amount;
    if (concept === "DESCUENTO") return -movement.amount;
    return 0;
  };
  let selectedRunningPending = selectedEmployee ? selectedEmployee.baseSalary : 0;
  let selectedRunningTotal = selectedEmployee ? selectedEmployee.baseSalary : 0;
  const selectedAccountRowsChronological = [...selectedAccountMovements]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((movement) => {
      const activeAmount = movement.status === "ACTIVO" ? movement.amount : 0;
      const debit = movement.direction === "SALIDA" ? activeAmount : 0;
      const credit = movement.direction === "ENTRADA" ? activeAmount : 0;
      selectedRunningTotal += totalDeltaForMovement(movement);
      selectedRunningPending -= pendingReductionForMovement(movement);
      return { movement, debit, credit, balance: credit - debit, amount: activeAmount, totalAfter: selectedRunningTotal, pendingAfter: selectedRunningPending };
    });
  const staffAccountRowValue = (row: (typeof selectedAccountRowsChronological)[number], key: typeof staffAccountSort.key): string | number => {
    if (key === "createdAt") return row.movement.createdAt;
    if (key === "concept") return movementConceptLabel(row.movement.concept);
    if (key === "amount") return row.amount;
    if (key === "totalAfter") return row.totalAfter;
    if (key === "pendingAfter") return row.pendingAfter;
    return userDisplayName(data, row.movement.userId);
  };
  const selectedAccountRows = [...selectedAccountRowsChronological].sort((a, b) => {
    const result = compareValues(staffAccountRowValue(a, staffAccountSort.key), staffAccountRowValue(b, staffAccountSort.key));
    return staffAccountSort.direction === "asc" ? result : -result;
  });
  const selectedStaffMovementRow = selectedAccountRows.find((row) => row.movement.id === selectedStaffMovementId);
  const selectedStaffMovement = selectedStaffMovementRow?.movement;
  const selectedStaffMovementBalance = balanceForMovement(data, selectedStaffMovement);
  const selectedStaffMovementSettlement =
    selectedStaffMovement?.sourceType === "SUELDO" ? data.salarySettlements.find((settlement) => settlement.id === selectedStaffMovement.sourceId) : undefined;
  const salaryClosureValue = (closure: SalaryClosure, key: typeof closureSort.key): string | number => {
    if (key === "visibleId") return closure.visibleId;
    if (key === "periodLabel") return closure.periodLabel;
    if (key === "employeeCount") return closure.employeeCount;
    if (key === "totalSalaries") return closure.totalSalaries;
    if (key === "totalBaseCovered") return closure.totalBaseCovered;
    if (key === "totalLiquidated") return closure.totalLiquidated;
    if (key === "totalPending") return closure.totalPending;
    if (key === "createdByName") return closure.createdByName;
    if (key === "status") return closure.status;
    return closure.createdAt;
  };
  const salaryClosures = [...data.salaryClosures].sort((a, b) => {
    const result = compareValues(salaryClosureValue(a, closureSort.key), salaryClosureValue(b, closureSort.key));
    return closureSort.direction === "asc" ? result : -result;
  });
  const nextSalaryClosureVisibleId = (current: AppData) => {
    const max = current.salaryClosures
      .map((closure) => {
        const match = String(closure.visibleId ?? "").match(/LS-(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0);
    return `LS-${max + 1}`;
  };
  const closeSalaryPeriod = () => {
    if (!summaryRows.length) {
      setClosureMessage("No hay empleados para cerrar en este periodo.");
      return;
    }
    const duplicate = data.salaryClosures.some((closure) => closure.status === "CERRADO" && closure.startDate === activeRange.start && closure.endDate === activeRange.end);
    if (duplicate) {
      setClosureMessage("Este periodo ya tiene un cierre de liquidacion guardado.");
      return;
    }
    if (!confirmAction(`Cerrar liquidacion de ${periodLabel}? Se guardara una foto auditada del periodo.`)) return;
    patchData((current) => {
      const closure: SalaryClosure = {
        id: uid("salary-closure"),
        visibleId: nextSalaryClosureVisibleId(current),
        startDate: activeRange.start,
        endDate: activeRange.end,
        periodLabel,
        employeeCount: summaryRows.length,
        settlementIds: payableRows.map((settlement) => settlement.id),
        totalBase: periodBase,
        totalExtras: periodExtras,
        totalBonuses: periodBonuses,
        totalDeductions: periodDeductions,
        totalSalaries: periodTotal,
        totalSalaryPaid: periodSalaryPaid,
        totalAdvances: periodAdvances,
        totalBaseCovered: periodBaseCovered,
        totalLiquidated: periodLiquidated,
        totalPending: periodPending,
        status: "CERRADO",
        note: "Cierre manual de liquidacion de salarios",
        createdBy: user.id,
        createdByName: user.name,
        createdAt: nowIso(),
      };
      return audit(
        { ...current, salaryClosures: [closure, ...current.salaryClosures] },
        "Cerrar liquidacion salarios",
        "LiquidacionSalarioCierre",
        closure.id,
        "",
        closure,
        closure.note,
      );
    });
    setClosureMessage("Cierre de liquidacion guardado.");
  };
  const annulSalaryClosure = (closure: SalaryClosure) => {
    if (!confirmAction(`Anular cierre ${closure.visibleId}? La auditoria se conserva.`)) return;
    patchData((current) => {
      const previous = current.salaryClosures.find((item) => item.id === closure.id);
      const salaryClosures = current.salaryClosures.map((item) => (item.id === closure.id ? { ...item, status: "ANULADO" as const } : item));
      const next = salaryClosures.find((item) => item.id === closure.id);
      return audit({ ...current, salaryClosures }, "Anular cierre liquidacion salarios", "LiquidacionSalarioCierre", closure.id, previous, next, "Anulacion de cierre");
    });
    setClosureMessage("Cierre de liquidacion anulado.");
  };

  const changeStatus = (settlement: SalarySettlement, status: SalarySettlementStatus) => {
    if (status === "ANULADA" && !confirmAction(`Eliminar liquidacion de ${settlement.staffName}? Queda registrada en auditoria y no impacta los totales.`)) return;
    patchData((current) => {
      if (status === "ANULADA") {
        const result = annulSalarySettlementCommand(current, settlement.id, commandContext(user, user.role));
        if (!result.ok) {
          setClosureMessage(result.error);
          return current;
        }
        setClosureMessage("Liquidacion anulada y compensada en cuentas.");
        return result.data;
      }
      const previous = current.salarySettlements.find((item) => item.id === settlement.id);
      const updatedAt = nowIso();
      const salarySettlements = current.salarySettlements.map((item) =>
        item.id === settlement.id
          ? {
              ...item,
              status,
              approvedBy: status === "CONFIRMADA" ? user.id : item.approvedBy,
              approvedByName: status === "CONFIRMADA" ? user.name : item.approvedByName,
              approvedAt: status === "CONFIRMADA" ? updatedAt : item.approvedAt,
              updatedAt,
            }
          : item,
      );
      const next = salarySettlements.find((item) => item.id === settlement.id);
      const staffMember = current.staff.find((item) => item.id === settlement.staffId);
      const currentAccounts = staffMember && !current.currentAccounts.some((account) => account.id === staffAccountId(staffMember.id))
        ? [createStaffCurrentAccount(staffMember), ...current.currentAccounts]
        : current.currentAccounts;
      const withLocalAccounts = ensureLocalCurrentAccounts({ ...current, currentAccounts }, settlement.localId);
      const accountMovements = next
        ? upsertAccountMovement(upsertAccountMovement(current.accountMovements, salaryAccountMovement(next, user.id)), localSalaryAccountMovement(next, user.id))
        : current.accountMovements;
      const activeAdvanceBalance = salarySettlements
        .filter((item) => item.staffId === settlement.staffId && item.status !== "ANULADA" && item.concept === "ADELANTO")
        .reduce((total, item) => total + Number(item.advances ?? 0), 0);
      const staff = current.staff.map((item) =>
        item.id === settlement.staffId ? { ...item, salaryAdvanceBalance: activeAdvanceBalance, updatedAt: nowIso() } : item,
      );
      return audit({ ...current, currentAccounts: withLocalAccounts, accountMovements, salarySettlements, staff }, "Cambiar estado liquidacion salario", "LiquidacionSalario", settlement.id, previous, next);
    });
  };
  const exportSalaryExcel = () => {
    exportCsv(`poseidon-liquidacion-salarios-${startMonth}-${endMonth}.csv`, [
      ["Periodo", periodLabel],
      ["Pendiente", money(periodPending)],
      ["Total salarios", money(periodTotal)],
      ["Total salarios base", money(periodBase)],
      ["Salario pagado", money(periodSalaryPaid)],
      ["Adelantos", money(periodAdvances)],
      ["Premios y horas", money(periodExtras)],
      ["Bonos", money(periodBonuses)],
      ["Descuentos", money(periodDeductions)],
      ["Cubierto base", money(periodBaseCovered)],
      ["Pagado / Entregado", money(periodLiquidated)],
      [],
      ["Nombre", "Liquidaciones", "Salario Base", "Premios y horas", "Bonos", "Descuentos", "Total", "Adelantos", "Salario pagado", "Cubierto base", "Pagado / Entregado", "Pendiente"],
      ...rows.map((row) => [
        row.name,
        row.activeSettlementCount ? `${row.activeSettlementCount} - ${row.status}` : "Sin liquidacion cargada",
        money(row.baseSalary),
        money(row.extraAmount),
        money(row.bonuses),
        money(row.otherDeductions),
        money(row.totalAmount),
        money(row.advances),
        money(row.salaryPaid),
        money(row.baseCoveredAmount),
        money(row.liquidatedAmount),
        money(row.pendingAmount),
      ]),
    ]);
  };

  return (
    <section className="admin-focus detail-card-surface salary-page">
      <div className="admin-header">
        <div>
          <p className="helper">Registro mensual para saber cuanto pagar, a quien y por que concepto.</p>
        </div>
        <div className="admin-header-actions">
          <span>{payableRows.length} liquidaciones activas</span>
          <button className="button success compact" type="button" onClick={closeSalaryPeriod}>
            Cerrar liquidacion
          </button>
        </div>
      </div>
      {closureMessage && <p className="notice">{closureMessage}</p>}
      <MonthlyPeriodSelector
        mode={periodMode}
        currentPeriod={currentPeriod}
        previousPeriod={previousPeriod}
        customMonth={customMonth}
        customYear={customYear}
        yearOptions={availableYears}
        onModeChange={setPeriodMode}
        onCustomMonthChange={setCustomMonth}
        onCustomYearChange={setCustomYear}
        selectedPeriod={selectedPeriod}
        customButtonLabel="Consultar mes"
        className="salary-period-bar"
        actions={
          <button className="button primary compact" type="button" onClick={exportSalaryExcel}>
            Exportar Excel
          </button>
        }
      />
      <p className="helper">Periodo sugerido por fecha de pago: {suggestedPeriodLabel}. Podes cambiarlo manualmente.</p>
      <div className="card-grid four salary-summary-grid">
        <InfoCard tone={periodPending > 0 ? "orange" : "green"} title="Pendientes" lines={[money(periodPending), "Base - salario - adelantos - descuentos"]} />
        <InfoCard tone="blue" title="Total salarios" lines={[money(periodTotal), "Base + premios + horas extras + bonos - descuentos"]} />
        <InfoCard tone="blue" title="Total salarios base" lines={[money(periodBase), "Segun ficha vigente"]} />
        <InfoCard tone="orange" title="Premios y horas" lines={[money(periodExtras), "Gratificaciones y horas extras"]} />
      </div>
      {!activeStaff.length && <p className="notice">Primero agrega personal activo para poder liquidar salarios.</p>}
      <section className="embedded-panel salary-main-panel">
        <div className="section-toolbar">
          <div>
            <h3>Liquidacion por empleado</h3>
            <p>Resumen consolidado del periodo seleccionado. Usa Detalle para cargar o revisar liquidaciones.</p>
          </div>
          <span className="close-status-pill">{rows.length} empleado(s)</span>
        </div>
        <div className="table-wrap grow">
          <table className="data-table admin-data-table salary-table">
            <thead>
              <tr>
                {[
                  ["name", "Nombre"],
                  ["baseSalary", "Salario Base"],
                  ["extraAmount", "Premios y horas"],
                  ["bonuses", "Bonos"],
                  ["otherDeductions", "Descuentos"],
                  ["totalAmount", "Total"],
                  ["advances", "Adelantos"],
                  ["salaryPaid", "Salario pagado"],
                  ["pendingAmount", "Pendiente"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key as typeof sort.key))}>
                      {label}
                      {sortIndicator(sort, key as typeof sort.key)}
                    </button>
                  </th>
                ))}
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.staffId} className={row.status === "Pendiente" ? "status-maintenance" : row.status === "Anulada" ? "status-inactive" : row.status === "Confirmada" ? "status-active" : ""}>
                  <td>
                    <div className="cell-stack">
                      <strong>{row.name}</strong>
                      <small>
                        {row.activeSettlementCount
                          ? `${row.activeSettlementCount} liquidacion${row.activeSettlementCount === 1 ? "" : "es"} activa${row.activeSettlementCount === 1 ? "" : "s"} - ${row.status}`
                          : "Sin liquidacion cargada"}
                      </small>
                    </div>
                  </td>
                  <td>{row.baseSalary ? money(row.baseSalary) : "-"}</td>
                  <td>{row.extraAmount ? money(row.extraAmount) : "-"}</td>
                  <td>{row.bonuses ? money(row.bonuses) : "-"}</td>
                  <td>{row.otherDeductions ? money(row.otherDeductions) : "-"}</td>
                  <td className={row.totalAmount < 0 ? "money-negative" : "money-positive"}>{row.totalAmount ? money(row.totalAmount) : "-"}</td>
                  <td>{row.advances ? money(row.advances) : "-"}</td>
                  <td>{row.salaryPaid ? money(row.salaryPaid) : "-"}</td>
                  <td className={row.pendingAmount < 0 ? "money-negative" : "money-positive"}>{row.pendingAmount ? money(row.pendingAmount) : "-"}</td>
                  <td>
                    <button className="button primary compact" type="button" onClick={() => setSelectedStaffId(row.staffId)}>
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={10}>No hay empleados para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="embedded-panel salary-closures-panel">
        <div className="section-toolbar">
          <div>
            <h3>Historial de cierres</h3>
            <p>Cierres guardados de liquidacion de salarios. Son fotos auditadas del periodo.</p>
          </div>
          <span className="close-status-pill">{salaryClosures.length} cierre(s)</span>
        </div>
        <div className="table-wrap">
          <table className="data-table admin-data-table">
            <thead>
              <tr>
                {[
                  ["visibleId", "ID"],
                  ["periodLabel", "Periodo"],
                  ["employeeCount", "Empleados"],
                  ["totalSalaries", "Total salarios"],
                  ["totalBaseCovered", "Cubierto base"],
                  ["totalLiquidated", "Pagado / Entregado"],
                  ["totalPending", "Pendiente"],
                  ["createdByName", "Usuario"],
                  ["createdAt", "Fecha cierre"],
                  ["status", "Estado"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button className="sort-button" type="button" onClick={() => setClosureSort((current) => nextSort(current, key as typeof closureSort.key))}>
                      {label}
                      {sortIndicator(closureSort, key as typeof closureSort.key)}
                    </button>
                  </th>
                ))}
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {salaryClosures.map((closure) => (
                <tr key={closure.id} className={closure.status === "ANULADO" ? "status-inactive" : ""}>
                  <td>{closure.visibleId}</td>
                  <td>{closure.periodLabel}</td>
                  <td>{closure.employeeCount}</td>
                  <td>{money(closure.totalSalaries)}</td>
                  <td>{money(closure.totalBaseCovered)}</td>
                  <td>{money(closure.totalLiquidated)}</td>
                  <td className={closure.totalPending > 0 ? "money-negative" : "money-positive"}>{money(closure.totalPending)}</td>
                  <td>{closure.createdByName}</td>
                  <td>{formatDateTime(closure.createdAt)}</td>
                  <td>{closure.status}</td>
                  <td>
                    {closure.status === "CERRADO" ? (
                      <button className="button muted compact" type="button" onClick={() => annulSalaryClosure(closure)}>
                        Anular
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {!salaryClosures.length && (
                <tr>
                  <td colSpan={11}>Todavia no hay cierres de liquidacion guardados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selectedEmployee && (
        <Modal
          title={`Detalle de ${selectedEmployee.name}`}
          onClose={() => {
            setSelectedStaffId(null);
            setSelectedStaffMovementId(null);
          }}
          wide
        >
          <div className="salary-detail-modal">
            <div className="salary-detail-compact">
              <div className="salary-detail-context">
                <div>
                  <span>Local</span>
                  <strong>{localName(data, selectedEmployee.localId)}</strong>
                </div>
                <div>
                  <span>Periodo</span>
                  <strong>{periodLabel}</strong>
                </div>
                <div>
                  <span>Tipo / cargo</span>
                  <strong>{selectedEmployee.salaryType} - {selectedEmployee.position}</strong>
                </div>
                <div>
                  <span>Descuentos</span>
                  <strong>{money(selectedEmployee.otherDeductions)}</strong>
                </div>
              </div>
              <div className="salary-detail-metrics">
                {[
                  ["Salario base", money(selectedEmployee.baseSalary), ""],
                  ["Adelantos", money(selectedEmployee.advances), ""],
                  ["Premios y horas", money(selectedEmployee.extraAmount), ""],
                  ["Bonos", money(selectedEmployee.bonuses), ""],
                  ["Total", money(selectedEmployee.totalAmount), selectedEmployee.totalAmount < 0 ? "money-negative" : "money-positive"],
                  ["Cubierto base", money(selectedEmployee.baseCoveredAmount), "money-positive"],
                  ["Pagado / Entregado", money(selectedEmployee.liquidatedAmount), "money-positive"],
                  ["Pendiente", money(selectedEmployee.pendingAmount), selectedEmployee.pendingAmount > 0 ? "money-negative" : "money-positive"],
                ].map(([label, value, className]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong className={className}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <section className="embedded-panel">
              <div className="section-toolbar">
                <div>
                  <h3>Liquidaciones del periodo</h3>
                  <p>Detalle de conceptos cargados para este empleado.</p>
                </div>
                <button
                  className="button success compact"
                  type="button"
                  onClick={() => {
                    setEditorStaffId(selectedEmployee.staffId);
                    setEditorId(null);
                  }}
                >
                  Agregar liquidacion
                </button>
              </div>
              <div className="table-wrap">
                <table className="data-table admin-data-table salary-detail-table">
                  <thead>
                    <tr>
                      {[
                        ["period", "Mes"],
                        ["concept", "Concepto"],
                        ["salaryPaid", "Salario pagado"],
                        ["advances", "Adelanto"],
                        ["extraPrize", "Premio / Gratificacion"],
                        ["hoursExtra", "Horas extras"],
                        ["bonuses", "Bonos"],
                        ["otherDeductions", "Descuento"],
                        ["status", "Estado"],
                      ].map(([key, label]) => (
                        <th key={key}>
                          <button className="sort-button" type="button" onClick={() => setSettlementSort((current) => nextSort(current, key as typeof settlementSort.key))}>
                            {label}
                            {sortIndicator(settlementSort, key as typeof settlementSort.key)}
                          </button>
                        </th>
                      ))}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSettlements(selectedEmployee.settlements).map((settlement) => {
                      const concept = normalizeSalaryConcept(settlement.concept);
                      const extraPrize = concept === "EXTRA" ? Number(settlement.extraAmount ?? 0) : 0;
                      const hoursExtra = concept === "HORAS_EXTRAS" ? Number(settlement.extraAmount ?? 0) : 0;
                      return (
                        <tr key={settlement.id} className={settlement.status === "ANULADA" ? "status-inactive" : settlement.status === "CONFIRMADA" ? "status-active" : ""}>
                          <td>{settlement.period}</td>
                          <td>{salaryConceptLabel(concept)}</td>
                          <td>{isSalaryPaymentConcept(concept) ? money(salarySettlementAmount(settlement)) : "-"}</td>
                          <td>{settlement.advances ? money(settlement.advances) : "-"}</td>
                          <td>{extraPrize ? money(extraPrize) : "-"}</td>
                          <td>{hoursExtra ? money(hoursExtra) : "-"}</td>
                          <td>{settlement.aguinaldo + settlement.vacationSalary ? money(settlement.aguinaldo + settlement.vacationSalary) : "-"}</td>
                          <td>{settlement.otherDeductions ? money(settlement.otherDeductions) : "-"}</td>
                          <td>{settlement.status}</td>
                          <td>
                            <div className="table-actions">
                              {settlement.status !== "ANULADA" && (
                                <button
                                  className="button primary compact"
                                  type="button"
                                  onClick={() => {
                                    setEditorStaffId(selectedEmployee.staffId);
                                    setEditorId(settlement.id);
                                  }}
                                >
                                  Editar
                                </button>
                              )}
                              {settlement.status !== "ANULADA" && (
                                <button className="button muted compact" type="button" onClick={() => changeStatus(settlement, "ANULADA")}>
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!selectedEmployee.settlements.length && (
                      <tr>
                        <td colSpan={10}>Este empleado no tiene liquidaciones en el periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="embedded-panel">
              <div className="section-toolbar">
                <div>
                  <h3>Cuenta corriente del empleado</h3>
                  <p>Movimientos personales del periodo trabajado seleccionado.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table admin-data-table">
                  <thead>
                    <tr>
                      {[
                        ["createdAt", "Fecha"],
                        ["concept", "Concepto"],
                        ["amount", "Monto"],
                        ["totalAfter", "Total"],
                        ["pendingAfter", "Pendiente"],
                        ["user", "Usuario"],
                      ].map(([key, label]) => (
                        <th key={key}>
                          <button className="sort-button" type="button" onClick={() => setStaffAccountSort((current) => nextSort(current, key as typeof staffAccountSort.key))}>
                            {label}
                            {sortIndicator(staffAccountSort, key as typeof staffAccountSort.key)}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAccountRows.map(({ movement, amount, totalAfter, pendingAfter }) => (
                      <tr
                        key={movement.id}
                        className="clickable-row"
                        onClick={() => {
                          setShowSelectedStaffMovementBalance(false);
                          setSelectedStaffMovementId(movement.id);
                        }}
                      >
                        <td>{formatDateTime(movement.createdAt)}</td>
                        <td>{movementConceptLabel(movement.concept)}</td>
                        <td>{amount ? money(amount) : "-"}</td>
                        <td className={totalAfter < 0 ? "money-negative" : "money-positive"}>{money(totalAfter)}</td>
                        <td className={pendingAfter > 0 ? "money-negative" : "money-positive"}>{money(pendingAfter)}</td>
                        <td>{userDisplayName(data, movement.userId)}</td>
                      </tr>
                    ))}
                    {!selectedAccountRows.length && (
                      <tr>
                        <td colSpan={6}>Sin movimientos personales en el periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </Modal>
      )}
      {selectedStaffMovement && selectedEmployee && (
        <Modal
          title={showSelectedStaffMovementBalance && selectedStaffMovementBalance ? `Recaudacion ${balanceReferenceLabel(data, selectedStaffMovementBalance)}` : "Detalle de movimiento"}
          onClose={() => {
            setSelectedStaffMovementId(null);
            setShowSelectedStaffMovementBalance(false);
          }}
          wide
        >
          {showSelectedStaffMovementBalance && selectedStaffMovementBalance ? (
            <ClosedBalanceSummary data={data} balance={selectedStaffMovementBalance} />
          ) : (
          <div className="movement-detail-modal">
            <div className="account-summary-grid">
              <div>
                <span>Monto</span>
                <strong>{selectedStaffMovementRow?.amount ? money(selectedStaffMovementRow.amount) : "-"}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(selectedStaffMovementRow?.totalAfter)}</strong>
              </div>
              <div>
                <span>Pendiente</span>
                <strong>{money(selectedStaffMovementRow?.pendingAfter)}</strong>
              </div>
              <div>
                <span>Usuario</span>
                <strong>{userDisplayName(data, selectedStaffMovement.userId)}</strong>
              </div>
            </div>
            <dl className="summary-detail-list">
              <div>
                <dt>Empleado</dt>
                <dd>{selectedEmployee.name}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatDateTime(selectedStaffMovement.createdAt)}</dd>
              </div>
              <div>
                <dt>Concepto</dt>
                <dd>{movementConceptLabel(selectedStaffMovement.concept)}</dd>
              </div>
              <div>
                <dt>Origen</dt>
                <dd>{selectedStaffMovementSettlement?.origin === "CAJA" ? "Pago desde caja" : "Liquidacion administrativa"}</dd>
              </div>
              <div>
                <dt>Monto</dt>
                <dd>{money(selectedStaffMovement.amount)}</dd>
              </div>
              <div>
                <dt>Direccion</dt>
                <dd>{selectedStaffMovement.direction === "SALIDA" ? "Debito / salida" : "Credito / entrada"}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{selectedStaffMovement.status}</dd>
              </div>
              <div>
                <dt>Usuario movimiento</dt>
                <dd>{userDisplayName(data, selectedStaffMovement.userId)}</dd>
              </div>
              <div>
                <dt>Creado por</dt>
                <dd>{selectedStaffMovementSettlement?.createdByName ?? userDisplayName(data, selectedStaffMovementSettlement?.createdBy)}</dd>
              </div>
              <div>
                <dt>Aprobado por</dt>
                <dd>{selectedStaffMovementSettlement?.approvedByName ?? userDisplayName(data, selectedStaffMovementSettlement?.approvedBy)}</dd>
              </div>
              <div>
                <dt>Aprobado</dt>
                <dd>{selectedStaffMovementSettlement?.approvedAt ? formatDateTime(selectedStaffMovementSettlement.approvedAt) : "-"}</dd>
              </div>
              <div>
                <dt>Anulado por</dt>
                <dd>{selectedStaffMovementSettlement?.annulledByName ?? userDisplayName(data, selectedStaffMovementSettlement?.annulledBy)}</dd>
              </div>
              <div>
                <dt>Anulado</dt>
                <dd>{selectedStaffMovementSettlement?.annulledAt ? formatDateTime(selectedStaffMovementSettlement.annulledAt) : "-"}</dd>
              </div>
              <div>
                <dt>Recaudacion asociada</dt>
                <dd>{balanceReferenceLabel(data, selectedStaffMovementBalance)}</dd>
              </div>
              <div>
                <dt>Notas</dt>
                <dd>{selectedStaffMovementSettlement?.notes || selectedStaffMovement.detail || "-"}</dd>
              </div>
            </dl>
            {selectedStaffMovementBalance && (
              <div className="button-row end">
                <button className="button primary compact" type="button" onClick={() => setShowSelectedStaffMovementBalance(true)}>
                  Ver recaudacion completa
                </button>
              </div>
            )}
          </div>
          )}
        </Modal>
      )}
      {editorId !== undefined && (
        <SalarySettlementEditor
          data={data}
          user={user}
          settlementId={editorId}
          defaultPeriod={defaultPeriod}
          fixedStaffId={editorStaffId ?? undefined}
          onClose={() => {
            setEditorId(undefined);
            setEditorStaffId(null);
          }}
          patchData={patchData}
        />
      )}
    </section>
  );
}

