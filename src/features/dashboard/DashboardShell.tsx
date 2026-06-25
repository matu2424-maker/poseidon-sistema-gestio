import { LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { roleLabels, type MockUser } from "../auth/users";
import { getMenuForRole } from "./menu";

type DashboardShellProps = {
  user: MockUser;
  onLogout: () => void;
};

export function DashboardShell({ user, onLogout }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Verificando");
  const visibleMenu = getMenuForRole(user.role);

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      setBackendStatus(error ? "Revisar config" : "Conectado");
    });
  }, []);

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Menu principal">
        <div className="sidebar-brand">
          <div className="brand-mark compact" aria-hidden="true">
            P
          </div>
          <div>
            <strong>Poseidon</strong>
            <span>Sistema de Gestion</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleMenu.map((item) => {
            const Icon = item.icon;

            return (
              <button key={item.id} className={item.id === "inicio" ? "nav-item active" : "nav-item"} type="button">
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="dashboard-content">
        <header className="topbar">
          <button
            className="icon-button menu-toggle"
            type="button"
            onClick={() => setSidebarOpen((isOpen) => !isOpen)}
            aria-label="Abrir menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          <div className="topbar-local">
            <span>Local activo</span>
            <strong>Poseidon</strong>
          </div>

          <div className="topbar-user">
            <div>
              <strong>{user.name}</strong>
              <span>{roleLabels[user.role]}</span>
            </div>
            <button className="secondary-button logout-button" type="button" onClick={onLogout}>
              <LogOut size={17} aria-hidden="true" />
              Salir
            </button>
          </div>
        </header>

        <main className="workspace" aria-labelledby="workspace-title">
          <section className="module-placeholder">
            <div>
              <p className="eyebrow">Modulo 0</p>
              <h1 id="workspace-title">Panel principal</h1>
              <p>
                El area principal queda preparada para incorporar los proximos modulos sin cambiar la estructura del
                sistema.
              </p>
            </div>

            <div className="status-grid" aria-label="Estado inicial del sistema">
              <article>
                <span>Usuario</span>
                <strong>{roleLabels[user.role]}</strong>
              </article>
              <article>
                <span>Local</span>
                <strong>Poseidon</strong>
              </article>
              <article>
                <span>Menu</span>
                <strong>{visibleMenu.length} opciones</strong>
              </article>
              <article>
                <span>Supabase</span>
                <strong>{backendStatus}</strong>
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
