export function DashboardActionCard({
  title,
  text,
  onClick,
}: {
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <article className="action-card">
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="button primary small" type="button" onClick={onClick}>
        Abrir
      </button>
    </article>
  );
}
