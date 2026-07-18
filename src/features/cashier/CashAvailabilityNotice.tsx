import { localAccountBalances } from "../../lib/currentAccounts";
import { money } from "../../lib/money";
import type { AppData, Balance } from "../../types";

export function CashAvailabilityNotice({
  data,
  balance,
  title = "Caja / Efectivo actual",
  detail,
}: {
  data: AppData;
  balance: Balance;
  title?: string;
  detail?: string;
}) {
  const balances = localAccountBalances(data, balance.localId);

  return (
    <div className="cash-availability-notice" aria-label="Saldo actual de Caja / Efectivo">
      <span>{title}</span>
      <strong>{money(balances.cash)}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
