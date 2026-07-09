export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

export const shortNumberId = (value: string) => {
  const digits = value.trim();
  if (!/^\d{1,4}$/.test(digits)) return "";
  const numeric = Number(digits);
  return numeric > 0 ? String(numeric) : "";
};

export const nextShortId = (ids: string[]) => String(Math.max(0, ...ids.map((id) => Number(shortNumberId(id)) || 0)) + 1);
