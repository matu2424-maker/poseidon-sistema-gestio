export const nowIso = () => new Date().toISOString();

export const OPERATING_TIME_ZONE = "America/Montevideo";

const operatingDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: OPERATING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function operatingDateFromTimestamp(value: string | Date | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : operatingDateFormatter.format(date);
}

export function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const today = () => localDate();

export const formatDateTime = (value: string) => new Date(value).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" });

export const formatTime = (value: string | undefined) => (value ? new Date(value).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }) : "-");

export function monthRange(monthOffset: number, baseDate = today()) {
  const base = new Date(`${baseDate}T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const end = new Date(base.getFullYear(), base.getMonth() + monthOffset + 1, 0);
  return { start: localDate(start), end: localDate(end) };
}
