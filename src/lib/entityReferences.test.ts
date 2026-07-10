import { describe, expect, it } from "vitest";
import { createSeedData } from "../data/appData";
import { clientDeletionReferences, localDeletionReferences, staffDeletionReferences } from "./entityReferences";

describe("integridad referencial para bajas definitivas", () => {
  it("detecta operaciones vinculadas a personal y clientes", () => {
    const data = createSeedData();
    const staffId = data.salarySettlements[0]?.staffId ?? "";
    const clientId = data.gifts[0]?.clientIds?.[0] ?? "";
    expect(staffDeletionReferences(data, staffId).some((item) => item.label === "liquidaciones salariales")).toBe(true);
    expect(clientDeletionReferences(data, clientId).some((item) => item.label === "regalos")).toBe(true);
  });

  it("protege locales con recaudaciones e historial", () => {
    const data = createSeedData();
    expect(localDeletionReferences(data, data.locals[0].id).map((item) => item.label)).toContain("recaudaciones");
  });
});
