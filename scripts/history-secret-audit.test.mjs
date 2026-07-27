import { describe, expect, it } from "vitest";
import { historicalSecretRuleIds } from "./history-secret-audit.mjs";

describe("auditoria de secretos historicos", () => {
  it("clasifica credenciales sin devolver el valor sensible", () => {
    const secret = ["sb", "p_", "examplebutlongenough123456789"].join("");
    const rules = historicalSecretRuleIds(`SUPABASE_ACCESS_TOKEN=${secret}`);

    expect(rules).toContain("ASSIGNED_SECRET");
    expect(rules).toContain("SUPABASE_SECRET_TOKEN");
    expect(JSON.stringify(rules)).not.toContain(secret);
  });

  it("acepta placeholders documentales", () => {
    expect(
      historicalSecretRuleIds(
        "SUPABASE_ACCESS_TOKEN=<token>\nDATABASE_URL=${DATABASE_URL}",
      ),
    ).toEqual([]);
  });

  it("detecta claves privadas y URLs PostgreSQL con contrasena", () => {
    const privateKeyMarker = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
    const postgresUrl = [
      "postgresql://user:",
      "password@db.example.test/postgres",
    ].join("");
    expect(
      historicalSecretRuleIds(`${privateKeyMarker}\n${postgresUrl}`),
    ).toEqual(["PRIVATE_KEY", "POSTGRES_CREDENTIAL_URL"]);
  });
});
