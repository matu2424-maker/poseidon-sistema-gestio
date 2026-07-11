export function EmptyState({
  title,
  text,
  action,
  actionLabel = "Abrir caja",
}: {
  title: string;
  text: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button className="button primary" type="button" onClick={action}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}
