import { useState, type ChangeEvent } from "react";
import { Download, FileUp, RotateCcw } from "lucide-react";
import { confirmAction } from "../../lib/confirmations";

export function LocalDataMaintenance({
  onExport,
  onImport,
  onReset,
}: {
  onExport: () => void;
  onImport: (raw: string) => Promise<string>;
  onReset: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File>();
  const [error, setError] = useState("");

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0]);
    setError("");
  };

  const importBackup = async () => {
    if (!selectedFile) {
      setError("Selecciona un respaldo JSON de Poseidon.");
      return;
    }
    if (!confirmAction("Importar este respaldo? Los datos locales actuales seran reemplazados despues de validar el archivo.")) return;
    const result = await onImport(await selectedFile.text());
    setError(result);
  };

  return (
    <section className="admin-focus local-data-maintenance">
      <div className="admin-header">
        <div>
          <p>Respaldo y recuperacion del almacenamiento de este navegador.</p>
        </div>
      </div>

      <div className="detail-card-surface local-data-grid">
        <section>
          <h2>Exportar respaldo</h2>
          <p>Genera un JSON versionado con operaciones, auditoria e historiales. Las imagenes y comprobantes se mantienen como metadatos.</p>
          <button className="button primary" type="button" onClick={onExport}>
            <Download size={17} aria-hidden="true" />
            Exportar JSON
          </button>
        </section>

        <section>
          <h2>Importar respaldo</h2>
          <p>El archivo se valida antes de reemplazar los datos actuales. Las versiones futuras o archivos corruptos son rechazados.</p>
          <label>
            Archivo JSON
            <input type="file" accept="application/json,.json" onChange={selectFile} />
          </label>
          {selectedFile && <p className="helper">Seleccionado: {selectedFile.name}</p>}
          {error && <p className="validation error">{error}</p>}
          <button className="button muted" type="button" onClick={importBackup}>
            <FileUp size={17} aria-hidden="true" />
            Validar e importar
          </button>
        </section>

        <section className="local-data-reset">
          <div>
            <h2>Crear base operativa limpia</h2>
            <p>Conserva Poseidon, usuarios, personal, clientes, categorias y maquinas. Reinicia operaciones, contadores y saldos despues de descargar un respaldo.</p>
          </div>
          <button className="button danger" type="button" onClick={onReset}>
            <RotateCcw size={17} aria-hidden="true" />
            Respaldar y reiniciar
          </button>
        </section>
      </div>
    </section>
  );
}
