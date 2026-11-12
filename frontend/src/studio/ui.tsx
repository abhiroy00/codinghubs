import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ROOT } from "./api";

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    code: (
      <>
        <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
      </>
    ),
    chat: (
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.8-5A9 9 0 0 1 3 11.5a9 9 0 0 1 18 0Z" />
    ),
    map: (
      <>
        <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16" />
      </>
    ),
    building: (
      <>
        <path d="M5 21V3h14v18M2 21h20M9 7h1m4 0h1M9 11h1m4 0h1m-5 4v6h4v-6Z" />
      </>
    ),
    design: (
      <>
        <rect x="8" y="2" width="8" height="5" rx="1" />
        <rect x="2" y="17" width="7" height="5" rx="1" />
        <rect x="15" y="17" width="7" height="5" rx="1" />
        <path d="M12 7v5H5v5m7-5h7v5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M9 16v-4m5 4V7m5 9v-6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 22v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    spark: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4" />
      </>
    ),
    check: <path d="m5 12 4 4L20 5" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.code}
    </svg>
  );
}
export function Brand() {
  return (
    <Link to={ROOT} className="st-brand" aria-label="Coding Hubs School of AI — Interview Studio">
      <span className="st-brand-pill">
        <picture>
          <source srcSet="/assets/coding-hubs-school-of-ai-logo-wide.webp" type="image/webp" />
          <img
            className="st-brand-logo"
            src="/assets/coding-hubs-school-of-ai-logo-wide.png"
            alt="Coding Hubs School of AI"
            width={720}
            height={208}
          />
        </picture>
      </span>
    </Link>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="st-page-title">
      <div>
        <p className="st-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="st-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link to={to} className={`st-button ${secondary ? "secondary" : ""}`}>
      {children}
      <Icon name="arrow" size={17} />
    </Link>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`st-notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="st-loading" role="status">
      <div />
      <div />
      <div />
      <span>Loading your workspace…</span>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="st-empty">
      <span className="st-icon-tile">
        <Icon name="map" size={26} />
      </span>
      <h3>{title}</h3>
      <div className="st-muted">{children}</div>
    </div>
  );
}
export function Difficulty({ value }: { value: string }) {
  return <span className={`st-difficulty ${value}`}>{value}</span>;
}
export function DateLabel({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
    </time>
  );
}
