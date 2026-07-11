import { describe, expect, it } from "vitest";
import { clearOperationalData, createSeedData } from "../../data/appData";
import { accountTotalsFromMovements } from "../../lib/accountMovements";
import { staffAccountId } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { annulSalarySettlementCommand, saveSalarySettlementCommand } from "./salarySettlementCommands";

const contextFor = (data: ReturnType<typeof createSeedData>) => {
  const user = data.users.find((item) => item.role === "ENCARGADO")!;
  let id = 0;
  return commandContext(user, "ENCARGADO", {
    now: () => "2026-08-05T15:00:00.000Z",
    id: (prefix) => `${prefix}-test-${++id}`,
  });
};

describe("comandos salariales", () => {
  it("crea, corrige y anula sin perder asientos anteriores", () => {
    const data = clearOperationalData(createSeedData());
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    const context = contextFor(data);
    const created = saveSalarySettlementCommand(
      data,
      { staffId: staff.id, period: "2026-08", concept: "ADELANTO", amount: 1000, notes: "Primer adelanto", origin: "LIQUIDACION" },
      context,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.staff.find((item) => item.id === staff.id)?.salaryAdvanceBalance).toBe(1000);

    const corrected = saveSalarySettlementCommand(
      created.data,
      { settlementId: created.value.id, staffId: staff.id, period: "2026-08", concept: "ADELANTO", amount: 1500, notes: "Monto corregido", origin: "LIQUIDACION" },
      context,
    );
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;
    expect(corrected.data.salarySettlements.find((item) => item.id === created.value.id)?.status).toBe("ANULADA");
    expect(corrected.data.accountMovements.some((item) => item.reversalOf === `account-movement-salary-${created.value.id}`)).toBe(true);
    const staffBalance = accountTotalsFromMovements(corrected.data.accountMovements.filter((item) => item.accountId === staffAccountId(staff.id))).balance;
    expect(staffBalance).toBe(-1500);

    const annulled = annulSalarySettlementCommand(corrected.data, corrected.value.id, context);
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(accountTotalsFromMovements(annulled.data.accountMovements.filter((item) => item.accountId === staffAccountId(staff.id))).balance).toBe(0);
    expect(annulled.data.staff.find((item) => item.id === staff.id)?.salaryAdvanceBalance).toBe(0);
  });
});
