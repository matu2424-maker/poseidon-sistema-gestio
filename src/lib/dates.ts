export const nowIso = () => new Date().toISOString();

export const today = () => new Date().toISOString().slice(0, 10);

export const formatDateTime = (value: string) => new Date(value).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" });

export const formatTime = (value: string | undefined) => (value ? new Date(value).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }) : "-");

export function monthRange(monthOffset: number) {
  const base = new Date(`${today()}T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const end = new Date(base.getFullYear(), base.getMonth() + monthOffset + 1, 0);
  const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return { start: toInputDate(start), end: toInputDate(end) };
}

