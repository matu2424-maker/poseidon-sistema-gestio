import { AlertTriangle, Download, RefreshCw, RotateCcw } from "lucide-react";
import { downloadFile } from "../../lib/export";
import { localDate } from "../../lib/dates";

export function StorageRecovery({
  kind,
  error,
  raw,
  onStartNew,
  onReloadStored,
  onRetrySave,
}: {
  kind: "corrupt" | "conflict" | "write";
  error: string;
  raw: string;
  onStartNew: () => void | Promise<void>;
  onReloadStored: () => void | Promise<void>;
  onRetrySave: () => void | Promise<void>;
}) {
  const downloadRecoveryBackup = () => {
    downloadFile(`poseidon-respaldo-recuperacion-${localDate()}.json`, raw, "application/json;charset=utf-8");
  };
  const title = kind === "corrupt" ? "Datos locales sin reemplazar" : kind === "conflict" ? "Cambios de otra pestaña detectados" : "Guardado local interrumpido";
  const description =
    kind === "corrupt"
      ? "Poseidon detecto un almacenamiento que no puede leer. Los datos originales siguen guardados y no fueron sobrescritos."
      : kind === "conflict"
        ? "Otra pestaña guardo una version diferente. Poseidon detuvo esta escritura para no sobrescribirla. Descarga los cambios pendientes antes de cargar la version guardada."
        : "Poseidon no pudo guardar el ultimo cambio y detuvo nuevas escrituras. Descarga el respaldo pendiente antes de reintentar o volver a la ultima version guardada.";

  return (
    <main className="storage-recovery-screen">
      <section className="storage-recovery-panel" role="alert" aria-labelledby="storage-recovery-title">
        <AlertTriangle size={32} aria-hidden="true" />
        <div>
          <h1 id="storage-recovery-title">{title}</h1>
          <p>{description}</p>
          <p className="validation error">{error}</p>
        </div>
        <div className="button-row end">
          <button className="button muted" type="button" onClick={downloadRecoveryBackup} disabled={!raw}>
            <Download size={17} aria-hidden="true" />
            Descargar respaldo pendiente
          </button>
          {kind === "write" ? (
            <button className="button primary" type="button" onClick={onRetrySave}>
              <RefreshCw size={17} aria-hidden="true" />
              Reintentar guardado
            </button>
          ) : null}
          {kind !== "corrupt" ? (
            <button className="button primary" type="button" onClick={onReloadStored}>
              <RotateCcw size={17} aria-hidden="true" />
              Usar version guardada
            </button>
          ) : (
            <button className="button danger" type="button" onClick={onStartNew}>
              <RotateCcw size={17} aria-hidden="true" />
              Iniciar datos nuevos
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
