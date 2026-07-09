import type { AppData, Balance } from "../types";
import { totalsForBalance } from "./cashTotals";
import { roleLabels, userDisplayName } from "./display";

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function exportCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadFile(filename, content, "text/csv;charset=utf-8");
}

export function exportDailyExcel(data: AppData, balance: Balance) {
  const totals = totalsForBalance(data, balance.id);
  const declaredBank = balance.declaredBank ?? balance.nextBankBase ?? 0;
  const bankDifference = balance.bankDifference ?? 0;
  const expectedBank = declaredBank - bankDifference;
  const readings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const expenses = data.expenses.filter((expense) => expense.balanceId === balance.id);
  const transfers = data.transfers.filter((transfer) => transfer.balanceId === balance.id);
  const gifts = data.gifts.filter((gift) => gift.balanceId === balance.id);
  const machineRows = readings.map((reading) => {
    const machine = data.machines.find((item) => item.id === reading.machineId);
    return [
      machine?.visibleId ?? "",
      machine?.name ?? "",
      String(reading.inPrevious),
      String(reading.inActual ?? ""),
      String(reading.outPrevious),
      String(reading.outActual ?? ""),
      String(reading.result),
      reading.status,
      reading.observation,
    ];
  });

  const html = `
    <html><body>
      <h1>Poseidon - Cierre diario ${balance.operatingDate}</h1>
      <table border="1">${tableToRows([
        ["Efectivo inicial", String(balance.initialFund)],
        ["Banco inicial", String(balance.initialBankFund ?? 0)],
        ["Apertura por", userDisplayName(data, balance.openedBy)],
        ["Funcion apertura", balance.openedByRole ? roleLabels[balance.openedByRole] : ""],
        ["Cierre por", userDisplayName(data, balance.closedBy)],
        ["Funcion cierre", balance.closedByRole ? roleLabels[balance.closedByRole] : ""],
        ["Total IN", String(totals.totalIn)],
        ["Total OUT", String(totals.totalOut)],
        ["Resultado maquinas", String(totals.resultMachines)],
        ["Gastos", String(totals.totalExpenses)],
        ["Salarios", String(totals.totalSalaries)],
        ["Regalos efectivo", String(totals.giftCash)],
        ["Regalos credito", String(totals.giftCredit)],
        ["Transferencias", String(totals.totalTransfers)],
        ["Retiros efectivo", String(totals.withdrawalsCash)],
        ["Retiros transferencia", String(totals.withdrawalsBank)],
        ["Aportes efectivo", String(totals.capitalContributionsCash)],
        ["Aportes transferencia", String(totals.capitalContributionsBank)],
        ["Efectivo esperado", String(totals.expectedCash)],
        ["Efectivo declarado", String(balance.declaredCash ?? 0)],
        ["Efectivo proxima caja", String(balance.nextBase ?? 0)],
        ["Banco esperado", String(expectedBank)],
        ["Banco declarado", String(declaredBank)],
        ["Banco proxima caja", String(balance.nextBankBase ?? 0)],
        ["Retiro final efectivo", String(balance.finalWithdrawalCash ?? 0)],
        ["Retiro final banco", String(balance.finalWithdrawalBank ?? 0)],
        ["Diferencia efectivo", String(balance.cashDifference ?? totals.difference)],
        ["Diferencia banco", String(bankDifference)],
      ])}</table>
      <h2>Maquinas</h2>
      <table border="1">${tableToRows([
        ["ID", "Maquina", "IN anterior", "IN actual", "OUT anterior", "OUT actual", "Resultado", "Estado", "Obs."],
        ...machineRows,
      ])}</table>
      <h2>Movimientos</h2>
      <table border="1">${tableToRows([
        ["Tipo", "Detalle", "Monto", "Estado"],
        ...expenses.map((expense) => ["Gasto", `${expense.category} / ${expense.subcategory || "-"} - ${expense.description}`, String(expense.amount), expense.status]),
        ...transfers.map((transfer) => ["Transferencia", `${transfer.name} - ${transfer.receipt}`, String(transfer.amount), transfer.status]),
        ...gifts.map((gift) => ["Regalo", `${gift.type} - ${gift.description}`, String(gift.cashAmount + gift.creditAmount), gift.status]),
        ...data.capitalMovements
          .filter((movement) => movement.balanceId === balance.id)
          .map((movement) => [movement.type, `${movement.person} - ${movement.medium} - ${movement.note}`, String(movement.amount), movement.status]),
      ])}</table>
    </body></html>
  `;

  downloadFile(`poseidon-cierre-${balance.operatingDate}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
}

function tableToRows(rows: string[][]) {
  return rows
    .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/&/g, "&amp;")}</td>`).join("")}</tr>`)
    .join("");
}
