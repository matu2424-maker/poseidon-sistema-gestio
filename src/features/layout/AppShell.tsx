import { FormEvent, ReactNode, useEffect, useState } from "react";
import { roleLabels } from "../../lib/display";
import { menuGroupsForRole, titleForScreen } from "../../navigation/screens";
import type { Local, MenuGroup, Role, Screen, User } from "../../types";

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

export function Login({
  users,
  onBack,
  onLogin,
  message,
}: {
  users: User[];
  onBack: () => void;
  onLogin: (userId: string) => void;
  message: string;
}) {
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
  const isActive = (item: { screen: Screen }) => screen === item.screen;
  const groupHasActiveItem = (group: MenuGroup) => group.items.some(isActive);

  useEffect(() => {
    const activeGroup = groups.find(groupHasActiveItem);
    if (!activeGroup) return;
    setOpenGroups((current) =>
      current[activeGroup.title] ? current : { ...current, [activeGroup.title]: true },
    );
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
                  <button
                    key={`${group.title}-${item.screen}`}
                    className={isActive(item) ? "side-link active" : "side-link"}
                    onClick={() => setScreen(item.screen)}
                  >
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
