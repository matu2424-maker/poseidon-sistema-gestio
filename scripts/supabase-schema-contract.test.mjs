import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const testsDir = path.join(rootDir, "supabase", "tests", "database");

const readDirectorySql = async (directory) => {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  return Promise.all(
    names.map(async (name) => ({
      name,
      content: await readFile(path.join(directory, name), "utf8"),
    })),
  );
};

describe("contrato estatico del esquema Supabase", () => {
  it("mantiene migraciones ordenadas, atomicas y pruebas SQL identificables", async () => {
    const migrations = await readDirectorySql(migrationsDir);
    const tests = await readDirectorySql(testsDir);

    expect(migrations.map(({ name }) => name)).toEqual([
      "20260726000100_extensions_and_enums.sql",
      "20260726000200_identity_and_master_data.sql",
      "20260726000300_cash_operations_and_ledger.sql",
      "20260726000400_salaries_and_closures.sql",
      "20260726000500_attachments_audit_idempotency.sql",
      "20260726000600_security_helpers_and_rls.sql",
    ]);
    expect(tests).toHaveLength(4);
    migrations.forEach(({ content }) => {
      expect(content.trimStart().startsWith("begin;")).toBe(true);
      expect(content.trimEnd().endsWith("commit;")).toBe(true);
    });
  });

  it("no concede escritura directa ni expone una RPC AppData generica", async () => {
    const migrations = await readDirectorySql(migrationsDir);
    const sql = migrations.map(({ content }) => content).join("\n");

    expect(sql).not.toMatch(
      /grant\s+(?:all|insert|update|delete)[\s\S]*?\bto\s+(?:anon|authenticated)\b/i,
    );
    expect(sql).not.toMatch(
      /create\s+(?:or\s+replace\s+)?function\s+public\.[a-z0-9_]*appdata/i,
    );
    expect(sql).toContain(
      "revoke all on all tables in schema public from anon, authenticated",
    );
  });

  it("conserva los cierres de alcance detectados por revision contable", async () => {
    const identity = await readFile(
      path.join(migrationsDir, "20260726000200_identity_and_master_data.sql"),
      "utf8",
    );
    const salaries = await readFile(
      path.join(migrationsDir, "20260726000400_salaries_and_closures.sql"),
      "utf8",
    );
    const security = await readFile(
      path.join(migrationsDir, "20260726000600_security_helpers_and_rls.sql"),
      "utf8",
    );

    expect(identity).toContain("changed_by_name_snapshot text not null");
    expect(salaries).toContain("salary_closure_employee_local_fk");
    expect(security).toContain("create policy staff_select_by_control_local");
    expect(security).toContain("create policy expenses_select_by_scope");
    expect(security).toContain("private.can_access_all_locals");
    expect(security).toContain("kind in ('LOCAL_EFECTIVO', 'LOCAL_BANCO')");
  });

  it("mantiene sincronizados los planes pgTAP y sus aserciones", async () => {
    const tests = await readDirectorySql(testsDir);

    tests.forEach(({ name, content }) => {
      const plan = Number(content.match(/select plan\((\d+)\)/i)?.[1] ?? -1);
      const assertions = [
        ...content.matchAll(
          /^select\s+(?:is|ok|throws_ok|pass)\s*\(/gim,
        ),
      ].length;
      expect({ name, assertions }).toEqual({ name, assertions: plan });
    });
  });
});
