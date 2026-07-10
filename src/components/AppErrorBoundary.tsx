import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode };
type State = { error?: Error };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Poseidon UI error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="storage-recovery-screen">
        <section className="storage-recovery-panel" role="alert">
          <AlertTriangle size={32} aria-hidden="true" />
          <div>
            <h1>No se pudo mostrar esta pantalla</h1>
            <p>Los datos locales no fueron borrados. Recarga la aplicacion y, si el problema continua, exporta el respaldo desde Datos locales.</p>
            <p className="validation error">{this.state.error.message}</p>
          </div>
          <div className="button-row end">
            <button className="button primary" type="button" onClick={() => window.location.reload()}>
              <RefreshCw size={17} aria-hidden="true" />
              Recargar
            </button>
          </div>
        </section>
      </main>
    );
  }
}
