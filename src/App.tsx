import { useEffect, useState } from "react";
import type {
  AppData,
  Balance,
  CapitalMovement,
  CapitalMovementMedium,
  CapitalMovementPerson,
  CapitalMovementTiming,
  CapitalMovementType,
  MovementStatus,
  Reading,
  Role,
  Screen,
  User,
} from "./types";
import { ensureLocalCurrentAccounts } from "./lib/currentAccounts";
import {
  capitalAccountMovement,
  syncMachineResultAccountMovement,
  upsertAccountMovement,
} from "./lib/accountMovements";
import { appendAuditEvent } from "./lib/audit";
import { calcReading } from "./lib/cashTotals";
import { nowIso } from "./lib/dates";
import { roleLabels } from "./lib/display";
import { uid } from "./lib/ids";
import {
  clearLocalAppData,
  importLocalAppData,
  loadLocalAppData,
  saveLocalAppData,
  serializeAppData,
} from "./infrastructure/storage/localAppDataRepository";
import {
  POSEIDON_LOCAL_ID,
  createSeedData,
  nextBalanceVisibleId,
  normalizeData,
} from "./data/appData";
import { CloseCash } from "./features/cashier/CloseCash";
import { Counters } from "./features/cashier/Counters";
import { OpenCash } from "./features/cashier/OpenCash";
import { CapitalMovements, CashierClients, CashierSalaryPayments, Expenses, Gifts, Transfers } from "./features/cashier/Movements";
import { AdminCurrentAccounts } from "./features/accounts/CurrentAccounts";
import { Panel } from "./features/dashboard/RoleDashboard";
import { Differences } from "./features/manager/Differences";
import { ManagerExpenses } from "./features/manager/Expenses";
import { AdminSalarySettlements } from "./features/salaries/SalarySettlements";
import { AdminClients } from "./features/admin/Clients";
import { AdminLocals, AdminMachines } from "./features/admin/LocationsMachines";
import { AdminStaff, AdminTrash } from "./features/admin/Staff";
import { AdminExpenseCategories, AdminUsers } from "./features/admin/Settings";
import { Audit } from "./features/audit/Audit";
import { CashierWorkspace, EmptyState, Login, Shell, Welcome } from "./features/layout/AppShell";
import { Periodic } from "./features/reports/Periodic";
import { Reports } from "./features/reports/Reports";
import { StorageRecovery } from "./features/system/StorageRecovery";
import { LocalDataMaintenance } from "./features/system/LocalDataMaintenance";
import { downloadFile } from "./lib/export";
import { localDate } from "./lib/dates";

type InitialLoad = {
  data: AppData;
  storageIssue?: { raw: string; error: string };
  message?: string;
};

function readData(): InitialLoad {
  const stored = loadLocalAppData();
  if (stored.status === "empty") return { data: createSeedData() };
  if (stored.status === "corrupt") {
    return { data: createSeedData(), storageIssue: { raw: stored.raw, error: stored.error } };
  }
  try {
    return {
      data: normalizeData(stored.data),
      message: stored.needsRewrite ? "Los datos locales se actualizaron al formato versionado." : undefined,
    };
  } catch (error) {
    return {
      data: createSeedData(),
      storageIssue: {
        raw: stored.raw,
        error: error instanceof Error ? error.message : "No se pudo normalizar el almacenamiento local.",
      },
    };
  }
}

function App() {
  const [initialLoad] = useState<InitialLoad>(() => readData());
  const [data, setData] = useState<AppData>(initialLoad.data);
  const [storageIssue, setStorageIssue] = useState(initialLoad.storageIssue);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [user, setUser] = useState<User | null>(null);
  const [actingRole, setActingRole] = useState<Role | null>(null);
  const [message, setMessage] = useState(initialLoad.message ?? "");

  useEffect(() => {
    if (storageIssue) return;
    const saveResult = saveLocalAppData(data);
    if (saveResult.status === "failed") {
      setMessage("No se pudo guardar localmente. Exporta un respaldo antes de continuar cargando datos.");
    }
  }, [data, storageIssue]);

  const activeLocal = data.locals.find((local) => local.id === POSEIDON_LOCAL_ID) ?? data.locals[0];
  const openBalance = data.balances.find((balance) => balance.localId === activeLocal.id && balance.status === "EN_PROCESO");
  const effectiveRole = user ? actingRole ?? user.role : null;

  const patchData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
  };

  const goToScreen = (nextScreen: Screen) => {
    setMessage("");
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
    if (!window.confirm("Reiniciar todos los datos demo? Se reemplazaran las operaciones locales actuales.")) return;
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
    saveLocalAppData(fresh);
    setMessage("Datos demo reiniciados.");
    setScreen("panel");
  };

  const exportLocalBackup = () => {
    const audited = audit(data, "Exportar respaldo local", "Sistema", "storage", "", dataSummary(data));
    setData(audited);
    downloadFile(`poseidon-respaldo-${localDate()}.json`, serializeAppData(audited), "application/json;charset=utf-8");
    setMessage("Respaldo local exportado.");
  };

  const importLocalBackup = (raw: string) => {
    const imported = importLocalAppData(raw);
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
      const saveResult = saveLocalAppData(audited);
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
        onStartNew={() => {
          if (!window.confirm("Iniciar datos nuevos? El respaldo actual debe descargarse antes si queres conservarlo.")) return;
          clearLocalAppData();
          const fresh = createSeedData();
          setData(fresh);
          setStorageIssue(undefined);
          setMessage("Se inicio un almacenamiento local nuevo.");
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
      const duplicate = current.balances.find(
        (balance) =>
          balance.localId === activeLocal.id &&
          balance.operatingDate === operatingDate &&
          balance.status === "EN_PROCESO",
      );
      if (duplicate) {
        setMessage("Ya existe una caja abierta para ese local y fecha.");
        return current;
      }

      const balance: Balance = {
        id: uid("balance"),
        visibleId: nextBalanceVisibleId(current, activeLocal.id),
        localId: activeLocal.id,
        operatingDate,
        status: "EN_PROCESO",
        initialFund,
        initialBankFund,
        initialNote,
        openedBy: user?.id ?? "system",
        openedByRole: effectiveRole ?? user?.role,
        openedAt: nowIso(),
      };
      const openingCapitalMovements: CapitalMovement[] = firstOpening
        ? [
            initialFund > 0
              ? {
                  id: uid("capital-opening-cash"),
                  balanceId: balance.id,
                  localId: activeLocal.id,
                  type: "APORTE" as CapitalMovementType,
                  medium: "EFECTIVO" as CapitalMovementMedium,
                  timing: "APERTURA" as CapitalMovementTiming,
                  person: openingCapitalPerson,
                  amount: initialFund,
                  note: `Aporte inicial caja ${balance.visibleId}`,
                  status: "ACTIVO" as MovementStatus,
                  userId: user?.id ?? "system",
                  createdAt: nowIso(),
                }
              : null,
            initialBankFund > 0
              ? {
                  id: uid("capital-opening-bank"),
                  balanceId: balance.id,
                  localId: activeLocal.id,
                  type: "APORTE" as CapitalMovementType,
                  medium: "TRANSFERENCIA" as CapitalMovementMedium,
                  timing: "APERTURA" as CapitalMovementTiming,
                  person: openingCapitalPerson,
                  amount: initialBankFund,
                  note: `Aporte inicial banco caja ${balance.visibleId}`,
                  status: "ACTIVO" as MovementStatus,
                  userId: user?.id ?? "system",
                  createdAt: nowIso(),
                }
              : null,
          ].filter((movement): movement is CapitalMovement => Boolean(movement))
        : [];
      const accountMovements = openingCapitalMovements.reduce(
        (movements, movement) => upsertAccountMovement(movements, capitalAccountMovement(movement)),
        current.accountMovements,
      );
      const readings: Reading[] = current.machines
        .filter((machine) => machine.localId === activeLocal.id && machine.status !== "INACTIVA" && machine.status !== "DESUSO")
        .map((machine) => ({
          id: uid("reading"),
          balanceId: balance.id,
          machineId: machine.id,
          inPrevious: machine.lastIn,
          inActual: machine.lastIn,
          outPrevious: machine.lastOut,
          outActual: machine.lastOut,
          result: 0,
          status: machine.status === "ACTIVA" ? "PENDIENTE" : "FUERA_DE_SERVICIO",
          observation: machine.status === "ACTIVA" ? "" : "Maquina en mantenimiento",
          updatedBy: user?.id ?? "system",
          updatedAt: nowIso(),
        }));
      setMessage("Caja abierta correctamente.");
      setScreen("panel");
      return audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, activeLocal.id),
          accountMovements,
          capitalMovements: [...openingCapitalMovements, ...current.capitalMovements],
          balances: [balance, ...current.balances],
          readings: [...readings, ...current.readings],
        },
        "Abrir caja",
        "BalanceDiario",
        balance.id,
        "",
        { balance, openingCapitalMovements },
      );
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
            updateReading={(readingId, patch) => {
              patchData((current) => {
                const previous = current.readings.find((reading) => reading.id === readingId);
                if (!previous) return current;
                if (patch.inActual !== undefined && patch.inActual !== null && patch.inActual < previous.inPrevious) {
                  setMessage("El IN actual debe ser igual o mayor al IN anterior.");
                  return current;
                }
                if (patch.outActual !== undefined && patch.outActual !== null && patch.outActual < previous.outPrevious) {
                  setMessage("El OUT actual debe ser igual o mayor al OUT anterior.");
                  return current;
                }
                const readings = current.readings.map((reading) => {
                  if (reading.id !== readingId) return reading;
                  const next = { ...reading, ...patch, updatedBy: user.id, updatedAt: nowIso() };
                  return { ...next, result: calcReading(next) };
                });
                const next = readings.find((reading) => reading.id === readingId);
                const synced = syncMachineResultAccountMovement({ ...current, readings }, openBalance.id, user.id);
                return audit(synced, "Guardar contador", "Recaudacion", readingId, previous, next);
              });
            }}
          />
        )}
        {cashierScreen === "expenses" && openBalance && (
          <Expenses data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "transfers" && openBalance && (
          <Transfers data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "gifts" && openBalance && (
          <Gifts data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "salary-payments" && openBalance && (
          <CashierSalaryPayments data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "capital-movements" && openBalance && (
          <CapitalMovements data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
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
            audit={audit}
            setMessage={setMessage}
            setScreen={setScreen}
            afterCloseScreen="cashier-summary"
          />
        )}
      </CashierWorkspace>
    );
  }

  return (
    <Shell
      user={user}
      currentRole={effectiveRole ?? user.role}
      local={activeLocal}
      screen={screen}
      setScreen={setScreen}
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
      {message && <div className="notice">{message}</div>}
      {screen === "panel" && (
        <Panel
          data={data}
          user={user}
          local={activeLocal}
          openBalance={openBalance}
          effectiveRole={effectiveRole ?? user.role}
          modeStatus="Prueba local"
          setScreen={setScreen}
          resetDemo={resetDemo}
        />
      )}
      {screen === "open-cash" && (
        <OpenCash
          data={data}
          user={user}
          local={activeLocal}
          openBalance={openBalance}
          setScreen={setScreen}
          save={openCash}
        />
      )}
      {screen === "counters" && openBalance && (
        <Counters
          data={data}
          user={user}
          balance={openBalance}
          updateReading={(readingId, patch) => {
            patchData((current) => {
              const previous = current.readings.find((reading) => reading.id === readingId);
              if (!previous) return current;
              if (patch.inActual !== undefined && patch.inActual !== null && patch.inActual < previous.inPrevious) {
                setMessage("El IN actual debe ser igual o mayor al IN anterior.");
                return current;
              }
              if (patch.outActual !== undefined && patch.outActual !== null && patch.outActual < previous.outPrevious) {
                setMessage("El OUT actual debe ser igual o mayor al OUT anterior.");
                return current;
              }
              const readings = current.readings.map((reading) => {
                if (reading.id !== readingId) return reading;
                const next = { ...reading, ...patch, updatedBy: user.id, updatedAt: nowIso() };
                return { ...next, result: calcReading(next) };
              });
              const next = readings.find((reading) => reading.id === readingId);
              const synced = syncMachineResultAccountMovement({ ...current, readings }, openBalance.id, user.id);
                return audit(synced, "Guardar contador", "Recaudacion", readingId, previous, next);
            });
          }}
        />
      )}
      {screen === "expenses" && openBalance && (
        <Expenses data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />
      )}
      {screen === "transfers" && openBalance && (
        <Transfers data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />
      )}
      {screen === "gifts" && openBalance && (
        <Gifts data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />
      )}
      {screen === "capital-movements" && openBalance && (
        <CapitalMovements data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />
      )}
      {screen === "close-cash" && openBalance && (
        <CloseCash
          data={data}
          balance={openBalance}
          user={user}
          actorRole={effectiveRole ?? user.role}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          setScreen={setScreen}
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
          audit={audit}
          setMessage={setMessage}
        />
      )}
      {screen === "workshop" && (
        <AdminMachines
          data={data}
          user={user}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onlyWorkshop
        />
      )}
      {screen === "admin-locals" && (
        <AdminLocals
          data={data}
          user={user}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
        />
      )}
      {screen === "differences" && <Differences data={data} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />}
      {screen === "audit" && <Audit data={data} />}
      {screen === "periodic" && <Periodic data={data} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />}
      {!openBalance && ["counters", "expenses", "transfers", "gifts", "capital-movements", "close-cash"].includes(screen) && (
        <EmptyState title="No hay caja abierta" text="Abri una nueva caja o trabaja sobre una caja en proceso." action={() => setScreen("open-cash")} />
      )}
    </Shell>
  );
}

export default App;





