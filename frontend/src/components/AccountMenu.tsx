import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { User } from "../lib/types";
import "./account-menu.css";

export function UserAvatar({ user }: { user: User }) {
  const [failedSrc, setFailedSrc] = useState("");
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span className="sh-avatar">
      {user.avatar_url && failedSrc !== user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={`${name}'s profile`}
          width={36}
          height={36}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(user.avatar_url || "")}
        />
      ) : (
        <span aria-hidden="true">{initials || "CH"}</span>
      )}
    </span>
  );
}

const links = [
  ["/my-account", "My account", "person"],
  ["/my-account?section=learning", "Courses & progress", "grid"],
] as const;

function MenuIcon({ kind }: { kind: string }) {
  const paths: Record<string, string> = {
    person: "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    help: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    logout: "M9 21H4V3h5m6 4 5 5-5 5M8 12h12",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind]} />
    </svg>
  );
}

export function AccountMenu({
  user,
  logout,
  onOpen,
}: {
  user: User;
  logout: () => Promise<void>;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;
  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  async function signOut() {
    setBusy(true);
    await logout();
    navigate("/", { replace: true });
  }
  return (
    <div
      className="sh-account"
      ref={ref}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="sh-account-trigger"
        type="button"
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen((value) => !value);
          onOpen();
        }}
      >
        <UserAvatar user={user} />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={id} className="sh-account-panel" hidden={!open}>
        <div className="sh-account-identity">
          <span className="sh-account-caption">YOUR CODING HUBS ACCOUNT</span>
          <strong>{name}</strong>
          <span title={user.email}>{user.email}</span>
        </div>
        <nav aria-label="Your account">
          <ul>
            {links.map(([to, label, icon]) => (
              <li key={to}>
                <Link to={to} onClick={() => setOpen(false)}>
                  <MenuIcon kind={icon} />
                  {label}
                  <span className="sh-account-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          className="sh-account-logout"
          type="button"
          disabled={busy}
          onClick={signOut}
        >
          <MenuIcon kind="logout" />
          {busy ? "Logging out…" : "Logout"}
        </button>
      </div>
    </div>
  );
}
