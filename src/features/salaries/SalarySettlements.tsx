import { useState } from "react";
import type { AccountMovement, AppData, SalaryClosure, SalaryClosureEmployeeSnapshot, SalarySettlement, User } from "../../types";
import { salaryAccountMovement } from "../../lib/accountMovements";
import { balanceForMovement, balanceReferenceLabel } from "../../lib/balanceReferences";
import { staffAccountId } from "../../lib/currentAccounts";
import { formatDateTime, monthRange, today } from "../../lib/dates";
import { confirmAction } from "../../lib/confirmations";
import { localName, userDisplayName } from "../../lib/display";
import { exportCsv } from "../../lib/export";
import { money } from "../../lib/money";
import { historicalYearOptions, monthLabel, periodForMode, periodRange, type MonthlyPeriodMode } from "../../lib/periods";
import {
  isSalaryPaymentConcept,
  movementConceptLabel,
  normalizeSalaryConcept,
  salaryConceptLabel,
  salarySettlementAmount,
  salarySettlementTotalDelta,
  suggestedSalaryPeriodModeFromDate,
} from "../../lib/salaryRules";
import {
  latestClosedSalaryClosure,
  openSalaryCorrection,
  salaryClosurePeriod,
  salaryPeriodEmployeeSummaries,
  salaryPeriodTotals,
} from "../../lib/salaryClosures";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { InfoCard, Modal } from "../../components/ui";
import { MonthlyPeriodSelector } from "../../components/MonthlyPeriodSelector";
import { ClosedBalanceSummary } from "../cashier/ClosedBalanceSummary";
import { commandContext } from "../../application/command";
import { annulSalarySettlementCommand } from "../../application/salaries/salarySettlementCommands";
import {
  cancelSalaryCorrectionCommand,
  closeSalaryCorrectionCommand,
  closeSalaryPeriodCommand,
  startSalaryCorrectionCommand,
} from "../../application/salaries/salaryClosureCommands";
import { SalarySettlementEditor } from "./SalarySettlementEditor";

export function AdminSalarySettlements({
  data,
  user,
  patchData,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
}) {
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [editorStaffId, setEditorStaffId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffMovementId, setSelectedStaffMovementId] = useState<string | null>(null);
  const [showSelectedStaffMovementBalance, setShowSelectedStaffMovementBalance] = useState(false);
  const [closureMessage, setClosureMessage] = useState("");
  const [selectedClosureId, setSelectedClosureId] = useState<string | null>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");
  const [correctionError, setCorrectionError] = useState("");
  const [settlementSort, setSettlementSort] = useState<
    SortState<"period" | "concept" | "paymentAccount" | "salaryPaid" | "advances" | "extraPrize" | "hoursExtra" | "bonuses" | "otherDeductions" | "status">
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
    SortState<"visibleId" | "periodLabel" | "kind" | "revision" | "employeeCount" | "totalSalaries" | "totalBaseCovered" | "totalLiquidated" | "totalPending" | "createdByName" | "closedAt" | "status">
  >({
    key: "closedAt",
    direction: "desc",
  });
  const [snapshotSort, setSnapshotSort] = useState<
    SortState<"staffName" | "baseSalary" | "extraAmount" | "bonuses" | "deductions" | "totalAmount" | "advances" | "salaryPaid" | "pendingAmount">
  >({ key: "staffName", direction: "asc" });
  const selectedPeriod = periodForMode(periodMode, currentPeriod, previousPeriod, customMonth, customYear);
  const activeRange = periodRange(selectedPeriod);
  const startMonth = selectedPeriod;
  const endMonth = selectedPeriod;
  const defaultPeriod = startMonth;
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
    ...data.salaryClosures.map((closure) => salaryClosurePeriod(closure)),
  );
  const rangeSettlements = data.salarySettlements.filter((settlement) => settlement.period === selectedPeriod);
  const payableRows = rangeSettlements.filter((settlement) => settlement.status !== "ANULADA");
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");
  const employeeRowsAll = salaryPeriodEmployeeSummaries(data, selectedPeriod);
  const summaryRows = employeeRowsAll;
  const periodTotals = salaryPeriodTotals(summaryRows);
  const periodTotal = periodTotals.totalSalaries;
  const periodPending = periodTotals.totalPending;
  const periodBase = periodTotals.totalBase;
  const periodSalaryPaid = periodTotals.totalSalaryPaid;
  const periodAdvances = periodTotals.totalAdvances;
  const periodExtras = periodTotals.totalExtras;
  const periodBonuses = periodTotals.totalBonuses;
  const periodDeductions = periodTotals.totalDeductions;
  const periodBaseCovered = periodTotals.totalBaseCovered;
  const periodLiquidated = periodTotals.totalLiquidated;
  const latestClosure = latestClosedSalaryClosure(data, selectedPeriod);
  const activeCorrection = openSalaryCorrection(data, selectedPeriod);
  const canMutatePeriod = !latestClosure || Boolean(activeCorrection);
  const employeeValue = (row: (typeof employeeRowsAll)[number], key: typeof sort.key): string | number => {
    if (key === "name") return row.name;
    return row[key];
  };
  const settlementSortValue = (settlement: SalarySettlement, key: typeof settlementSort.key): string | number => {
    const concept = normalizeSalaryConcept(settlement.concept);
    if (key === "period") return settlement.period;
    if (key === "concept") return salaryConceptLabel(concept);
    if (key === "paymentAccount") {
      if (concept === "DESCUENTO") return "No mueve fondos";
      return data.currentAccounts.find((account) => account.id === settlement.paymentAccountId)?.name ?? "Caja / Efectivo";
    }
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
    if (key === "kind") return closure.kind;
    if (key === "revision") return closure.revision;
    if (key === "employeeCount") return closure.employeeCount;
    if (key === "totalSalaries") return closure.totalSalaries;
    if (key === "totalBaseCovered") return closure.totalBaseCovered;
    if (key === "totalLiquidated") return closure.totalLiquidated;
    if (key === "totalPending") return closure.totalPending;
    if (key === "createdByName") return closure.createdByName;
    if (key === "status") return closure.status;
    return closure.closedAt ?? closure.createdAt;
  };
  const salaryClosures = [...data.salaryClosures].sort((a, b) => {
    const result = compareValues(salaryClosureValue(a, closureSort.key), salaryClosureValue(b, closureSort.key));
    return closureSort.direction === "asc" ? result : -result;
  });
  const selectedClosure = selectedClosureId
    ? data.salaryClosures.find((closure) => closure.id === selectedClosureId)
    : undefined;
  const closureKindLabel = (closure: SalaryClosure) =>
    closure.kind === "CORRECTIVO" ? `Correctivo R${closure.revision}` : "Ordinario";
  const snapshotValue = (snapshot: SalaryClosureEmployeeSnapshot, key: typeof snapshotSort.key) => {
    if (key === "staffName") return snapshot.staffName;
    return snapshot[key];
  };
  const sortedClosureSnapshots = selectedClosure
    ? [...selectedClosure.employeeSnapshots].sort((a, b) => {
        const result = compareValues(snapshotValue(a, snapshotSort.key), snapshotValue(b, snapshotSort.key));
        return snapshotSort.direction === "asc" ? result : -result;
      })
    : [];
  const closeSalaryPeriod = () => {
    if (!confirmAction(`Cerrar definitivamente ${periodLabel}? El periodo quedara bloqueado y cualquier cambio exigira un ajuste correctivo.`)) return;
    const result = closeSalaryPeriodCommand(data, { period: selectedPeriod }, commandContext(user, user.role));
    if (!result.ok) {
      setClosureMessage(result.error);
      return;
    }
    patchData(() => result.data);
    setClosureMessage(`${result.value.visibleId}: cierre salarial definitivo guardado.`);
  };
  const startSalaryCorrection = () => {
    if (!latestClosure) return;
    const result = startSalaryCorrectionCommand(
      data,
      { parentClosureId: latestClosure.id, note: correctionNote },
      commandContext(user, user.role),
    );
    if (!result.ok) {
      setCorrectionError(result.error);
      return;
    }
    patchData(() => result.data);
    setCorrectionError("");
    setCorrectionNote("");
    setShowCorrectionForm(false);
    setClosureMessage(`${result.value.visibleId}: ajuste correctivo abierto. Los cambios quedaran enlazados a esta revision.`);
  };
  const finishSalaryCorrection = () => {
    if (!activeCorrection) return;
    if (!confirmAction(`Cerrar el ajuste ${activeCorrection.visibleId}? La nueva foto quedara inmutable.`)) return;
    const result = closeSalaryCorrectionCommand(data, activeCorrection.id, commandContext(user, user.role));
    if (!result.ok) {
      setClosureMessage(result.error);
      return;
    }
    patchData(() => result.data);
    setClosureMessage(`${result.value.visibleId}: ajuste correctivo cerrado y nueva foto guardada.`);
  };
  const cancelSalaryCorrection = () => {
    if (!activeCorrection) return;
    if (!confirmAction(`Cancelar el ajuste ${activeCorrection.visibleId}? Solo es posible si todavia no tiene movimientos.`)) return;
    const result = cancelSalaryCorrectionCommand(data, activeCorrection.id, commandContext(user, user.role));
    if (!result.ok) {
      setClosureMessage(result.error);
      return;
    }
    patchData(() => result.data);
    setClosureMessage(`${result.value.visibleId}: ajuste correctivo cancelado sin modificar el cierre original.`);
  };
  const annulSettlement = (settlement: SalarySettlement) => {
    if (!confirmAction(`Eliminar liquidacion de ${settlement.staffName}? Queda registrada en auditoria y no impacta los totales.`)) return;
    const result = annulSalarySettlementCommand(data, settlement.id, commandContext(user, user.role), {
      correctionClosureId: activeCorrection?.id,
      reason: activeCorrection ? `Ajuste correctivo ${activeCorrection.visibleId}` : "Anulacion",
    });
    if (!result.ok) {
      setClosureMessage(result.error);
      return;
    }
    patchData(() => result.data);
    setClosureMessage(
      activeCorrection
        ? `Liquidacion anulada dentro del ajuste ${activeCorrection.visibleId}.`
        : "Liquidacion anulada y compensada en cuentas.",
    );
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
          {activeCorrection ? (
            <div className="button-row end">
              <button className="button muted compact" type="button" onClick={cancelSalaryCorrection}>
                Cancelar ajuste
              </button>
              <button className="button success compact" type="button" onClick={finishSalaryCorrection}>
                Cerrar ajuste correctivo
              </button>
            </div>
          ) : latestClosure ? (
            <button className="button primary compact" type="button" onClick={() => setShowCorrectionForm(true)}>
              Iniciar ajuste correctivo
            </button>
          ) : (
            <button className="button success compact" type="button" onClick={closeSalaryPeriod}>
              Cerrar liquidacion
            </button>
          )}
        </div>
      </div>
      {closureMessage && <p className="notice">{closureMessage}</p>}
      {activeCorrection ? (
        <p className="notice warning">
          Ajuste {activeCorrection.visibleId} abierto sobre {latestClosure?.visibleId}. Motivo: {activeCorrection.note}
        </p>
      ) : latestClosure ? (
        <p className="notice">
          Periodo cerrado por {latestClosure.visibleId}. La foto salarial es inmutable; cualquier cambio exige un ajuste correctivo.
        </p>
      ) : null}
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
                  <th key={key} aria-sort={ariaSort(sort, key as typeof sort.key)}>
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
                  ["kind", "Tipo"],
                  ["revision", "Revision"],
                  ["employeeCount", "Empleados"],
                  ["totalSalaries", "Total salarios"],
                  ["totalBaseCovered", "Cubierto base"],
                  ["totalLiquidated", "Pagado / Entregado"],
                  ["totalPending", "Pendiente"],
                  ["createdByName", "Usuario"],
                  ["closedAt", "Fecha cierre"],
                  ["status", "Estado"],
                ].map(([key, label]) => (
                  <th key={key} aria-sort={ariaSort(closureSort, key as typeof closureSort.key)}>
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
                <tr
                  key={closure.id}
                  className={
                    closure.status === "ANULADO"
                      ? "status-inactive"
                      : closure.status === "CORRECCION_ABIERTA"
                        ? "status-maintenance"
                        : ""
                  }
                >
                  <td>{closure.visibleId}</td>
                  <td>{closure.periodLabel}</td>
                  <td>{closure.kind === "CORRECTIVO" ? "Correctivo" : "Ordinario"}</td>
                  <td>R{closure.revision}</td>
                  <td>{closure.employeeCount}</td>
                  <td>{money(closure.totalSalaries)}</td>
                  <td>{money(closure.totalBaseCovered)}</td>
                  <td>{money(closure.totalLiquidated)}</td>
                  <td className={closure.totalPending > 0 ? "money-negative" : "money-positive"}>{money(closure.totalPending)}</td>
                  <td>{closure.createdByName}</td>
                  <td>{closure.closedAt ? formatDateTime(closure.closedAt) : "En curso"}</td>
                  <td>{closure.status}</td>
                  <td>
                    <button className="button primary compact" type="button" onClick={() => setSelectedClosureId(closure.id)}>
                      Ver foto
                    </button>
                  </td>
                </tr>
              ))}
              {!salaryClosures.length && (
                <tr>
                  <td colSpan={13}>Todavia no hay cierres de liquidacion guardados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {showCorrectionForm && latestClosure && (
        <Modal
          title={`Ajuste correctivo de ${latestClosure.visibleId}`}
          onClose={() => {
            setShowCorrectionForm(false);
            setCorrectionError("");
          }}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              startSalaryCorrection();
            }}
          >
            {correctionError && <p className="notice warning span-2" role="alert">{correctionError}</p>}
            <p className="helper span-2">
              El cierre original no se modifica. Las operaciones nuevas o anuladas quedaran enlazadas a una revision correctiva.
            </p>
            <label className="span-2">
              Motivo del ajuste *
              <textarea
                value={correctionNote}
                onChange={(event) => setCorrectionNote(event.target.value)}
                rows={4}
                placeholder="Explica el error, omision o correccion necesaria."
                required
              />
            </label>
            <div className="form-actions span-2">
              <div className="button-row end">
                <button className="button muted" type="button" onClick={() => setShowCorrectionForm(false)}>
                  Cancelar
                </button>
                <button className="button primary" type="submit">
                  Abrir ajuste correctivo
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {selectedClosure && (
        <Modal title={`Foto salarial ${selectedClosure.visibleId}`} onClose={() => setSelectedClosureId(null)} wide>
          <div className="salary-detail-modal">
            <dl className="summary-detail-list">
              <div>
                <dt>Periodo</dt>
                <dd>{selectedClosure.periodLabel}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{closureKindLabel(selectedClosure)}</dd>
              </div>
              <div>
                <dt>Cierre anterior</dt>
                <dd>{data.salaryClosures.find((closure) => closure.id === selectedClosure.parentClosureId)?.visibleId ?? "-"}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{selectedClosure.status}</dd>
              </div>
              <div>
                <dt>Cerrado por</dt>
                <dd>{selectedClosure.closedByName ?? "En curso"}</dd>
              </div>
              <div>
                <dt>Fecha de cierre</dt>
                <dd>{selectedClosure.closedAt ? formatDateTime(selectedClosure.closedAt) : "En curso"}</dd>
              </div>
              <div>
                <dt>Motivo</dt>
                <dd>{selectedClosure.note || "-"}</dd>
              </div>
            </dl>
            {selectedClosure.snapshotVersion < 1 && (
              <p className="notice warning">
                Cierre historico anterior al snapshot por empleado. Conserva totales e IDs, pero no dispone del desglose congelado.
              </p>
            )}
            <div className="table-wrap">
              <table className="data-table admin-data-table salary-table">
                <thead>
                  <tr>
                    {[
                      ["staffName", "Empleado"],
                      ["baseSalary", "Salario base"],
                      ["extraAmount", "Premios y horas"],
                      ["bonuses", "Bonos"],
                      ["deductions", "Descuentos"],
                      ["totalAmount", "Total"],
                      ["advances", "Adelantos"],
                      ["salaryPaid", "Salario pagado"],
                      ["pendingAmount", "Pendiente"],
                    ].map(([key, label]) => (
                      <th key={key} aria-sort={ariaSort(snapshotSort, key as typeof snapshotSort.key)}>
                        <button
                          className="sort-button"
                          type="button"
                          onClick={() => setSnapshotSort((current) => nextSort(current, key as typeof snapshotSort.key))}
                        >
                          {label}
                          {sortIndicator(snapshotSort, key as typeof snapshotSort.key)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedClosureSnapshots.map((snapshot) => (
                    <tr key={snapshot.staffId}>
                      <td>
                        <div className="cell-stack">
                          <strong>{snapshot.staffName}</strong>
                          <small>{snapshot.salaryType} - {snapshot.position}</small>
                          {snapshot.settlements.length > 0 && (
                            <details>
                              <summary>{snapshot.settlements.length} movimiento(s)</summary>
                              <ul className="compact-list">
                                {snapshot.settlements.map((settlement) => (
                                  <li key={settlement.id}>
                                    {salaryConceptLabel(settlement.concept)}: {money(settlement.amount)} - {settlement.approvedByName}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </td>
                      <td>{money(snapshot.baseSalary)}</td>
                      <td>{money(snapshot.extraAmount)}</td>
                      <td>{money(snapshot.bonuses)}</td>
                      <td>{money(snapshot.deductions)}</td>
                      <td>{money(snapshot.totalAmount)}</td>
                      <td>{money(snapshot.advances)}</td>
                      <td>{money(snapshot.salaryPaid)}</td>
                      <td className={snapshot.pendingAmount > 0 ? "money-negative" : "money-positive"}>{money(snapshot.pendingAmount)}</td>
                    </tr>
                  ))}
                  {!sortedClosureSnapshots.length && (
                    <tr>
                      <td colSpan={9}>Este cierre no tiene un snapshot detallado por empleado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
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
                {canMutatePeriod ? (
                  <button
                    className="button success compact"
                    type="button"
                    onClick={() => {
                      setEditorStaffId(selectedEmployee.staffId);
                      setEditorId(null);
                    }}
                  >
                    {activeCorrection ? "Agregar correccion" : "Agregar liquidacion"}
                  </button>
                ) : (
                  <span className="close-status-pill">Periodo cerrado</span>
                )}
              </div>
              <div className="table-wrap">
                <table className="data-table admin-data-table salary-detail-table">
                  <thead>
                    <tr>
                      {[
                        ["period", "Mes"],
                        ["concept", "Concepto"],
                        ["paymentAccount", "Cuenta de pago"],
                        ["salaryPaid", "Salario pagado"],
                        ["advances", "Adelanto"],
                        ["extraPrize", "Premio / Gratificacion"],
                        ["hoursExtra", "Horas extras"],
                        ["bonuses", "Bonos"],
                        ["otherDeductions", "Descuento"],
                        ["status", "Estado"],
                      ].map(([key, label]) => (
                        <th key={key} aria-sort={ariaSort(settlementSort, key as typeof settlementSort.key)}>
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
                          <td>
                            {concept === "DESCUENTO"
                              ? "No mueve fondos"
                              : data.currentAccounts.find((account) => account.id === settlement.paymentAccountId)?.name ?? "Caja / Efectivo"}
                          </td>
                          <td>{isSalaryPaymentConcept(concept) ? money(salarySettlementAmount(settlement)) : "-"}</td>
                          <td>{settlement.advances ? money(settlement.advances) : "-"}</td>
                          <td>{extraPrize ? money(extraPrize) : "-"}</td>
                          <td>{hoursExtra ? money(hoursExtra) : "-"}</td>
                          <td>{settlement.aguinaldo + settlement.vacationSalary ? money(settlement.aguinaldo + settlement.vacationSalary) : "-"}</td>
                          <td>{settlement.otherDeductions ? money(settlement.otherDeductions) : "-"}</td>
                          <td>{settlement.status}</td>
                          <td>
                            <div className="table-actions">
                              {canMutatePeriod && settlement.status !== "ANULADA" && (
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
                              {canMutatePeriod && settlement.status !== "ANULADA" && (
                                <button className="button muted compact" type="button" onClick={() => annulSettlement(settlement)}>
                                  Eliminar
                                </button>
                              )}
                              {!canMutatePeriod && "-"}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!selectedEmployee.settlements.length && (
                      <tr>
                        <td colSpan={11}>Este empleado no tiene liquidaciones en el periodo.</td>
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
                        <th key={key} aria-sort={ariaSort(staffAccountSort, key as typeof staffAccountSort.key)}>
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
                <dt>Cuenta de pago</dt>
                <dd>
                  {normalizeSalaryConcept(selectedStaffMovementSettlement?.concept) === "DESCUENTO"
                    ? "No mueve fondos"
                    : data.currentAccounts.find((account) => account.id === selectedStaffMovementSettlement?.paymentAccountId)?.name ?? "Caja / Efectivo"}
                </dd>
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

