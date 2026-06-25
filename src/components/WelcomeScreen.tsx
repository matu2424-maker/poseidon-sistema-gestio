import { LogIn } from "lucide-react";

type WelcomeScreenProps = {
  onEnter: () => void;
};

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  return (
    <main className="welcome-page">
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="brand-mark large" aria-hidden="true">
          P
        </div>
        <div className="welcome-copy">
          <p className="eyebrow">Poseidon</p>
          <h1 id="welcome-title">Sistema de Gestion</h1>
          <p className="welcome-description">Gestion operativa preparada para ventas, caja, inventario y reportes.</p>
        </div>
        <button className="primary-button" type="button" onClick={onEnter}>
          <LogIn size={18} aria-hidden="true" />
          Ingresar
        </button>
      </section>
    </main>
  );
}
