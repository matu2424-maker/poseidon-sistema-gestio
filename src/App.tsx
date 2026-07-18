import { Suspense, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useNavigationType } from "react-router";
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
} from "./data/appData";
import { hydrateAppData } from "./data/migrateData";
import { CashierWorkspace, Login, Shell, Welcome } from "./features/layout/AppShell";
import { EmptyState } from "./components/EmptyState";
import { NoticeBanner } from "./components/NoticeBanner";
import { StorageRecovery } from "./features/system/StorageRecovery";
import { downloadFile } from "./lib/export";
import { localDate } from "./lib/dates";
import { commandContext } from "./application/command";
import { openCashCommand } from "./application/cash/openCash";
import { saveReadingCommand, type ReadingPatch } from "./application/cash/saveReading";
import { loadDemoDataCommand } from "./application/system/loadDemoData";
import { resetOperationalDataCommand } from "./application/system/resetOperationalData";
import { canAccessScreen, pathForScreen, screenForPath, screenRequiresOpenCash } from "./navigation/screens";
import { useNotice } from "./hooks/useNotice";
import { useAppDataRepository } from "./hooks/useAppDataRepository";
import { confirmAction } from "./lib/confirmations";
import {
  allowedActingRole,
  clearLocalSession,
  readLocalSession,
  writeLocalSession,
} from "./infrastructure/session/localSession";
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
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const screen = screenForPath(location.pathname);
  const [user, setUser] = useState<User | null>(null);
  const [actingRole, setActingRole] = useState<Role | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  const { message, setMessage, clearMessage } = useNotice();
  const { data, setData, storageIssue, storageReady, persistNow, reloadStored, retryPendingSave, startFresh } = useAppDataRepository(
    repository,
    setMessage,
  );

  const activeLocal = data.locals.find((local) => local.id === POSEIDON_LOCAL_ID) ?? data.locals[0];
  const openBalance = data.balances.find((balance) => balance.localId === activeLocal.id && balance.status === "EN_PROCESO");
  const previousOpenBalanceRef = useRef(openBalance);
  const effectiveRole = user ? actingRole ?? user.role : null;
  const isPublicScreen = screen === "welcome" || screen === "login";
  const accessDenied = Boolean(user && effectiveRole && screen && !isPublicScreen && !canAccessScreen(screen, effectiveRole));

  useEffect(() => {
    if (!storageReady || sessionRestored) return;
    const restored = readLocalSession();
    if (restored) {
      const restoredUser = data.users.find((item) => item.id === restored.userId && item.status === "ACTIVO");
      if (restoredUser) {
        setUser(restoredUser);
        setActingRole(allowedActingRole(restoredUser.role, restored.actingRole));
      } else {
        clearLocalSession();
      }
    }
    setSessionRestored(true);
  }, [data.users, sessionRestored, storageReady]);

  useEffect(() => {
    if (navigationType === "POP") clearMessage();
  }, [clearMessage, location.key, navigationType]);

  useEffect(() => {
    const justClosedCash = screen === "close-cash" && Boolean(previousOpenBalanceRef.current) && !openBalance;
    previousOpenBalanceRef.current = openBalance;
    if (!storageReady || !sessionRestored || !screen || !user || !effectiveRole || isPublicScreen) return;
    if (justClosedCash) return;
    if (!canAccessScreen(screen, effectiveRole)) {
      setMessage("No tenes acceso a esa pantalla con la funcion activa.");
      navigate(pathForScreen("panel"), { replace: true });
      return;
    }
    if (screenRequiresOpenCash(screen) && !openBalance) {
      setMessage("Necesita abrir una nueva caja para poder operar.");
      navigate(pathForScreen("panel"), { replace: true });
    }
  }, [effectiveRole, isPublicScreen, navigate, openBalance, screen, sessionRestored, setMessage, storageReady, user]);

  if (!storageReady || !sessionRestored) return <ScreenLoader />;
  if (!screen) return <Navigate to={pathForScreen("welcome")} replace />;
  if (accessDenied) return <ScreenLoader />;

  const patchData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
  };

  const goToScreen = (nextScreen: Screen, options: { preserveMessage?: boolean } = {}) => {
    if (effectiveRole && !canAccessScreen(nextScreen, effectiveRole)) {
      setMessage("No tenes acceso a esa pantalla con la funcion activa.");
      navigate(pathForScreen("panel"));
      return;
    }
    if (screenRequiresOpenCash(nextScreen) && !openBalance) {
      setMessage("Necesita abrir una nueva caja para poder operar.");
      navigate(pathForScreen("panel"));
      return;
    }
    if (!options.preserveMessage) clearMessage();
    navigate(pathForScreen(nextScreen));
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

  const resetOperationalData = () => {
    if (!user || !effectiveRole) return;
    if (
      !confirmAction(
        "Crear una base operativa limpia? Se descargara un respaldo y luego se eliminaran cajas, movimientos, cierres, auditoria operativa y saldos de este navegador.",
      )
    ) {
      return;
    }
    downloadFile(
      `poseidon-respaldo-antes-reinicio-${localDate()}.json`,
      backupCodec.serialize(data),
      "application/json;charset=utf-8",
    );
    const result = resetOperationalDataCommand(data, commandContext(user, effectiveRole));
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setData(result.data);
    setMessage("Base operativa limpia creada. Las cuentas, contadores y operaciones quedaron en cero.");
  };

  const loadDemoData = async () => {
    if (!user || !effectiveRole) return;
    if (
      !confirmAction(
        "Cargar el escenario integral de pruebas? Se descargara un respaldo y luego se reemplazaran todos los datos actuales de este navegador sin mezclarlos.",
      )
    ) {
      return;
    }
    downloadFile(
      `poseidon-respaldo-antes-demo-${localDate()}.json`,
      backupCodec.serialize(data),
      "application/json;charset=utf-8",
    );
    const result = loadDemoDataCommand(data, commandContext(user, effectiveRole));
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    const saveResult = await persistNow(result.data);
    if (saveResult.status !== "ok") {
      setMessage(`Los datos demo son validos pero no pudieron guardarse: ${saveResult.error}`);
      return;
    }
    setData(result.data);
    setUser(null);
    setActingRole(null);
    clearLocalSession();
    setMessage("Escenario de pruebas cargado. Ingresa nuevamente con el usuario que quieras probar.");
    navigate(pathForScreen("login"), { replace: true });
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
      const normalized = hydrateAppData(imported.data, imported.sourceVersion);
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
      if (saveResult.status !== "ok") return `El respaldo es valido pero no pudo guardarse: ${saveResult.error}`;
      setData(audited);
      setUser(null);
      setActingRole(null);
      clearLocalSession();
      setMessage("Respaldo local importado y validado.");
      navigate(pathForScreen("login"), { replace: true });
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "El respaldo no pudo normalizarse.";
    }
  };

  if (storageIssue) {
    return (
      <StorageRecovery
        kind={storageIssue.kind}
        error={storageIssue.error}
        raw={storageIssue.raw}
        onRetrySave={async () => {
          await retryPendingSave();
        }}
        onReloadStored={async () => {
          if (!confirmAction("Usar la version guardada? Descarga antes el respaldo pendiente si queres conservar esos cambios.")) return;
          await reloadStored();
        }}
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

    const nextRole = nextUser.role;
    setUser(nextUser);
    setActingRole(nextRole);
    writeLocalSession({ userId: nextUser.id, actingRole: nextRole });

    if (screen === "welcome" || screen === "login") {
      setMessage("");
      navigate(pathForScreen("panel"), { replace: true });
      return;
    }
    if (!canAccessScreen(screen, nextRole)) {
      setMessage("No tenes acceso a la ruta solicitada con ese usuario.");
      navigate(pathForScreen("panel"), { replace: true });
      return;
    }
    if (screenRequiresOpenCash(screen) && !openBalance) {
      setMessage("Necesita abrir una nueva caja para poder operar.");
      navigate(pathForScreen("panel"), { replace: true });
      return;
    }
    setMessage("");
  };

  const openCash = (
    operatingDate: string,
    initialFund: number,
    initialBankFund: number,
    initialNote: string,
    openingCapitalPerson: CapitalMovementPerson,
    firstOpening: boolean,
  ) => {
    if (!user || !effectiveRole) return;
    const result = openCashCommand(
      data,
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
      return;
    }
    setData(result.data);
    setMessage("Caja abierta correctamente.");
    navigate(pathForScreen("panel"));
  };

  const updateReading = (readingId: string, patch: ReadingPatch) => {
    if (!user || !effectiveRole || !openBalance) return;
    const result = saveReadingCommand(data, openBalance.id, readingId, patch, commandContext(user, effectiveRole));
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setData(result.data);
    setMessage("Contador guardado.");
  };

  if (screen === "welcome") {
    return <Welcome onEnter={() => navigate(pathForScreen("login"))} />;
  }

  if (screen === "login" || !user) {
    return <Login users={data.users} onBack={() => navigate(pathForScreen("welcome"))} onLogin={login} message={message} />;
  }

  const logout = () => {
    clearLocalSession();
    setUser(null);
    setActingRole(null);
    setMessage("");
    navigate(pathForScreen("login"), { replace: true });
  };

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
        onLogout={logout}
        onSwitchToManager={
          user.role === "ENCARGADO" || user.role === "ADMINISTRADOR"
            ? () => {
                setActingRole(user.role);
                writeLocalSession({ userId: user.id, actingRole: user.role });
                setMessage(`Modo ${roleLabels[user.role].toLowerCase()} activo.`);
                navigate(pathForScreen("panel"));
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
          <Expenses data={data} balance={openBalance} user={user} actorRole={effectiveRole ?? user.role} patchData={patchData} setMessage={setMessage} onBack={() => goToScreen("panel")} />
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
          <CapitalMovements data={data} balance={openBalance} user={user} actorRole={effectiveRole ?? user.role} patchData={patchData} setMessage={setMessage} onBack={() => goToScreen("panel")} />
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
              writeLocalSession({ userId: user.id, actingRole: "CAJERO" });
              setMessage(`Modo cajero activo. Estas operando con el usuario real de ${user.name}.`);
              navigate(pathForScreen("panel"));
            }
          : undefined
      }
      onLogout={logout}
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
          hideHeading
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
        <Expenses data={data} balance={openBalance} user={user} actorRole={effectiveRole ?? user.role} patchData={patchData} setMessage={setMessage} />
      )}
      {screen === "transfers" && openBalance && (
        <Transfers data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} />
      )}
      {screen === "gifts" && openBalance && (
        <Gifts data={data} balance={openBalance} user={user} patchData={patchData} setMessage={setMessage} />
      )}
      {screen === "capital-movements" && openBalance && (
        <CapitalMovements data={data} balance={openBalance} user={user} actorRole={effectiveRole ?? user.role} patchData={patchData} setMessage={setMessage} />
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
      {screen === "admin-salary-settlements" && <AdminSalarySettlements data={data} user={user} patchData={patchData} />}
      {screen === "admin-current-accounts" && (
        <AdminCurrentAccounts
          data={data}
          user={user}
          effectiveRole={effectiveRole ?? user.role}
          local={activeLocal}
          patchData={patchData}
          setMessage={setMessage}
        />
      )}
      {screen === "admin-clients" && <AdminClients data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-trash" && <AdminTrash data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-expense-categories" && <AdminExpenseCategories data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-local-data" && (
        <LocalDataMaintenance
          onExport={exportLocalBackup}
          onImport={importLocalBackup}
          onLoadDemo={loadDemoData}
          onReset={resetOperationalData}
        />
      )}
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





