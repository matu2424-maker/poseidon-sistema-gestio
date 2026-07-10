export type MonthlyPeriodMode = "current" | "previous" | "custom";

export type DateRange = {
  start: string;
  end: string;
};

const capitalize = (value: string) => (value ? `${value.charAt(0).toLocaleUpperCase("es-UY")}${value.slice(1)}` : value);

export const periodEndDate = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return `${period}-31`;
  return `${period}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
};

export const periodRange = (period: string): DateRange => ({
  start: `${period}-01`,
  end: periodEndDate(period),
});

export const periodForMode = (
  mode: MonthlyPeriodMode,
  currentPeriod: string,
  previousPeriod: string,
  customMonth: string,
  customYear: string,
) => {
  if (mode === "current") return currentPeriod;
  if (mode === "previous") return previousPeriod;
  return `${customYear}-${customMonth}`;
};

export const monthLabel = (period: string) =>
  capitalize(new Date(`${period}-01T00:00:00`).toLocaleDateString("es-UY", { month: "long", year: "numeric" }));

export const shortMonthLabel = (period: string) =>
  capitalize(new Date(`${period}-01T00:00:00`).toLocaleDateString("es-UY", { month: "long" }));

export const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  return {
    value,
    label: capitalize(new Date(2026, index, 1).toLocaleDateString("es-UY", { month: "long" })),
  };
});

export const historicalYearOptions = (...values: Array<string | undefined>) =>
  Array.from(
    new Set(
      values
        .map((value) => value?.slice(0, 4) ?? "")
        .filter((year) => /^\d{4}$/.test(year)),
    ),
  ).sort((a, b) => Number(b) - Number(a));
