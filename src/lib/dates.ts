export const nowIso = () => new Date().toISOString();

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
