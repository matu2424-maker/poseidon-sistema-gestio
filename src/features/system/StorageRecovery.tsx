import { AlertTriangle, Download, RotateCcw } from "lucide-react";
import { downloadFile } from "../../lib/export";
import { localDate } from "../../lib/dates";

export function StorageRecovery({
  error,
  raw,
  onStartNew,
}: {
  error: string;
  raw: string;
  onStartNew: () => void;
}) {
  const downloadCorruptBackup = () => {
    downloadFile(`poseidon-respaldo-recuperacion-${localDate()}.json`, raw, "application/json;charset=utf-8");
  };

  return (
    <main className="storage-recovery-screen">
      <section className="storage-recovery-panel" aria-labelledby="storage-recovery-title">
        <AlertTriangle size={32} aria-hidden="true" />
        <div>
          <h1 id="storage-recovery-title">Datos locales sin reemplazar</h1>
          <p>Poseidon detecto un almacenamiento que no puede leer. Los datos originales siguen guardados y no fueron sobrescritos.</p>
          <p className="validation error">{error}</p>
        </div>
        <div className="button-row end">
          <button className="button muted" type="button" onClick={downloadCorruptBackup}>
            <Download size={17} aria-hidden="true" />
            Descargar respaldo
          </button>
          <button className="button danger" type="button" onClick={onStartNew}>
            <RotateCcw size={17} aria-hidden="true" />
            Iniciar datos nuevos
          </button>
        </div>
      </section>
    </main>
  );
}
