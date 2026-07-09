import type { ChangeEvent, FocusEvent } from "react";

const currency = new Intl.NumberFormat("es-UY", {
  style: "currency",
  currency: "UYU",
  maximumFractionDigits: 0,
});

export const counterFormat = new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 });

export const money = (value: number | undefined | null) => currency.format(Number.isFinite(value ?? NaN) ? Number(value) : 0);

export const counter = (value: number | undefined | null) => counterFormat.format(Number.isFinite(value ?? NaN) ? Number(value) : 0);

export const parseCounter = (value: string) => Number(value.replace(/\D/g, "") || 0);

export const formatCounterInput = (value: string) => counter(parseCounter(value));

export const parseMoneyInput = (value: FormDataEntryValue | null) => Number(String(value ?? "").replace(/\D/g, "") || 0);

export const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? counterFormat.format(Number(digits)) : "";
};

export const moneyInputValue = (value: number | undefined | null) => (Number(value ?? 0) > 0 ? counterFormat.format(Number(value)) : "0");

export const normalizeMoneyInput = (value: string) => formatMoneyInput(value) || "0";

export const clearZeroMoneyInput = (value: string) => (parseMoneyInput(value) === 0 ? "" : value);

export const handleMoneyInput = (event: ChangeEvent<HTMLInputElement>) => {
  event.currentTarget.value = formatMoneyInput(event.currentTarget.value);
};

export const handleMoneyFocus = (event: FocusEvent<HTMLInputElement>) => {
  if (parseMoneyInput(event.currentTarget.value) === 0) event.currentTarget.value = "";
};

export const handleMoneyBlur = (event: FocusEvent<HTMLInputElement>) => {
  event.currentTarget.value = normalizeMoneyInput(event.currentTarget.value);
};

