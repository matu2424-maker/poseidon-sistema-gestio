import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { AppData, Balance, Local, MenuGroup, MenuItem, Role, Screen, User } from "../../types";
import { localAccountBalances } from "../../lib/currentAccounts";
import { totalsForBalance } from "../../lib/cashTotals";
import { balanceVisibleId, roleLabels } from "../../lib/display";
import { money } from "../../lib/money";
import { Modal } from "../../components/ui";

export function Welcome({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="start-screen">
      <div className="shape shape-a" />
      <div className="shape shape-b" />
      <section className="start-content">
        <h1>POSEIDON</h1>
        <h2>Sistema de Gestion</h2>
        <p>Gestion de caja, maquinas y recaudaciones</p>
        <button className="button primary wide" type="button" onClick={onEnter}>
          Ingresar
        </button>
      </section>
      <span className="version">v1.0 - Documento funcional definitivo</span>
    </main>
  );
}

export function Login({ users, onBack, onLogin, message }: { users: User[]; onBack: () => void; onLogin: (userId: string) => void; message: string }) {
  const activeUsers = users.filter((item) => item.status === "ACTIVO");
  const defaultUserId = activeUsers.find((item) => item.username === "cajero1")?.id ?? activeUsers[0]?.id ?? "";
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId);

  useEffect(() => {
    const activeIds = activeUsers.map((item) => item.id);
    if (!activeIds.includes(selectedUserId)) {
      setSelectedUserId(defaultUserId);
    }
  }, [activeUsers, defaultUserId, selectedUserId]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin(selectedUserId);
  };

  return (
    <main className="login-screen">
      <header className="login-top">POSEIDON</header>
      <section className="login-card">
        <h1>Ingreso al sistema</h1>
        <form onSubmit={submit} className="form-stack">
          <label>
            Entrar como
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} autoFocus>
              {activeUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {roleLabels[item.role]} ({item.username})
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button className="button primary" type="submit" disabled={!activeUsers.length}>
              Ingresar
            </button>
            <button className="button muted" type="button" onClick={onBack}>
              Volver
            </button>
          </div>
        </form>
        <p className={message ? "validation error" : "validation"}>
          {message || "Modo local de prueba: selecciona un usuario activo, sin contrasena."}
        </p>
      </section>
    </main>
  );
}

export function Shell({
  user,
  currentRole,
  local,
  screen,
  setScreen,
  onSwitchToCashier,
  onLogout,
  children,
}: {
  user: User;
  currentRole: Role;
  local: Local;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  onSwitchToCashier?: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const groups = menuGroupsForRole(currentRole);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isActive = (item: MenuItem) =>
    screen === item.screen ||
    (screen === "admin-local-edit" && item.screen === "admin-locals") ||
    (screen === "admin-machine-edit" && item.screen === "admin-machines");
  const groupHasActiveItem = (group: MenuGroup) => group.items.some(isActive);

  useEffect(() => {
    const activeGroup = groups.find(groupHasActiveItem);
    if (!activeGroup) return;
    setOpenGroups((current) => (current[activeGroup.title] ? current : { ...current, [activeGroup.title]: true }));
  }, [screen, currentRole]);

  return (
    <div className="app-shell">
      <aside className="side">
        <div className="side-brand">
          <strong>POSEIDON</strong>
          <span>Sistema de Gestion</span>
        </div>
        <nav className="side-nav">
          {groups.map((group) => (
            <details
              className="side-group"
              key={group.title}
              open={openGroups[group.title] ?? (groupHasActiveItem(group) || group.title === "Inicio")}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenGroups((current) => ({ ...current, [group.title]: isOpen }));
              }}
            >
              <summary className="side-group-title">{group.title}</summary>
              <div>
                {group.items.map((item) => (
                  <button key={`${group.title}-${item.screen}`} className={isActive(item) ? "side-link active" : "side-link"} onClick={() => setScreen(item.screen)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </nav>
        <button className="side-link logout" onClick={onLogout}>
          Salir
        </button>
      </aside>
      <section className="main">
        <header className="top">
          <h1>{titleForScreen(screen, currentRole)}</h1>
          <div className="top-meta">
            <div className="top-meta-items">
              <span>
                <small>Local</small>
                <strong>{local.name}</strong>
              </span>
              <span>
                <small>Usuario</small>
                <strong>{user.name}</strong>
              </span>
              <span>
                <small>Funcion</small>
                <strong>{roleLabels[currentRole]}</strong>
              </span>
            </div>
            {onSwitchToCashier && currentRole !== "CAJERO" && (
              <div className="top-meta-actions">
                <button className="button primary compact" type="button" onClick={onSwitchToCashier}>
                  Trabajar como cajero
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="content">{children}</main>
      </section>
    </div>
  );
}

export function CashierWorkspace({
  data,
  user,
  local,
  openBalance,
  screen,
  setScreen,
  message,
  onLogout,
  onSwitchToManager,
  returnRoleLabel = "encargado",
  children,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  message: string;
  onLogout: () => void;
  onSwitchToManager?: () => void;
  returnRoleLabel?: string;
  children: ReactNode;
}) {
  const totals = openBalance ? totalsForBalance(data, openBalance.id) : null;
  const pendingReadings = openBalance ? data.readings.filter((reading) => reading.balanceId === openBalance.id && reading.status === "PENDIENTE").length : 0;
  const balanceReadings = openBalance ? data.readings.filter((reading) => reading.balanceId === openBalance.id) : [];
  const cashierMachines = balanceReadings.length;
  const completedReadings = balanceReadings.filter((reading) => reading.status === "CARGADA").length;
  const localBalances = localAccountBalances(data, local.id);
  const machineResultTone = (totals?.resultMachines ?? 0) >= 0 ? "positive" : "negative";
  const totalOutflows = (totals?.totalExpenses ?? 0) + (totals?.totalSalaries ?? 0) + (totals?.giftCash ?? 0);
  const windowScreens: Screen[] = ["close-cash"];
  const inlineScreens: Screen[] = ["open-cash", "cashier-summary", "counters", "expenses", "transfers", "gifts", "salary-payments", "capital-movements", "cashier-clients"];
  const noBalanceScreens: Screen[] = ["open-cash", "cashier-summary", "cashier-clients"];
  const showWindow = openBalance && windowScreens.includes(screen);
  const showInline = openBalance ? inlineScreens.includes(screen) : noBalanceScreens.includes(screen);

  return (
    <div className="cashier-shell">
      <header className="cashier-top">
        <div>
          <strong>POSEIDON</strong>
          <span>Sistema de Gestion</span>
        </div>
        <div className="cashier-user">
          <span>Local: {local.name}</span>
          <span>Usuario: {user.name}</span>
        </div>
        <button className="button muted compact" onClick={onLogout}>
          Salir
        </button>
        {onSwitchToManager && (
          <button className="button primary compact" type="button" onClick={onSwitchToManager}>
            Modo {returnRoleLabel}
          </button>
        )}
      </header>
      <main className="cashier-content">
        {message && <div className="notice cashier-notice">{message}</div>}
        <section className="cashier-panel">
          <div className="cashier-heading">
            <div>
              <h1>Panel del cajero</h1>
              <p>
                {openBalance
                  ? `Fecha: ${openBalance.operatingDate} - Caja: ${balanceVisibleId(data, openBalance)} ABIERTA`
                  : "No hay caja abierta. Para continuar tenes que abrir una caja diaria."}
              </p>
            </div>
            {openBalance && (
              <div className="cashier-heading-balances">
                <span>
                  <small>Efectivo inicial</small>
                  <strong>{money(openBalance.initialFund)}</strong>
                </span>
                <span>
                  <small>Banco inicial</small>
                  <strong>{money(openBalance.initialBankFund)}</strong>
                </span>
              </div>
            )}
          </div>
          {openBalance && !showInline && (
            <div className="cashier-summary-grid">
              <button className={`cashier-metric ${machineResultTone}`} type="button" onClick={() => setScreen("counters")}>
                <span>Resultado de maquinas</span>
                <strong>{money(totals?.resultMachines)}</strong>
                <small>
                  {completedReadings}/{cashierMachines} recaudadas - {pendingReadings} pendientes
                </small>
              </button>
              <div className="cashier-metric passive neutral">
                <span>Salida total</span>
                <strong>{money(totalOutflows)}</strong>
                <small>Gastos + salarios + regalos</small>
              </div>
              <div className="cashier-metric passive neutral">
                <span>Efectivo en caja</span>
                <strong>{money(totals?.expectedCash)}</strong>
                <small>Esperado antes del cierre</small>
              </div>
              <div className="cashier-metric passive neutral">
                <span>Dinero en banco</span>
                <strong>{money(localBalances.bank)}</strong>
                <small>Saldo cuenta banco del local</small>
              </div>
              <button className="cashier-metric bank" type="button" onClick={() => setScreen("transfers")}>
                <span>Transferencias</span>
                <strong>{money(totals?.totalTransfers)}</strong>
                <small>Movimientos registrados en banco</small>
              </button>
              <button className="cashier-metric cash" type="button" onClick={() => setScreen("capital-movements")}>
                <span>Aportes efectivo</span>
                <strong>{money(totals?.capitalContributionsCash)}</strong>
                <small>Capital ingresado en caja</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("capital-movements")}>
                <span>Retiros</span>
                <strong>{money(totals?.totalWithdrawals)}</strong>
                <small>Efectivo y banco</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("expenses")}>
                <span>Gastos</span>
                <strong>{money(totals?.totalExpenses)}</strong>
                <small>Salidas operativas</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("salary-payments")}>
                <span>Salarios</span>
                <strong>{money(totals?.totalSalaries)}</strong>
                <small>Pagos al personal</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("gifts")}>
                <span>Regalos</span>
                <strong>{money(totals?.giftCash)}</strong>
                <small>Regalos en efectivo</small>
              </button>
            </div>
          )}
          {showInline ? (
            <section className="cashier-inline-view">{children}</section>
          ) : openBalance ? (
            <div className="cashier-secondary-actions">
              <button className="button muted compact" type="button" onClick={() => setScreen("cashier-clients")}>
                Clientes
              </button>
              <button className="button muted compact" type="button" onClick={() => setScreen("cashier-summary")}>
                Resumen cajas
              </button>
              <button className="button muted compact" type="button" disabled>
                Abrir caja
              </button>
              <button className="button soft-blue compact" type="button" onClick={() => setScreen("close-cash")}>
                Cerrar caja
              </button>
            </div>
          ) : (
            <section className="cashier-required">
              <div className="cashier-required-alert">Necesita abrir una nueva caja para poder operar.</div>
              <div className="cashier-secondary-actions cashier-secondary-actions-open">
                <button className="button muted compact" type="button" onClick={() => setScreen("cashier-clients")}>
                  Clientes
                </button>
                <button className="button muted compact" type="button" onClick={() => setScreen("cashier-summary")}>
                  Resumen cajas
                </button>
                <button className="button success compact" type="button" onClick={() => setScreen("open-cash")}>
                  Abrir caja
                </button>
              </div>
            </section>
          )}
        </section>
      </main>
      {showWindow && (
        <Modal title={titleForScreen(screen, user.role)} onClose={() => setScreen("panel")} closeLabel="Volver al panel" wide>
          {children}
        </Modal>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action, actionLabel = "Abrir caja" }: { title: string; text: string; action?: () => void; actionLabel?: string }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button className="button primary" onClick={action}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function menuGroupsForRole(role: Role): MenuGroup[] {
  if (role === "ADMINISTRADOR") {
    return [
      {
        title: "Inicio",
        items: [{ label: "Panel general", screen: "panel" }],
      },
      {
        title: "Control y auditoria",
        items: [
          { label: "Diferencias", screen: "differences" },
          { label: "Gastos", screen: "manager-expenses" },
          { label: "Auditoria", screen: "audit" },
          { label: "Cuentas corrientes", screen: "admin-current-accounts" },
        ],
      },
      {
        title: "Cierres y reportes",
        items: [
          { label: "Reportes", screen: "reports" },
          { label: "Cierre periodico", screen: "periodic" },
        ],
      },
      {
        title: "Gestion",
        items: [
          { label: "Locales", screen: "admin-locals" },
          { label: "Maquinas", screen: "admin-machines" },
          { label: "Taller", screen: "workshop" },
          { label: "Categorias gastos", screen: "admin-expense-categories" },
        ],
      },
      {
        title: "Personas",
        items: [
          { label: "Clientes", screen: "admin-clients" },
          { label: "Personal", screen: "admin-staff" },
          { label: "Liquidacion salarios", screen: "admin-salary-settlements" },
          { label: "Usuarios", screen: "admin-users" },
        ],
      },
      {
        title: "Sistema",
        items: [
          { label: "Datos locales", screen: "admin-local-data" },
          { label: "Papelera", screen: "admin-trash" },
        ],
      },
    ];
  }

  if (role === "ENCARGADO") {
    return [
      {
        title: "Inicio",
        items: [{ label: "Panel encargado", screen: "panel" }],
      },
      {
        title: "Control y auditoria",
        items: [
          { label: "Diferencias", screen: "differences" },
          { label: "Gastos", screen: "manager-expenses" },
          { label: "Auditoria", screen: "audit" },
          { label: "Cuentas corrientes", screen: "admin-current-accounts" },
        ],
      },
      {
        title: "Cierres y reportes",
        items: [
          { label: "Caja diaria", screen: "open-cash" },
          { label: "Cierre periodico", screen: "periodic" },
          { label: "Reportes", screen: "reports" },
        ],
      },
      {
        title: "Personas",
        items: [
          { label: "Personal", screen: "admin-staff" },
          { label: "Liquidacion salarios", screen: "admin-salary-settlements" },
          { label: "Clientes", screen: "admin-clients" },
        ],
      },
    ];
  }

  return [
    {
      title: "Caja diaria",
      items: [
        { label: "Panel cajero", screen: "panel" },
        { label: "Caja diaria", screen: "open-cash" },
        { label: "Contadores", screen: "counters" },
        { label: "Gastos", screen: "expenses" },
        { label: "Transferencias", screen: "transfers" },
        { label: "Regalos", screen: "gifts" },
        { label: "Retiros / aportes", screen: "capital-movements" },
        { label: "Cerrar caja", screen: "close-cash" },
      ],
    },
  ];
}

function titleForScreen(screen: Screen, role: Role) {
  const titles: Record<Screen, string> = {
    welcome: "Poseidon",
    login: "Ingreso al sistema",
    panel: role === "ADMINISTRADOR" ? "Reportes y administracion" : role === "ENCARGADO" ? "Panel del encargado" : "Panel del cajero",
    "open-cash": "Caja diaria",
    counters: "Cargar contadores",
    expenses: "Cargar gastos",
    transfers: "Cargar transferencias",
    gifts: "Cargar regalos",
    "salary-payments": "Pago de salarios",
    "capital-movements": "Retiros y aportes",
    "cashier-clients": "Clientes",
    "cashier-summary": "Resumen de cajas",
    "close-cash": "Cerrar caja diaria",
    reports: role === "ADMINISTRADOR" ? "Reportes y administracion" : "Reportes",
    "manager-expenses": "Control de gastos",
    "admin-users": "Usuarios",
    "admin-staff": "Personal",
    "admin-salary-settlements": "Liquidacion de salarios",
    "admin-current-accounts": "Cuentas corrientes",
    "admin-clients": "Clientes",
    "admin-trash": "Papelera",
    "admin-expense-categories": "Categorias de gastos",
    "admin-local-data": "Datos locales",
    "admin-machines": "Maquinas",
    workshop: "Taller",
    "admin-machine-edit": "Editar maquina",
    "admin-locals": "Locales",
    "admin-local-edit": "Editar local",
    differences: "Diferencias de caja",
    audit: "Auditoria",
    periodic: "Cierre periodico",
  };

  return titles[screen];
}
