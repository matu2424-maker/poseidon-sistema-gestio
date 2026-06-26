import { FormEvent, ReactNode, useEffect, useState } from "react";

type Role = "CAJERO" | "ENCARGADO" | "ADMINISTRADOR";
type BalanceStatus = "EN_PROCESO" | "CERRADO" | "AJUSTADO" | "ANULADO";
type MachineStatus = "ACTIVA" | "INACTIVA" | "MANTENIMIENTO";
type ReadingStatus = "PENDIENTE" | "CARGADA" | "SIN_LECTURA" | "FUERA_DE_SERVICIO";
type MovementStatus = "ACTIVO" | "ANULADO";
type DifferenceStatus = "PENDIENTE" | "REVISADA" | "RESUELTA" | "AJUSTADA" | "ANULADA";
type Screen =
  | "welcome"
  | "login"
  | "panel"
  | "open-cash"
  | "counters"
  | "expenses"
  | "transfers"
  | "gifts"
  | "close-cash"
  | "reports"
  | "admin-users"
  | "admin-machines"
  | "admin-locals"
  | "differences"
  | "audit"
  | "periodic";

type User = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  status: "ACTIVO" | "INACTIVO";
  localIds: string[];
};

type Local = {
  id: string;
  name: string;
  address: string;
  status: "ACTIVO" | "INACTIVO";
};

type Machine = {
  id: string;
  visibleId: string;
  name: string;
  localId: string;
  location: string;
  lastIn: number;
  lastOut: number;
  status: MachineStatus;
  notes: string;
};

type Balance = {
  id: string;
  localId: string;
  operatingDate: string;
  status: BalanceStatus;
  initialFund: number;
  initialNote: string;
  openedBy: string;
  openedAt: string;
  closedBy?: string;
  closedAt?: string;
  declaredCash?: number;
  nextBase?: number;
  withdrawal?: number;
  cashDifference?: number;
  differenceNote?: string;
  differenceStatus?: DifferenceStatus;
};

type Reading = {
  id: string;
  balanceId: string;
  machineId: string;
  inPrevious: number;
  inActual: number | null;
  outPrevious: number;
  outActual: number | null;
  result: number;
  status: ReadingStatus;
  observation: string;
  updatedBy: string;
  updatedAt: string;
};

type Expense = {
  id: string;
  balanceId: string;
  category: string;
  amount: number;
  description: string;
  receipt: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

type Transfer = {
  id: string;
  balanceId: string;
  receipt: string;
  name: string;
  amount: number;
  account: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

type Gift = {
  id: string;
  balanceId: string;
  type: "EFECTIVO" | "CREDITO" | "MIXTO";
  cashAmount: number;
  creditAmount: number;
  reference: string;
  description: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

type AuditEvent = {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue: string;
  newValue: string;
  reason: string;
  createdAt: string;
};

type AppData = {
  users: User[];
  locals: Local[];
  machines: Machine[];
  balances: Balance[];
  readings: Reading[];
  expenses: Expense[];
  transfers: Transfer[];
  gifts: Gift[];
  audit: AuditEvent[];
};

const STORAGE_KEY = "poseidon-sistema-gestion-v2";
const POSEIDON_LOCAL_ID = "local-poseidon";

function createDemoUsers(localId: string): User[] {
  return [
    {
      id: "user-cajero1",
      name: "Cajero 1",
      username: "cajero1",
      password: "cajero123",
      role: "CAJERO",
      status: "ACTIVO",
      localIds: [localId],
    },
    {
      id: "user-cajero2",
      name: "Cajero 2",
      username: "cajero2",
      password: "cajero123",
      role: "CAJERO",
      status: "ACTIVO",
      localIds: [localId],
    },
    {
      id: "user-encargado",
      name: "Encargado",
      username: "encargado",
      password: "encargado123",
      role: "ENCARGADO",
      status: "ACTIVO",
      localIds: [localId],
    },
    {
      id: "user-admin",
      name: "Administrador",
      username: "admin",
      password: "admin123",
      role: "ADMINISTRADOR",
      status: "ACTIVO",
      localIds: [localId],
    },
  ];
}

const roleLabels: Record<Role, string> = {
  CAJERO: "Cajero",
  ENCARGADO: "Encargado",
  ADMINISTRADOR: "Administrador",
};

const currency = new Intl.NumberFormat("es-UY", {
  style: "currency",
  currency: "UYU",
  maximumFractionDigits: 0,
});

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
const money = (value: number | undefined | null) => currency.format(Number.isFinite(value ?? NaN) ? Number(value) : 0);
const asNumber = (value: FormDataEntryValue | null) => Number(value || 0);

function createSeedData(): AppData {
  const local: Local = {
    id: POSEIDON_LOCAL_ID,
    name: "Poseidon",
    address: "Local principal",
    status: "ACTIVO",
  };

  const baseNames = ["Poseidon Azul", "Poseidon Roja", "Fondo 3"];

  return {
    users: createDemoUsers(local.id),
    locals: [local],
    machines: Array.from({ length: 3 }, (_, index) => ({
      id: `machine-${index + 1}`,
      visibleId: String(index + 1).padStart(3, "0"),
      name: baseNames[index] ?? `Maquina ${index + 1}`,
      localId: local.id,
      location: index < 12 ? "Salon principal" : index < 28 ? "Sector lateral" : "Fondo",
      lastIn: 100000 + index * 12000,
      lastOut: 76000 + index * 8300,
      status: index === 2 ? "MANTENIMIENTO" : "ACTIVA",
      notes: "",
    })),
    balances: [],
    readings: [],
    expenses: [],
    transfers: [],
    gifts: [],
    audit: [],
  };
}

function readData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedData();
    return normalizeData(JSON.parse(raw) as AppData);
  } catch {
    return createSeedData();
  }
}

function normalizeData(data: AppData): AppData {
  const machines = data.machines.slice(0, 3);
  const machineIds = new Set(machines.map((machine) => machine.id));
  const demoUsers = createDemoUsers(POSEIDON_LOCAL_ID);
  const existingUserIds = new Set(data.users.map((item) => item.id));
  const users = [...demoUsers.filter((item) => !existingUserIds.has(item.id)), ...data.users];

  return {
    ...data,
    users,
    machines,
    readings: data.readings.filter((reading) => machineIds.has(reading.machineId)),
  };
}

function calcReading(reading: Pick<Reading, "inPrevious" | "inActual" | "outPrevious" | "outActual">) {
  if (reading.inActual === null || reading.outActual === null) return 0;
  return reading.inActual - reading.inPrevious - (reading.outActual - reading.outPrevious);
}

function totalsForBalance(data: AppData, balanceId: string) {
  const readings = data.readings.filter((reading) => reading.balanceId === balanceId && reading.status === "CARGADA");
  const expenses = data.expenses.filter((expense) => expense.balanceId === balanceId && expense.status === "ACTIVO");
  const transfers = data.transfers.filter((transfer) => transfer.balanceId === balanceId && transfer.status === "ACTIVO");
  const gifts = data.gifts.filter((gift) => gift.balanceId === balanceId && gift.status === "ACTIVO");
  const balance = data.balances.find((item) => item.id === balanceId);
  const resultMachines = readings.reduce((total, reading) => total + reading.result, 0);
  const totalIn = readings.reduce((total, reading) => total + ((reading.inActual ?? reading.inPrevious) - reading.inPrevious), 0);
  const totalOut = readings.reduce((total, reading) => total + ((reading.outActual ?? reading.outPrevious) - reading.outPrevious), 0);
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  const totalTransfers = transfers.reduce((total, transfer) => total + transfer.amount, 0);
  const giftCash = gifts.reduce((total, gift) => total + gift.cashAmount, 0);
  const giftCredit = gifts.reduce((total, gift) => total + gift.creditAmount, 0);
  const expectedCash = (balance?.initialFund ?? 0) + resultMachines - totalExpenses - giftCash - totalTransfers;
  const commercialResult = resultMachines - totalExpenses - giftCash - giftCredit;
  const withdrawal = (balance?.declaredCash ?? 0) - (balance?.nextBase ?? 0);
  const difference = (balance?.declaredCash ?? 0) - expectedCash;

  return {
    totalIn,
    totalOut,
    resultMachines,
    totalExpenses,
    totalTransfers,
    giftCash,
    giftCredit,
    expectedCash,
    commercialResult,
    withdrawal,
    difference,
  };
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function tableToRows(rows: string[][]) {
  return rows
    .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/&/g, "&amp;")}</td>`).join("")}</tr>`)
    .join("");
}

function exportDailyExcel(data: AppData, balance: Balance) {
  const totals = totalsForBalance(data, balance.id);
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
        ["Fondo inicial", String(balance.initialFund)],
        ["Total IN", String(totals.totalIn)],
        ["Total OUT", String(totals.totalOut)],
        ["Resultado maquinas", String(totals.resultMachines)],
        ["Gastos", String(totals.totalExpenses)],
        ["Regalos efectivo", String(totals.giftCash)],
        ["Regalos credito", String(totals.giftCredit)],
        ["Transferencias", String(totals.totalTransfers)],
        ["Efectivo esperado", String(totals.expectedCash)],
        ["Efectivo declarado", String(balance.declaredCash ?? 0)],
        ["Base proximo dia", String(balance.nextBase ?? 0)],
        ["Retiro efectivo", String(balance.withdrawal ?? totals.withdrawal)],
        ["Diferencia", String(balance.cashDifference ?? totals.difference)],
      ])}</table>
      <h2>Maquinas</h2>
      <table border="1">${tableToRows([
        ["ID", "Maquina", "IN anterior", "IN actual", "OUT anterior", "OUT actual", "Resultado", "Estado", "Obs."],
        ...machineRows,
      ])}</table>
      <h2>Movimientos</h2>
      <table border="1">${tableToRows([
        ["Tipo", "Detalle", "Monto", "Estado"],
        ...expenses.map((expense) => ["Gasto", `${expense.category} - ${expense.description}`, String(expense.amount), expense.status]),
        ...transfers.map((transfer) => ["Transferencia", `${transfer.name} - ${transfer.receipt}`, String(transfer.amount), transfer.status]),
        ...gifts.map((gift) => ["Regalo", `${gift.type} - ${gift.description}`, String(gift.cashAmount + gift.creditAmount), gift.status]),
      ])}</table>
    </body></html>
  `;

  downloadFile(`poseidon-cierre-${balance.operatingDate}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
}

function exportCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadFile(filename, content, "text/csv;charset=utf-8");
}

function App() {
  const [data, setData] = useState<AppData>(() => readData());
  const [screen, setScreen] = useState<Screen>("welcome");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const activeLocal = data.locals.find((local) => local.id === POSEIDON_LOCAL_ID) ?? data.locals[0];
  const openBalance = data.balances.find((balance) => balance.localId === activeLocal.id && balance.status === "EN_PROCESO");

  const patchData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
  };

  const audit = (
    current: AppData,
    action: string,
    entity: string,
    entityId: string,
    previousValue: unknown,
    newValue: unknown,
    reason = "",
  ): AppData => ({
    ...current,
    audit: [
      {
        id: uid("audit"),
        userId: user?.id ?? "system",
        action,
        entity,
        entityId,
        previousValue: JSON.stringify(previousValue ?? ""),
        newValue: JSON.stringify(newValue ?? ""),
        reason,
        createdAt: nowIso(),
      },
      ...current.audit,
    ],
  });

  const resetDemo = () => {
    const fresh = createSeedData();
    setData(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setMessage("Datos reiniciados.");
    setScreen("panel");
  };

  const login = (username: string, password: string) => {
    const normalized = username.trim().toLowerCase();
    const aliases: Record<string, string> = {
      cajero: "cajero1",
      administrador: "admin",
    };
    const resolved = aliases[normalized] ?? normalized;
    const nextUser = data.users.find(
      (item) => item.username.toLowerCase() === resolved && item.password === password && item.status === "ACTIVO",
    );

    if (!nextUser) {
      setMessage("Usuario, contrasena o estado invalido.");
      return;
    }

    setUser(nextUser);
    setMessage("");
    setScreen("panel");
  };

  if (screen === "welcome") {
    return <Welcome onEnter={() => setScreen("login")} />;
  }

  if (screen === "login" || !user) {
    return <Login onBack={() => setScreen("welcome")} onLogin={login} message={message} />;
  }

  return (
    <Shell
      user={user}
      local={activeLocal}
      screen={screen}
      setScreen={setScreen}
      onLogout={() => {
        setUser(null);
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
          save={(operatingDate, initialFund, initialNote) => {
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
                localId: activeLocal.id,
                operatingDate,
                status: "EN_PROCESO",
                initialFund,
                initialNote,
                openedBy: user.id,
                openedAt: nowIso(),
              };
              const readings: Reading[] = current.machines
                .filter((machine) => machine.localId === activeLocal.id && machine.status !== "INACTIVA")
                .map((machine) => ({
                  id: uid("reading"),
                  balanceId: balance.id,
                  machineId: machine.id,
                  inPrevious: machine.lastIn,
                  inActual: null,
                  outPrevious: machine.lastOut,
                  outActual: null,
                  result: 0,
                  status: machine.status === "ACTIVA" ? "PENDIENTE" : "FUERA_DE_SERVICIO",
                  observation: machine.status === "ACTIVA" ? "" : "Maquina en mantenimiento",
                  updatedBy: user.id,
                  updatedAt: nowIso(),
                }));
              setMessage("Caja abierta correctamente.");
              setScreen("counters");
              return audit(
                { ...current, balances: [balance, ...current.balances], readings: [...readings, ...current.readings] },
                "Abrir caja",
                "BalanceDiario",
                balance.id,
                "",
                balance,
              );
            });
          }}
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
              const readings = current.readings.map((reading) => {
                if (reading.id !== readingId) return reading;
                const next = { ...reading, ...patch, updatedBy: user.id, updatedAt: nowIso() };
                return { ...next, result: calcReading(next) };
              });
              const next = readings.find((reading) => reading.id === readingId);
              return audit({ ...current, readings }, "Autoguardar contador", "Recaudacion", readingId, previous, next);
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
      {screen === "close-cash" && openBalance && (
        <CloseCash
          data={data}
          balance={openBalance}
          user={user}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          setScreen={setScreen}
        />
      )}
      {screen === "reports" && <Reports data={data} user={user} />}
      {screen === "admin-users" && <AdminUsers data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-machines" && <AdminMachines data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-locals" && <AdminLocals data={data} patchData={patchData} audit={audit} />}
      {screen === "differences" && <Differences data={data} patchData={patchData} audit={audit} />}
      {screen === "audit" && <Audit data={data} />}
      {screen === "periodic" && <Periodic data={data} />}
      {!openBalance && ["counters", "expenses", "transfers", "gifts", "close-cash"].includes(screen) && (
        <EmptyState title="No hay caja abierta" text="Abri una nueva caja o trabaja sobre una caja en proceso." action={() => setScreen("open-cash")} />
      )}
    </Shell>
  );
}

function Welcome({ onEnter }: { onEnter: () => void }) {
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

function Login({ onBack, onLogin, message }: { onBack: () => void; onLogin: (username: string, password: string) => void; message: string }) {
  const [username, setUsername] = useState("cajero1");
  const [password, setPassword] = useState("cajero123");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin(username, password);
  };

  return (
    <main className="login-screen">
      <header className="login-top">POSEIDON</header>
      <section className="login-card">
        <h1>Ingreso al sistema</h1>
        <form onSubmit={submit} className="form-stack">
          <label>
            Usuario
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Contrasena
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          <div className="button-row">
            <button className="button primary" type="submit">
              Iniciar sesion
            </button>
            <button className="button muted" type="button" onClick={onBack}>
              Volver
            </button>
          </div>
        </form>
        <p className={message ? "validation error" : "validation"}>
          {message || "Usuarios: cajero1, cajero2, encargado, admin."}
        </p>
      </section>
    </main>
  );
}

function Shell({
  user,
  local,
  screen,
  setScreen,
  onLogout,
  children,
}: {
  user: User;
  local: Local;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const items = menuForRole(user.role);

  return (
    <div className="app-shell">
      <aside className="side">
        <div className="side-brand">
          <strong>POSEIDON</strong>
          <span>Sistema de Gestion</span>
        </div>
        <nav>
          {items.map((item) => (
            <button key={item.screen} className={screen === item.screen ? "side-link active" : "side-link"} onClick={() => setScreen(item.screen)}>
              {item.label}
            </button>
          ))}
        </nav>
        <button className="side-link logout" onClick={onLogout}>
          Salir
        </button>
      </aside>
      <section className="main">
        <header className="top">
          <h1>{titleForScreen(screen, user.role)}</h1>
          <div>
            <span>Local: {local.name}</span>
            <span>Usuario: {user.name}</span>
          </div>
        </header>
        <main className="content">{children}</main>
      </section>
    </div>
  );
}

function menuForRole(role: Role): { label: string; screen: Screen }[] {
  if (role === "ADMINISTRADOR") {
    return [
      { label: "Panel general", screen: "panel" },
      { label: "Locales", screen: "admin-locals" },
      { label: "Maquinas", screen: "admin-machines" },
      { label: "Usuarios", screen: "admin-users" },
      { label: "Caja diaria", screen: "open-cash" },
      { label: "Diferencias", screen: "differences" },
      { label: "Reportes", screen: "reports" },
      { label: "Auditoria", screen: "audit" },
      { label: "Cierre periodico", screen: "periodic" },
    ];
  }

  return [
    { label: "Caja", screen: "panel" },
    { label: "Abrir caja", screen: "open-cash" },
    { label: "Contadores", screen: "counters" },
    { label: "Gastos", screen: "expenses" },
    { label: "Transferencias", screen: "transfers" },
    { label: "Regalos", screen: "gifts" },
    { label: "Cerrar caja", screen: "close-cash" },
    ...(role === "ENCARGADO"
      ? [
          { label: "Diferencias", screen: "differences" as Screen },
          { label: "Reportes", screen: "reports" as Screen },
          { label: "Auditoria", screen: "audit" as Screen },
        ]
      : []),
  ];
}

function titleForScreen(screen: Screen, role: Role) {
  const titles: Record<Screen, string> = {
    welcome: "Poseidon",
    login: "Ingreso al sistema",
    panel: role === "ADMINISTRADOR" ? "Reportes y administracion" : "Panel del cajero",
    "open-cash": "Abrir nueva caja",
    counters: "Cargar contadores",
    expenses: "Cargar gastos",
    transfers: "Cargar transferencias",
    gifts: "Cargar regalos",
    "close-cash": "Cerrar caja diaria",
    reports: "Reportes y administracion",
    "admin-users": "Usuarios",
    "admin-machines": "Maquinas",
    "admin-locals": "Locales",
    differences: "Diferencias de caja",
    audit: "Auditoria",
    periodic: "Cierre periodico",
  };

  return titles[screen];
}

function Panel({
  data,
  user,
  local,
  openBalance,
  modeStatus,
  setScreen,
  resetDemo,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  modeStatus: string;
  setScreen: (screen: Screen) => void;
  resetDemo: () => void;
}) {
  const activeBalance = openBalance ?? data.balances.find((balance) => balance.status === "CERRADO");
  const totals = activeBalance ? totalsForBalance(data, activeBalance.id) : null;

  if (user.role === "ADMINISTRADOR") {
    return (
      <>
        <h2>Reportes iniciales</h2>
        <div className="card-grid three">
          <InfoCard tone="blue" title="Cierre diario" lines={["Exportacion Excel", "Caja, maquinas y movimientos"]} />
          <InfoCard tone="green" title="Maquinas" lines={["Resultado por maquina", "Historial de lecturas"]} />
          <InfoCard tone="red" title="Diferencias" lines={["Pendientes / revisadas", "Observaciones obligatorias"]} />
        </div>
        <h2>Panel administrativo</h2>
        <div className="card-grid three">
          <ActionCard title="Usuarios" text="Cajero, encargado, admin" onClick={() => setScreen("admin-users")} />
          <ActionCard title="Maquinas" text="ID unico, activa, mantenimiento" onClick={() => setScreen("admin-machines")} />
          <ActionCard title="Auditoria" text="Cambios sensibles e historial" onClick={() => setScreen("audit")} />
        </div>
        <div className="button-row end">
          <button className="button muted" onClick={resetDemo}>
            Reiniciar demo
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Estado de caja</h2>
      <div className="card-grid three">
        <InfoCard
          tone="green"
          title="Caja del dia"
          lines={[
            `Fecha operativa: ${openBalance?.operatingDate ?? "libre"}`,
            `Estado: ${openBalance?.status ?? "SIN CAJA"}`,
            `Fondo inicial: ${money(openBalance?.initialFund)}`,
          ]}
        />
        <InfoCard
          tone="blue"
          title="Maquinas"
          lines={[
            `Activas: ${data.machines.filter((machine) => machine.localId === local.id && machine.status === "ACTIVA").length}`,
            `Pendientes: ${openBalance ? data.readings.filter((reading) => reading.balanceId === openBalance.id && reading.status === "PENDIENTE").length : 0}`,
            `Resultado: ${money(totals?.resultMachines)}`,
          ]}
        />
        <InfoCard
          tone="orange"
          title="Cierre"
          lines={[
            `Efectivo esperado: ${money(totals?.expectedCash)}`,
            `Diferencia: ${money(activeBalance?.cashDifference ?? totals?.difference)}`,
            `Modo: ${modeStatus}`,
          ]}
        />
      </div>
      <div className="card-grid three action-area">
        <ActionCard title="Abrir nueva caja" text="Crear caja diaria" onClick={() => setScreen("open-cash")} />
        <ActionCard title="Cargar contadores" text="IN / OUT por maquina" onClick={() => setScreen("counters")} />
        <ActionCard title="Cargar gastos" text="Limpieza, repuestos, servicios" onClick={() => setScreen("expenses")} />
        <ActionCard title="Cargar transferencias" text="Comprobante, nombre y monto" onClick={() => setScreen("transfers")} />
        <ActionCard title="Cargar regalos" text="Efectivo o credito" onClick={() => setScreen("gifts")} />
        <ActionCard title="Cerrar caja" text="Declarar efectivo y cerrar" onClick={() => setScreen("close-cash")} />
      </div>
    </>
  );
}

function InfoCard({ title, lines, tone }: { title: string; lines: string[]; tone: "blue" | "green" | "orange" | "red" }) {
  return (
    <article className={`info-card ${tone}`}>
      <h3>{title}</h3>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </article>
  );
}

function ActionCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <article className="action-card">
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="button primary small" onClick={onClick}>
        Abrir
      </button>
    </article>
  );
}

function OpenCash({
  data,
  user,
  local,
  openBalance,
  setScreen,
  save,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  setScreen: (screen: Screen) => void;
  save: (date: string, initialFund: number, note: string) => void;
}) {
  const lastClosed = data.balances.find((balance) => balance.localId === local.id && balance.status === "CERRADO");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save(String(form.get("operatingDate")), asNumber(form.get("initialFund")), String(form.get("initialNote") ?? ""));
  };

  return (
    <section className="form-card wide-card">
      <h2>Nueva caja diaria</h2>
      {openBalance && (
        <div className="notice">
          Ya hay una caja abierta para {openBalance.operatingDate}. Podes continuarla desde contadores o cierre.
        </div>
      )}
      <form onSubmit={submit} className="form-grid">
        <label>
          Local
          <input value={local.name} disabled />
        </label>
        <label>
          Fecha operativa
          <input name="operatingDate" type="date" defaultValue={today()} required />
        </label>
        <label className="span-2">
          Fondo inicial
          <input name="initialFund" type="number" min="0" defaultValue={lastClosed?.nextBase ?? 0} required />
        </label>
        <label className="span-2">
          Observacion inicial
          <input name="initialNote" placeholder="Opcional" />
        </label>
        <InfoCard
          tone="red"
          title="Regla clave"
          lines={["No puede haber dos cajas abiertas para el mismo local y fecha.", `Usuario apertura: ${user.name}`]}
        />
        <div className="form-actions">
          <button className="button success" type="submit">
            Abrir caja
          </button>
          <button className="button muted" type="button" onClick={() => setScreen("panel")}>
            Volver
          </button>
        </div>
      </form>
    </section>
  );
}

function Counters({
  data,
  user,
  balance,
  updateReading,
}: {
  data: AppData;
  user: User;
  balance: Balance;
  updateReading: (id: string, patch: Partial<Reading>) => void;
}) {
  const readings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const totals = totalsForBalance(data, balance.id);

  return (
    <>
      <h2>Carga en grilla completa con autoguardado</h2>
      <div className="card-grid three">
        <InfoCard tone="blue" title="Total parcial" lines={[`Resultado maquinas: ${money(totals.resultMachines)}`, `Pendientes: ${readings.filter((r) => r.status === "PENDIENTE").length}`]} />
        <InfoCard tone="green" title="Reglas" lines={["IN/OUT en dinero", "Historial consultable"]} />
        <InfoCard tone="orange" title="Excepciones" lines={["Sin lectura / fuera de servicio", "Observacion obligatoria"]} />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Maquina</th>
              <th>Estado</th>
              <th>IN ant.</th>
              <th>IN act.</th>
              <th>OUT ant.</th>
              <th>OUT act.</th>
              <th>Resultado</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading) => {
              const machine = data.machines.find((item) => item.id === reading.machineId);
              return (
                <tr key={reading.id}>
                  <td>{machine?.visibleId}</td>
                  <td>{machine?.name}</td>
                  <td>
                    <select
                      value={reading.status}
                      onChange={(event) => updateReading(reading.id, { status: event.target.value as ReadingStatus })}
                      disabled={balance.status !== "EN_PROCESO"}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="CARGADA">Cargada</option>
                      <option value="SIN_LECTURA">Sin lectura</option>
                      <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                    </select>
                  </td>
                  <td>{reading.inPrevious}</td>
                  <td>
                    <input
                      type="number"
                      value={reading.inActual ?? ""}
                      onChange={(event) => updateReading(reading.id, { inActual: event.target.value === "" ? null : Number(event.target.value), status: "CARGADA" })}
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                  <td>{reading.outPrevious}</td>
                  <td>
                    <input
                      type="number"
                      value={reading.outActual ?? ""}
                      onChange={(event) => updateReading(reading.id, { outActual: event.target.value === "" ? null : Number(event.target.value), status: "CARGADA" })}
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                  <td>{money(reading.result)}</td>
                  <td>
                    <input
                      value={reading.observation}
                      onChange={(event) => updateReading(reading.id, { observation: event.target.value })}
                      placeholder="Tecnico / motivo"
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="helper">Autoguardado: cada cambio registra usuario, fecha/hora, valor anterior y valor nuevo. Usuario actual: {user.name}.</p>
    </>
  );
}

function Expenses({
  data,
  balance,
  user,
  patchData,
  audit,
  setMessage,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  const items = data.expenses.filter((item) => item.balanceId === balance.id);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expense: Expense = {
      id: uid("expense"),
      balanceId: balance.id,
      category: String(form.get("category")),
      amount: asNumber(form.get("amount")),
      description: String(form.get("description")),
      receipt: String(form.get("receipt") ?? ""),
      status: "ACTIVO",
      userId: user.id,
      createdAt: nowIso(),
    };
    if (!expense.amount || !expense.description.trim()) {
      setMessage("Monto y descripcion son obligatorios.");
      return;
    }
    patchData((current) => audit({ ...current, expenses: [expense, ...current.expenses] }, "Crear gasto", "Gasto", expense.id, "", expense));
    setMessage("Gasto guardado.");
    event.currentTarget.reset();
  };

  return (
    <MovementLayout title="Cargar gastos" sideTitle="Impacto en caja" sideLines={["Se registra en balance diario", "Cajero puede editar/anular antes de cerrar"]}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Categoria
          <select name="category">
            <option>Limpieza</option>
            <option>Repuestos</option>
            <option>Servicios</option>
            <option>Otros</option>
          </select>
        </label>
        <label>
          Monto
          <input name="amount" type="number" min="1" required />
        </label>
        <label>
          Descripcion
          <input name="description" required />
        </label>
        <label>
          Comprobante
          <input name="receipt" placeholder="Opcional" />
        </label>
        <FormButtons />
      </form>
      <MovementList
        items={items.map((item) => ({ id: item.id, title: `${item.category} - ${item.description}`, amount: item.amount, status: item.status }))}
        onAnnul={(id) => annulMovement("expenses", id, patchData, audit)}
      />
    </MovementLayout>
  );
}

function Transfers(props: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  const items = props.data.transfers.filter((item) => item.balanceId === props.balance.id);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const transfer: Transfer = {
      id: uid("transfer"),
      balanceId: props.balance.id,
      receipt: String(form.get("receipt")),
      name: String(form.get("name")),
      amount: asNumber(form.get("amount")),
      account: String(form.get("account") || "Cuenta unica inicial"),
      status: "ACTIVO",
      userId: props.user.id,
      createdAt: nowIso(),
    };
    if (!transfer.receipt.trim() || !transfer.name.trim() || !transfer.amount) {
      props.setMessage("Comprobante, nombre y monto son obligatorios.");
      return;
    }
    props.patchData((current) => props.audit({ ...current, transfers: [transfer, ...current.transfers] }, "Crear transferencia", "Transferencia", transfer.id, "", transfer));
    props.setMessage("Transferencia guardada.");
    event.currentTarget.reset();
  };

  return (
    <MovementLayout title="Cargar transferencias" sideTitle="Impacto en caja" sideLines={["Resta del efectivo esperado", "No resta del resultado comercial"]}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Comprobante
          <input name="receipt" required />
        </label>
        <label>
          Nombre
          <input name="name" required />
        </label>
        <label>
          Monto
          <input name="amount" type="number" min="1" required />
        </label>
        <label>
          Cuenta
          <input name="account" defaultValue="Cuenta unica inicial" />
        </label>
        <FormButtons />
      </form>
      <MovementList
        items={items.map((item) => ({ id: item.id, title: `${item.name} - ${item.receipt}`, amount: item.amount, status: item.status }))}
        onAnnul={(id) => annulMovement("transfers", id, props.patchData, props.audit)}
      />
    </MovementLayout>
  );
}

function Gifts(props: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  const items = props.data.gifts.filter((item) => item.balanceId === props.balance.id);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get("type")) as Gift["type"];
    const gift: Gift = {
      id: uid("gift"),
      balanceId: props.balance.id,
      type,
      cashAmount: type === "CREDITO" ? 0 : asNumber(form.get("cashAmount")),
      creditAmount: type === "EFECTIVO" ? 0 : asNumber(form.get("creditAmount")),
      reference: String(form.get("reference") ?? ""),
      description: String(form.get("description")),
      status: "ACTIVO",
      userId: props.user.id,
      createdAt: nowIso(),
    };
    if (!gift.description.trim() || gift.cashAmount + gift.creditAmount <= 0) {
      props.setMessage("El regalo requiere monto y observacion.");
      return;
    }
    props.patchData((current) => props.audit({ ...current, gifts: [gift, ...current.gifts] }, "Crear regalo", "Regalo", gift.id, "", gift));
    props.setMessage("Regalo guardado.");
    event.currentTarget.reset();
  };

  return (
    <MovementLayout title="Cargar regalos" sideTitle="Impacto en caja" sideLines={["Efectivo resta caja", "Credito resta resultado comercial"]}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Tipo
          <select name="type">
            <option value="EFECTIVO">Efectivo</option>
            <option value="CREDITO">Credito en maquina</option>
            <option value="MIXTO">Mixto</option>
          </select>
        </label>
        <label>
          Monto efectivo
          <input name="cashAmount" type="number" min="0" defaultValue="0" />
        </label>
        <label>
          Monto credito
          <input name="creditAmount" type="number" min="0" defaultValue="0" />
        </label>
        <label>
          Maquina / cliente
          <input name="reference" placeholder="Opcional segun caso" />
        </label>
        <label>
          Observacion
          <input name="description" required />
        </label>
        <FormButtons />
      </form>
      <MovementList
        items={items.map((item) => ({
          id: item.id,
          title: `${item.type} - ${item.description}`,
          amount: item.cashAmount + item.creditAmount,
          status: item.status,
        }))}
        onAnnul={(id) => annulMovement("gifts", id, props.patchData, props.audit)}
      />
    </MovementLayout>
  );
}

function MovementLayout({
  title,
  sideTitle,
  sideLines,
  children,
}: {
  title: string;
  sideTitle: string;
  sideLines: string[];
  children: ReactNode;
}) {
  return (
    <div className="movement-layout">
      <section className="form-card">
        <h2>{title}</h2>
        {children}
      </section>
      <aside className="side-notes">
        <InfoCard tone="blue" title={sideTitle} lines={sideLines} />
        <InfoCard tone="green" title="Auditoria" lines={["Usuario y fecha/hora automaticos", "Valor anterior y nuevo si se modifica"]} />
      </aside>
    </div>
  );
}

function FormButtons() {
  return (
    <div className="button-row">
      <button className="button success" type="submit">
        Guardar
      </button>
      <button className="button muted" type="reset">
        Anular
      </button>
    </div>
  );
}

function MovementList({
  items,
  onAnnul,
}: {
  items: { id: string; title: string; amount: number; status: MovementStatus }[];
  onAnnul: (id: string) => void;
}) {
  if (items.length === 0) return <p className="helper">Sin movimientos cargados.</p>;

  return (
    <div className="mini-list">
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.title}</span>
          <strong>{money(item.amount)}</strong>
          <em>{item.status}</em>
          {item.status === "ACTIVO" && (
            <button className="link-button" onClick={() => onAnnul(item.id)}>
              Anular
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function annulMovement(
  collection: "expenses" | "transfers" | "gifts",
  id: string,
  patchData: (updater: (current: AppData) => AppData) => void,
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData,
) {
  patchData((current) => {
    const previous = current[collection].find((item) => item.id === id);
    const nextCollection = current[collection].map((item) => (item.id === id ? { ...item, status: "ANULADO" as MovementStatus } : item));
    return audit({ ...current, [collection]: nextCollection }, "Anular movimiento", collection, id, previous, { status: "ANULADO" }, "Anulacion operativa");
  });
}

function CloseCash({
  data,
  balance,
  user,
  patchData,
  audit,
  setMessage,
  setScreen,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  const totals = totalsForBalance(data, balance.id);
  const pendingInvalid = data.readings.filter(
    (reading) => reading.balanceId === balance.id && reading.status === "PENDIENTE" && !reading.observation.trim(),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingInvalid.length > 0) {
      setMessage("No se puede cerrar: hay maquinas activas pendientes sin observacion.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const declaredCash = asNumber(form.get("declaredCash"));
    const nextBase = asNumber(form.get("nextBase"));
    const withdrawal = declaredCash - nextBase;
    const difference = declaredCash - totals.expectedCash;
    const differenceNote = String(form.get("differenceNote") ?? "");
    if (difference !== 0 && !differenceNote.trim()) {
      setMessage("Toda diferencia requiere observacion.");
      return;
    }

    patchData((current) => {
      const previous = current.balances.find((item) => item.id === balance.id);
      const balances = current.balances.map((item) =>
        item.id === balance.id
          ? {
              ...item,
              status: "CERRADO" as BalanceStatus,
              closedBy: user.id,
              closedAt: nowIso(),
              declaredCash,
              nextBase,
              withdrawal,
              cashDifference: difference,
              differenceNote,
              differenceStatus: difference === 0 ? "RESUELTA" : ("PENDIENTE" as DifferenceStatus),
            }
          : item,
      );
      const machines = current.machines.map((machine) => {
        const reading = current.readings.find((item) => item.balanceId === balance.id && item.machineId === machine.id && item.status === "CARGADA");
        return reading ? { ...machine, lastIn: reading.inActual ?? machine.lastIn, lastOut: reading.outActual ?? machine.lastOut } : machine;
      });
      const next = balances.find((item) => item.id === balance.id);
      return audit({ ...current, balances, machines }, "Cerrar caja", "BalanceDiario", balance.id, previous, next, differenceNote);
    });
    setMessage("Caja cerrada correctamente.");
    setScreen("reports");
  };

  return (
    <>
      <h2>Resumen de cierre</h2>
      <div className="card-grid three">
        <InfoCard tone="blue" title="Resultado maquinas" lines={[`Total IN: ${money(totals.totalIn)}`, `Total OUT: ${money(totals.totalOut)}`, `IN - OUT: ${money(totals.resultMachines)}`]} />
        <InfoCard tone="orange" title="Movimientos" lines={[`Gastos: ${money(totals.totalExpenses)}`, `Regalos efectivo: ${money(totals.giftCash)}`, `Transferencias: ${money(totals.totalTransfers)}`]} />
        <InfoCard tone="green" title="Caja" lines={[`Fondo inicial: ${money(balance.initialFund)}`, `Efectivo esperado: ${money(totals.expectedCash)}`, `Resultado comercial: ${money(totals.commercialResult)}`]} />
      </div>
      <section className="form-card wide-card">
        <form onSubmit={submit} className="form-grid">
          <label>
            Efectivo declarado
            <input name="declaredCash" type="number" min="0" required />
          </label>
          <label>
            Base proximo dia
            <input name="nextBase" type="number" min="0" defaultValue={balance.initialFund} required />
          </label>
          <label>
            Retiro efectivo
            <input value="Se calcula al cerrar" disabled />
          </label>
          <label>
            Observacion por diferencia
            <input name="differenceNote" placeholder="Obligatoria si difiere" />
          </label>
          <InfoCard tone="red" title="Estados de diferencia" lines={["Pendiente - Revisada - Resuelta - Ajustada - Anulada"]} />
          <div className="form-actions">
            <button className="button success" type="submit">
              Cerrar caja
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

function Reports({ data, user }: { data: AppData; user: User }) {
  const closedBalances = data.balances.filter((balance) => balance.status === "CERRADO");
  const latest = closedBalances[0];
  const diffs = closedBalances.filter((balance) => (balance.cashDifference ?? 0) !== 0);

  return (
    <>
      <h2>Reportes iniciales</h2>
      <div className="card-grid three">
        <article className="action-card">
          <h3>Cierre diario</h3>
          <p>Exportacion Excel con caja, maquinas y movimientos</p>
          <button className="button primary small" disabled={!latest} onClick={() => latest && exportDailyExcel(data, latest)}>
            Exportar
          </button>
        </article>
        <article className="action-card">
          <h3>Maquinas</h3>
          <p>Resultado por maquina e historial de lecturas</p>
          <button
            className="button primary small"
            onClick={() =>
              exportCsv("poseidon-maquinas.csv", [
                ["ID", "Nombre", "Estado", "Ultimo IN", "Ultimo OUT"],
                ...data.machines.map((machine) => [machine.visibleId, machine.name, machine.status, String(machine.lastIn), String(machine.lastOut)]),
              ])
            }
          >
            Exportar
          </button>
        </article>
        <article className="action-card">
          <h3>Diferencias</h3>
          <p>Pendientes / revisadas con observacion</p>
          <button
            className="button primary small"
            onClick={() =>
              exportCsv("poseidon-diferencias.csv", [
                ["Fecha", "Diferencia", "Estado", "Observacion"],
                ...diffs.map((balance) => [balance.operatingDate, String(balance.cashDifference ?? 0), balance.differenceStatus ?? "", balance.differenceNote ?? ""]),
              ])
            }
          >
            Exportar
          </button>
        </article>
      </div>
      <h2>Historial de cierres</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Efectivo esperado</th>
              <th>Declarado</th>
              <th>Diferencia</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {closedBalances.map((balance) => {
              const totals = totalsForBalance(data, balance.id);
              return (
                <tr key={balance.id}>
                  <td>{balance.operatingDate}</td>
                  <td>{balance.status}</td>
                  <td>{money(totals.expectedCash)}</td>
                  <td>{money(balance.declaredCash)}</td>
                  <td>{money(balance.cashDifference)}</td>
                  <td>
                    <button className="link-button" onClick={() => exportDailyExcel(data, balance)}>
                      Excel
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {user.role === "CAJERO" && <p className="helper">El cajero ve reportes de la caja operativa, no historicos generales.</p>}
    </>
  );
}

function AdminUsers({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const user: User = {
      id: uid("user"),
      name: String(form.get("name")),
      username: String(form.get("username")),
      password: String(form.get("password") || "poseidon123"),
      role: String(form.get("role")) as Role,
      status: "ACTIVO",
      localIds: [POSEIDON_LOCAL_ID],
    };
    patchData((current) => audit({ ...current, users: [...current.users, user] }, "Crear usuario", "Usuario", user.id, "", user));
    event.currentTarget.reset();
  };

  return <AdminTable title="Usuarios" data={data} rows={data.users.map((user) => [user.name, user.username, roleLabels[user.role], user.status])} form={submit} fields={["name", "username", "password"]} selectRole />;
}

function AdminMachines({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const machine: Machine = {
      id: uid("machine"),
      visibleId: String(form.get("visibleId")),
      name: String(form.get("name")),
      localId: POSEIDON_LOCAL_ID,
      location: String(form.get("location") || "Salon"),
      lastIn: 0,
      lastOut: 0,
      status: "ACTIVA",
      notes: "",
    };
    patchData((current) => {
      if (current.machines.some((item) => item.visibleId === machine.visibleId)) return current;
      return audit({ ...current, machines: [...current.machines, machine] }, "Crear maquina", "Maquina", machine.id, "", machine);
    });
    event.currentTarget.reset();
  };

  return (
    <AdminTable
      title="Maquinas"
      data={data}
      rows={data.machines.map((machine) => [machine.visibleId, machine.name, machine.status, `${machine.lastIn}/${machine.lastOut}`])}
      form={submit}
      fields={["visibleId", "name", "location"]}
    />
  );
}

function AdminLocals({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const local: Local = {
      id: uid("local"),
      name: String(form.get("name")),
      address: String(form.get("address")),
      status: "ACTIVO",
    };
    patchData((current) => audit({ ...current, locals: [...current.locals, local] }, "Crear local", "Local", local.id, "", local));
    event.currentTarget.reset();
  };

  return <AdminTable title="Locales" data={data} rows={data.locals.map((local) => [local.name, local.address, local.status, "Preparado multi-local"])} form={submit} fields={["name", "address"]} />;
}

function AdminTable({
  title,
  rows,
  form,
  fields,
  selectRole,
}: {
  title: string;
  data: AppData;
  rows: string[][];
  form: (event: FormEvent<HTMLFormElement>) => void;
  fields: string[];
  selectRole?: boolean;
}) {
  return (
    <div className="admin-layout">
      <section className="form-card">
        <h2>Crear {title.toLowerCase()}</h2>
        <form className="form-stack" onSubmit={form}>
          {fields.map((field) => (
            <label key={field}>
              {field}
              <input name={field} required={field !== "password"} />
            </label>
          ))}
          {selectRole && (
            <label>
              role
              <select name="role">
                <option value="CAJERO">Cajero</option>
                <option value="ENCARGADO">Encargado</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </label>
          )}
          <button className="button success" type="submit">
            Guardar
          </button>
        </form>
      </section>
      <section className="table-wrap grow">
        <table className="data-table">
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Differences({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const balances = data.balances.filter((balance) => (balance.cashDifference ?? 0) !== 0);
  const update = (id: string, status: DifferenceStatus) => {
    patchData((current) => {
      const previous = current.balances.find((balance) => balance.id === id);
      const balancesNext = current.balances.map((balance) => (balance.id === id ? { ...balance, differenceStatus: status } : balance));
      return audit({ ...current, balances: balancesNext }, "Cambiar estado diferencia", "DiferenciaCaja", id, previous, { status });
    });
  };

  return (
    <>
      <h2>Diferencias de caja</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Observacion</th>
              <th>Gestion</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr key={balance.id}>
                <td>{balance.operatingDate}</td>
                <td>{money(balance.cashDifference)}</td>
                <td>{balance.differenceStatus}</td>
                <td>{balance.differenceNote}</td>
                <td>
                  <select value={balance.differenceStatus} onChange={(event) => update(balance.id, event.target.value as DifferenceStatus)}>
                    <option>PENDIENTE</option>
                    <option>REVISADA</option>
                    <option>RESUELTA</option>
                    <option>AJUSTADA</option>
                    <option>ANULADA</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Audit({ data }: { data: AppData }) {
  return (
    <>
      <h2>Bitacora de auditoria</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha/hora</th>
              <th>Usuario</th>
              <th>Accion</th>
              <th>Entidad</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {data.audit.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.createdAt).toLocaleString()}</td>
                <td>{data.users.find((user) => user.id === event.userId)?.name ?? "Sistema"}</td>
                <td>{event.action}</td>
                <td>{event.entity}</td>
                <td>{event.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Periodic({ data }: { data: AppData }) {
  const closed = data.balances.filter((balance) => balance.status === "CERRADO");
  const total = closed.reduce(
    (acc, balance) => {
      const totals = totalsForBalance(data, balance.id);
      return {
        result: acc.result + totals.commercialResult,
        differences: acc.differences + (balance.cashDifference ?? 0),
        withdrawals: acc.withdrawals + (balance.withdrawal ?? 0),
      };
    },
    { result: 0, differences: 0, withdrawals: 0 },
  );

  return (
    <>
      <h2>Consolidado inicial</h2>
      <div className="card-grid three">
        <InfoCard tone="green" title="Resultado neto" lines={[money(total.result), `${closed.length} cierres cerrados`]} />
        <InfoCard tone="blue" title="Retiros" lines={[money(total.withdrawals), "Suma de retiros declarados"]} />
        <InfoCard tone="orange" title="Diferencias" lines={[money(total.differences), "Pendientes y resueltas"]} />
      </div>
    </>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action: () => void }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button primary" onClick={action}>
        Abrir caja
      </button>
    </section>
  );
}

export default App;
