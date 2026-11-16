import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";

// The backend owns the launch gate; one availability request per app session.
let gigsStatus: Promise<boolean> | undefined;
const pilotEnabled = () =>
  (gigsStatus ??= api
    .get("/gigs/status/")
    .then((r) => r.data.enabled === true)
    .catch(() => false));

const LINKS = [
  ["/locations/", "Locations"],
  ["/blog", "Blog"],
  ["/case-studies", "Case Studies"],
  ["/projects", "Projects"],
  ["/book-a-tutor/", "Tutor"],
  ["/#session", "About the Session"],
  [ "/#contact", "Support"],
] as const;

/** A keyboard-accessible disclosure shared by desktop and mobile primary navigation. */
export function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const [gigsEnabled, setGigsEnabled] = useState(false);
  const { pathname, hash } = useLocation();
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    pilotEnabled().then((value) => {
      if (active) setGigsEnabled(value);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setOpen(false);
        triggerRef.current?.focus();
      } else if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div
      className="sh-res"
      ref={ref}
      onMouseEnter={() => {
        if (window.matchMedia("(hover:hover)").matches) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!ref.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        type="button"
        className="sh-res-button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() =>
          setOpen((value) =>
            window.matchMedia("(hover:hover)").matches && value ? true : !value,
          )
        }
      >
        Resources
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul
        className="sh-res-list"
        id={listId}
        hidden={!open}
        onClick={() => setOpen(false)}
      >
        {LINKS.map(([href, label]) => (
          <li key={href}>
            {href.startsWith('/#') ? (
              <a href={href}>{label}</a>
            ) : (
              <Link to={href}>{label}</Link>
            )}
          </li>
        ))}
        {gigsEnabled && (
          <li>
            <Link to="/gigs">Gigs pilot</Link>
          </li>
        )}
      </ul>
    </div>
  );
}
