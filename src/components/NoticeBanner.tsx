export function NoticeBanner({ message, className = "" }: { message: string; className?: string }) {
  if (!message) return null;
  return <div className={["notice", className].filter(Boolean).join(" ")}>{message}</div>;
}
