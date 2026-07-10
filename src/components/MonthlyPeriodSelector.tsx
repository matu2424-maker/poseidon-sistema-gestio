import type { ReactNode } from "react";
import { monthLabel, monthOptions, shortMonthLabel, type MonthlyPeriodMode } from "../lib/periods";

type MonthlyPeriodSelectorProps = {
  mode: MonthlyPeriodMode;
  currentPeriod: string;
  previousPeriod: string;
  customMonth: string;
  customYear: string;
  yearOptions: string[];
  onModeChange: (mode: MonthlyPeriodMode) => void;
  onCustomMonthChange: (month: string) => void;
  onCustomYearChange: (year: string) => void;
  selectedPeriod: string;
  customButtonLabel?: string;
  className?: string;
  rangeClassName?: string;
  actions?: ReactNode;
};

export function MonthlyPeriodSelector({
  mode,
  currentPeriod,
  previousPeriod,
  customMonth,
  customYear,
  yearOptions,
  onModeChange,
  onCustomMonthChange,
  onCustomYearChange,
  selectedPeriod,
  customButtonLabel = "Consulta historica",
  className = "",
  rangeClassName = "",
  actions,
}: MonthlyPeriodSelectorProps) {
  return (
    <div className={`accounts-period-bar ${className}`.trim()}>
      <div className="button-row">
        <button className={mode === "previous" ? "button primary compact period-month-button" : "button muted compact period-month-button"} type="button" onClick={() => onModeChange("previous")}>
          {shortMonthLabel(previousPeriod)}
        </button>
        <button className={mode === "current" ? "button primary compact period-month-button" : "button muted compact period-month-button"} type="button" onClick={() => onModeChange("current")}>
          {shortMonthLabel(currentPeriod)}
        </button>
        <button className={mode === "custom" ? "button primary compact" : "button muted compact"} type="button" onClick={() => onModeChange("custom")}>
          {customButtonLabel}
        </button>
      </div>
      <div className={`accounts-date-range ${rangeClassName}`.trim()}>
        <span>{monthLabel(selectedPeriod)}</span>
        {mode === "custom" && (
          <>
            <select aria-label="Mes historico" value={customMonth} onChange={(event) => onCustomMonthChange(event.target.value)}>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <select aria-label="Ano historico" value={customYear} onChange={(event) => onCustomYearChange(event.target.value)}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </>
        )}
        {actions}
      </div>
    </div>
  );
}
