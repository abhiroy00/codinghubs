import type { ReactNode } from "react";
import { Database } from "lucide-react";

export function Badge({ value }: { value: string }) {
  const type = /blocked|paused|waiting|partial/.test(value)
    ? "amber"
    : /failed|error|P0|P1/.test(value)
      ? "red"
      : /complete|running|applied|reviewed|approved/.test(value)
        ? ""
        : "gray";
  return <span className={`pill ${type}`}>{value.replaceAll("_", " ")}</span>;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Database size={27} />
      <strong>{title}</strong>
      {children}
    </div>
  );
}
export function JsonDetail({
  value,
  label = "Inspect evidence",
}: {
  value: unknown;
  label?: string;
}) {
  return (
    <details>
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
