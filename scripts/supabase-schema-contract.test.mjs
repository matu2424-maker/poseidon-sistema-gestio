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
      "20260726000700_transactional_command_runtime.sql",
      "20260726000800_session_context_and_security_hardening.sql",
      "20260726000900_transactional_cash_commands.sql",
      "20260726001000_transactional_cash_movements.sql",
      "20260726001100_transactional_salaries_differences.sql",
      "20260726001200_transactional_master_commands.sql",
      "20260726001300_transactional_periodic_closures.sql",
      "20260726001400_restore_rls_helper_privileges.sql",
    ]);
    expect(tests).toHaveLength(11);
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

  it("expone solamente los comandos financieros transaccionales implementados", async () => {
    const runtime = await readFile(
      path.join(migrationsDir, "20260726000700_transactional_command_runtime.sql"),
      "utf8",
    );
    const hardening = await readFile(
      path.join(
        migrationsDir,
        "20260726000800_session_context_and_security_hardening.sql",
      ),
      "utf8",
    );

    [
      "poseidon_create_expense",
      "poseidon_create_principal_expense",
      "poseidon_annul_expense",
      "poseidon_review_expense",
      "poseidon_create_treasury_transfer",
      "poseidon_annul_treasury_transfer",
      "poseidon_create_partner_movement",
      "poseidon_annul_partner_movement",
    ].forEach((rpcName) => {
      expect(runtime).toContain(`function public.${rpcName}(`);
    });
    expect(runtime).toContain("pg_advisory_xact_lock");
    expect(runtime).toContain("private.assert_available_funds");
    expect(runtime).toContain("private.append_command_audit");

    expect(hardening).toContain("function public.poseidon_session_context()");
    expect(hardening).toContain("'schema_version'");
    expect(hardening).toContain("create trigger locals_no_delete");
    expect(hardening).toContain("create trigger machines_no_delete");
  });

  it("expone el flujo critico de caja en RPC transaccionales", async () => {
    const cashRuntime = await readFile(
      path.join(migrationsDir, "20260726000900_transactional_cash_commands.sql"),
      "utf8",
    );

    [
      "poseidon_open_cash",
      "poseidon_save_readings",
      "poseidon_close_cash",
    ].forEach((rpcName) => {
      expect(cashRuntime).toContain(`function public.${rpcName}(`);
    });
    expect(cashRuntime).toContain("private.claim_command");
    expect(cashRuntime).toContain("private.finish_command");
    expect(cashRuntime).toContain("private.append_command_audit");
    expect(cashRuntime).toContain("'schema_version', 3");
  });

  it("expone todos los comandos restantes y negocia el esquema remoto 4", async () => {
    const files = await Promise.all(
      [
        "20260726001000_transactional_cash_movements.sql",
        "20260726001100_transactional_salaries_differences.sql",
        "20260726001200_transactional_master_commands.sql",
        "20260726001300_transactional_periodic_closures.sql",
      ].map((name) => readFile(path.join(migrationsDir, name), "utf8")),
    );
    const sql = files.join("\n");

    [
      "poseidon_create_transfer",
      "poseidon_annul_transfer",
      "poseidon_create_gift",
      "poseidon_annul_gift",
      "poseidon_save_salary_settlement",
      "poseidon_annul_salary_settlement",
      "poseidon_close_salary_period",
      "poseidon_start_salary_correction",
      "poseidon_close_salary_correction",
      "poseidon_cancel_salary_correction",
      "poseidon_manage_difference",
      "poseidon_save_local",
      "poseidon_delete_local",
      "poseidon_save_machine",
      "poseidon_reset_machine_counters",
      "poseidon_move_machine_to_workshop",
      "poseidon_delete_machine",
      "poseidon_assign_machines_to_local",
      "poseidon_create_periodic_closure",
      "poseidon_annul_periodic_closure",
    ].forEach((rpcName) => {
      expect(sql).toContain(`function public.${rpcName}(`);
    });
    expect(files.at(-1)).toContain("'schema_version', 4");
  });

  it("restaura solo los predicados privados requeridos por RLS", async () => {
    const rlsPrivileges = await readFile(
      path.join(migrationsDir, "20260726001400_restore_rls_helper_privileges.sql"),
      "utf8",
    );

    [
      "private.is_active_user()",
      "private.is_admin()",
      "private.is_control_user()",
      "private.can_access_local(uuid)",
      "private.can_access_all_locals(uuid[])",
      "private.can_access_salary_closure(uuid)",
      "private.can_access_audit_event(uuid)",
    ].forEach((signature) => {
      expect(rlsPrivileges).toContain(
        `grant execute on function ${signature} to authenticated`,
      );
    });
    expect(rlsPrivileges).not.toContain("append_account_movement");
    expect(rlsPrivileges).not.toContain("claim_command");
  });

  it("mantiene sincronizados los planes pgTAP y sus aserciones", async () => {
    const tests = await readDirectorySql(testsDir);

    tests.forEach(({ name, content }) => {
      const plan = Number(content.match(/select plan\((\d+)\)/i)?.[1] ?? -1);
      const assertions = [
        ...content.matchAll(
          /^select\s+(?:is|ok|throws_ok|pass|has_trigger)\s*\(/gim,
        ),
      ].length;
      expect({ name, assertions }).toEqual({ name, assertions: plan });
    });
  });
});
