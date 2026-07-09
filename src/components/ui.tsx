import type { ReactNode } from "react";

export type TableColumn<Key extends string> = {
  key: Key;
  label: string;
  sortable?: boolean;
};

export function InfoCard({
  title,
  lines,
  tone,
  action,
  variant,
}: {
  title: string;
  lines: string[];
  tone: "blue" | "green" | "orange" | "red";
  action?: { label: string; onClick: () => void };
  variant?: "cash";
}) {
  const renderLine = (line: string) => {
    if (line === "-----") return <p key={line} className="info-separator" />;
    if (line.startsWith("# ")) return <p key={line} className="info-section-label">{line.replace("# ", "")}</p>;
    if (line.startsWith("*") && line.includes(":")) {
      const cleanLine = line.slice(1);
      const [label, ...rest] = cleanLine.split(":");
      return (
        <p key={line} className="info-row info-row-total">
          <span>{label}</span>
          <strong>{rest.join(":").trim()}</strong>
        </p>
      );
    }
    if (variant === "cash" && line.includes(":")) {
      const [label, ...rest] = line.split(":");
      return (
        <p key={line} className="info-row">
          <span>{label}</span>
          <strong>{rest.join(":").trim()}</strong>
        </p>
      );
    }
    return <p key={line}>{line}</p>;
  };

  return (
    <article className={`info-card ${tone}`}>
      <h3>{title}</h3>
      {lines.map(renderLine)}
      {action && (
        <button className="button primary compact info-card-action" type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </article>
  );
}

export function FormButtons() {
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

export function Modal({
  title,
  children,
  onClose,
  closeLabel = "Cerrar",
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={wide ? "modal-card wide" : "modal-card"} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="button muted compact" type="button" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ColumnChooser<Key extends string>({
  label,
  columns,
  visible,
  fixed,
  onToggle,
}: {
  label: string;
  columns: TableColumn<Key>[];
  visible: Key[];
  fixed: Key[];
  onToggle: (key: Key) => void;
}) {
  return (
    <details className="column-menu">
      <summary>{label}</summary>
      <div className="column-chooser" aria-label="Columnas visibles">
        {columns.map((column) => (
          <label key={column.key}>
            <input type="checkbox" checked={visible.includes(column.key)} disabled={fixed.includes(column.key)} onChange={() => onToggle(column.key)} />
            {column.label}
            {fixed.includes(column.key) && <span>fijo</span>}
          </label>
        ))}
      </div>
    </details>
  );
}
