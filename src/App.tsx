import { Suspense, useState } from "react";
import type {
  AppData,
  CapitalMovementPerson,
  Role,
  Screen,
  User,
} from "./types";
import { appendAuditEvent } from "./lib/audit";
import { roleLabels } from "./lib/display";
import {
  localAppDataBackupCodec,
  localAppDataRepository,
} from "./infrastructure/storage/localAppDataRepository";
import type { AppDataBackupCodec, AppDataRepository } from "./application/ports/AppDataRepository";
import {
  POSEIDON_LOCAL_ID,
  createSeedData,
  normalizeData,
} from "./data/appData";
import { CashierWorkspace, Login, Shell, Welcome } from "./features/layout/AppShell";
import { EmptyState } from "./components/EmptyState";
import { NoticeBanner } from "./components/NoticeBanner";
import { StorageRecovery } from "./features/system/StorageRecovery";
import { downloadFile } from "./lib/export";
import { localDate } from "./lib/dates";
import { commandContext } from "./application/command";
import { openCashCommand } from "./application/cash/openCash";
import { saveReadingCommand, type ReadingPatch } from "./application/cash/saveReading";
import { canAccessScreen, screenRequiresOpenCash } from "./navigation/screens";
import { useNotice } from "./hooks/useNotice";
import { useAppDataRepository } from "./hooks/useAppDataRepository";
import { confirmAction } from "./lib/confirmations";
import {
  AdminClients,
  AdminCurrentAccounts,
  AdminExpenseCategories,
  AdminLocals,
  AdminMachines,
  AdminSalarySettlements,
  AdminStaff,
  AdminTrash,
  AdminUsers,
  Audit,
  CapitalMovements,
  CashierClients,
  CashierSalaryPayments,
  CloseCash,
  Counters,
  Differences,
  Expenses,
  Gifts,
  LocalDataMaintenance,
  ManagerExpenses,
  OpenCash,
  Panel,
  Periodic,
  Reports,
  Transfers,
} from "./navigation/lazyScreens";

function ScreenLoader() {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <h2>Cargando</h2>
      <p>Preparando la pantalla.</p>
    </div>
  );
}

type AppProps = {
  repository?: AppDataRepository;
  backupCodec?: AppDataBackupCodec;
};

function App({
  repository = localAppDataRepository,
  backupCodec = localAppDataBackupCodec,
}: AppProps) {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [user, setUser] = useState<User | null>(null);
  const [actingRole, setActingRole] = useState<Role | null>(null);
  const { message, setMessage, clearMessage } = useNotice();
  const { data, setData, storageIssue, storageReady, persistNow, startFresh } = useAppDataRepository(
    repository,
    setMessage,
  );

  if (!storageReady) return <ScreenLoader />;

  const activeLocal = data.locals.find((local) => local.id === POSEIDON_LOCAL_ID) ?? data.locals[0];
  const openBalance = data.balances.find((balance) => balance.localId === activeLocal.id && balance.status === "EN_PROCESO");
  const effectiveRole = user ? actingRole ?? user.role : null;

  const patchData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
  };

  const goToScreen = (nextScreen: Screen, options: { preserveMessage?: boolean } = {}) => {
    if (effectiveRole && !canAccessScreen(nextScreen, effectiveRole)) {
      setMessage("No tenes acceso a esa pantalla con la funcion activa.");
      setScreen("panel");
      return;
    }
    if (screenRequiresOpenCash(nextScreen) && !openBalance) {
      setMessage("Necesita abrir una nueva caja para poder operar.");
      setScreen("panel");
      return;
    }
    if (!options.preserveMessage) clearMessage();
    setScreen(nextScreen);
  };

  const audit = (
    current: AppData,
    action: string,
    entity: string,
    entityId: string,
    previousValue: unknown,
    newValue: unknown,
    reason = "",
  ): AppData => appendAuditEvent(current, { user, actorRole: effectiveRole }, action, entity, entityId, previousValue, newValue, reason);

  const dataSummary = (value: AppData) => ({
    users: value.users.length,
    locals: value.locals.length,
    machines: value.machines.length,
    balances: value.balances.length,
    accountMovements: value.accountMovements.length,
    audit: value.audit.length,
  });

  const resetDemo = () => {
    if (!confirmAction("Reiniciar todos los datos demo? Se reemplazaran las operaciones locales actuales.")) return;
    const fresh = appendAuditEvent(
      createSeedData(),
      { user, actorRole: effectiveRole },
      "Reiniciar datos demo",
      "Sistema",
      "demo",
      dataSummary(data),
      "Dataset demo inicial",
      "Reinicio manual confirmado",
    );
    setData(fresh);
    setMessage("Datos demo reiniciados.");
    setScreen("panel");
  };

  const exportLocalBackup = () => {
    const audited = audit(data, "Exportar respaldo local", "Sistema", "storage", "", dataSummary(data));
    setData(audited);
    downloadFile(`poseidon-respaldo-${localDate()}.json`, backupCodec.serialize(audited), "application/json;charset=utf-8");
    setMessage("Respaldo local exportado.");
  };

  const importLocalBackup = async (raw: string) => {
    const imported = backupCodec.deserialize(raw);
    if (imported.status !== "ready") return imported.status === "corrupt" ? imported.error : "El respaldo esta vacio.";
    try {
      const normalized = normalizeData(imported.data);
      const audited = audit(
        normalized,
        "Importar respaldo local",
        "Sistema",
        "storage",
        dataSummary(data),
        dataSummary(normalized),
        "Importacion manual validada",
      );
      const saveResult = await persistNow(audited);
      if (saveResult.status === "failed") return `El respaldo es valido pero no pudo guardarse: ${saveResult.error}`;
      setData(audited);
      setUser(null);
      setActingRole(null);
      setMessage("Respaldo local importado y validado.");
      setScreen("login");
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "El respaldo no pudo normalizarse.";
    }
  };

  if (storageIssue) {
    return (
      <StorageRecovery
        error={storageIssue.error}
        raw={storageIssue.raw}
        onStartNew={async () => {
          if (!confirmAction("Iniciar datos nuevos? El respaldo actual debe descargarse antes si queres conservarlo.")) return;
          await startFresh();
        }}
      />
    );
  }

  const login = (userId: string) => {
    const nextUser = data.users.find((item) => item.id === userId && item.status === "ACTIVO");

    if (!nextUser) {
      setMessage("Selecciona un usuario activo para ingresar.");
      return;
    }

    setUser(nextUser);
    setActingRole(nextUser.role);
    setMessage("");
    setScreen("panel");
  };

  const openCash = (
    operatingDate: string,
    initialFund: number,
    initialBankFund: number,
    initialNote: string,
    openingCapitalPerson: CapitalMovementPerson,
    firstOpening: boolean,
  ) => {
    patchData((current) => {
      if (!user || !effectiveRole) return current;
      const result = openCashCommand(
        current,
        {
          localId: activeLocal.id,
          operatingDate,
          initialFund,
          initialBankFund,
          initialNote,
          openingCapitalPerson,
          firstOpening,
        },
        commandContext(user, effectiveRole),
      );
      if (!result.ok) {
        setMessage(result.error);
        return current;
      }
      setMessage("Caja abierta correctamente.");
      setScreen("panel");
      return result.data;
    });
  };

  const updateReading = (readingId: string, patch: ReadingPatch) => {
    if (!user || !effectiveRole || !openBalance) return;
    patchData((current) => {
      const result = saveReadingCommand(current, openBalance.id, readingId, patch, commandContext(user, effectiveRole));
      if (!result.ok) {
        setMessage(result.error);
        return current;
      }
      setMessage("Contador guardado.");
      return result.data;
    });
  };

  if (screen === "welcome") {
    return <Welcome onEnter={() => setScreen("login")} />;
  }

  if (screen === "login" || !user) {
    return <Login users={data.users} onBack={() => setScreen("welcome")} onLogin={login} message={message} />;
  }

  if (effectiveRole === "CAJERO") {
    const cashierScreen = screen;
    return (
      <CashierWorkspace
        data={data}
        user={user}
        local={activeLocal}
        openBalance={openBalance}
        screen={cashierScreen}
        setScreen={goToScreen}
        message={message}
        onLogout={() => {
          setUser(null);
          setActingRole(null);
          setMessage("");
          setScreen("login");
        }}
        onSwitchToManager={
          user.role === "ENCARGADO" || user.role === "ADMINISTRADOR"
            ? () => {
                setActingRole(user.role);
                setMessage(`Modo ${roleLabels[user.role].toLowerCase()} activo.`);
                setScreen("panel");
              }
            : undefined
        }
        returnRoleLabel={user.role === "ADMINISTRADOR" ? "administrador" : "encargado"}
      >
        <Suspense fallback={<ScreenLoader />}>
        {(cashierScreen === "open-cash" || cashierScreen === "cashier-summary") && (
          <OpenCash
            data={data}
            user={user}
            local={activeLocal}
            openBalance={openBalance}
            setScreen={goToScreen}
            save={openCash}
            summaryOnly={cashierScreen === "cashier-summary" || Boolean(openBalance)}
          />
        )}
        {cashierScreen === "counters" && openBalance && (
          <Counters
            data={data}
            user={user}
            balance={openBalance}
            onBack={() => goToScreen("panel")}
            updateReading={updateReading}
          />
        )}
        {cashierScreen === "expenses" && openBalance && (
          <Expenses data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "transfers" && openBalance && (
          <Transfers data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "gifts" && openBalance && (
          <Gifts data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "salary-payments" && openBalance && (
          <CashierSalaryPayments data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "capital-movements" && openBalance && (
          <CapitalMovements data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "cashier-clients" && (
          <CashierClients data={data} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "close-cash" && openBalance && (
          <CloseCash
            data={data}
            balance={openBalance}
            user={user}
            actorRole={effectiveRole ?? user.role}
            patchData={patchData}
            setMessage={setMessage}
            setScreen={(nextScreen) => goToScreen(nextScreen, { preserveMessage: true })}
            afterCloseScreen="cashier-summary"
          />
        )}
        </Suspense>
      </CashierWorkspace>
    );
  }

  return (
    <Shell
      user={user}
      currentRole={effectiveRole ?? user.role}
      local={activeLocal}
      screen={screen}
      setScreen={goToScreen}
      onSwitchToCashier={
        user.role === "ENCARGADO" || user.role === "ADMINISTRADOR"
          ? () => {
              setActingRole("CAJERO");
              setMessage(`Modo cajero activo. Estas operando con el usuario real de ${user.name}.`);
              setScreen("panel");
            }
          : undefined
      }
      onLogout={() => {
        setUser(null);
        setActingRole(null);
        setScreen("login");
      }}
    >
      <NoticeBanner message={message} />
      <Suspense fallback={<ScreenLoader />}>
      {screen === "panel" && (
        <Panel
          data={data}
          user={user}
          local={activeLocal}
          openBalance={openBalance}
          effectiveRole={effectiveRole ?? user.role}
          modeStatus="Prueba local"
          setScreen={goToScreen}
          resetDemo={resetDemo}
        />
      )}
      {screen === "open-cash" && (
        <OpenCash
          data={data}
          user={user}
          local={activeLocal}
          openBalance={openBalance}
          setScreen={goToScreen}
          save={openCash}
        />
      )}
      {screen === "cashier-summary" && (
        <OpenCash
          data={data}
          user={user}
          local={activeLocal}
          openBalance={openBalance}
          setScreen={goToScreen}
          save={openCash}
          summaryOnly
        />
      )}
      {screen === "counters" && openBalance && (
        <Counters
          data={data}
          user={user}
          balance={openBalance}
          updateReading={updateReading}
        />
      )}
      {screen === "expenses" && openBalance && (
        <Expenses data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} />
      )}
      {screen === "transfers" && openBalance && (
        <Transfers data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} />
      )}
      {screen === "gifts" && openBalance && (
        <Gifts data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} />
      )}
      {screen === "capital-movements" && openBalance && (
        <CapitalMovements data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} />
      )}
      {screen === "close-cash" && openBalance && (
        <CloseCash
          data={data}
          balance={openBalance}
          user={user}
          actorRole={effectiveRole ?? user.role}
          patchData={patchData}
          setMessage={setMessage}
          setScreen={goToScreen}
        />
      )}
      {screen === "reports" && <Reports data={data} user={user} />}
      {screen === "manager-expenses" && <ManagerExpenses data={data} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />}
      {screen === "admin-users" && <AdminUsers data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-staff" && <AdminStaff data={data} user={user} patchData={patchData} audit={audit} />}
      {screen === "admin-salary-settlements" && <AdminSalarySettlements data={data} user={user} patchData={patchData} audit={audit} />}
      {screen === "admin-current-accounts" && <AdminCurrentAccounts data={data} user={user} effectiveRole={effectiveRole ?? user.role} local={activeLocal} />}
      {screen === "admin-clients" && <AdminClients data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-trash" && <AdminTrash data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-expense-categories" && <AdminExpenseCategories data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-local-data" && <LocalDataMaintenance onExport={exportLocalBackup} onImport={importLocalBackup} />}
      {screen === "admin-machines" && (
        <AdminMachines
          data={data}
          user={user}
          patchData={patchData}
          setMessage={setMessage}
        />
      )}
      {screen === "workshop" && (
        <AdminMachines
          data={data}
          user={user}
          patchData={patchData}
          setMessage={setMessage}
          onlyWorkshop
        />
      )}
      {screen === "admin-locals" && (
        <AdminLocals
          data={data}
          user={user}
          patchData={patchData}
          setMessage={setMessage}
        />
      )}
      {screen === "differences" && <Differences data={data} user={user} patchData={patchData} setMessage={setMessage} />}
      {screen === "audit" && <Audit data={data} user={user} />}
      {screen === "periodic" && <Periodic data={data} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />}
      {!openBalance && ["counters", "expenses", "transfers", "gifts", "capital-movements", "close-cash"].includes(screen) && (
        <EmptyState title="No hay caja abierta" text="Abri una nueva caja o trabaja sobre una caja en proceso." action={() => goToScreen("open-cash")} />
      )}
      </Suspense>
    </Shell>
  );
}

export default App;





