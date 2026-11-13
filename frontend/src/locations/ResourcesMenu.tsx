import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { INSTITUTE, WHATSAPP } from "../pages/free-session/data";
import { useRegisterPopup } from "../lib/register-popup";

// The backend owns the launch gate; one availability request per app session.
let gigsStatus: Promise<boolean> | undefined;
const pilotEnabled = () =>
  (gigsStatus ??= api
    .get("/gigs/status/")
    .then((r) => r.data.enabled === true)
    .catch(() => false));

const EXPLORE = [
  ["/locations/", "Locations"],
  ["/blog", "Blog"],
  ["/case-studies", "Case Studies"],
  ["/projects", "Projects"],
  ["/learn/", "Learning Library"],
  ["/visual-lab/", "Visual Lab"],
  ["/faq", "FAQ"],
  ["/interview-studio", "Interview Studio"],
  ["/#session", "About the Session"],
] as const;

const COURSES = [
  ["/courses/", "All Courses"],
  ["/book-a-tutor/", "Book a Tutor"],
  ["/latest-jobs/", "Latest Jobs"],
] as const;

/** A keyboard-accessible disclosure shared by desktop and mobile primary navigation. */
export function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const [gigsEnabled, setGigsEnabled] = useState(false);
  const { pathname, hash } = useLocation();
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popup = useRegisterPopup();
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

  const waHref = `https://wa.me/${WHATSAPP.number}`;

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
        <li className="res-col">
          <h3 className="res-col-title">Explore</h3>
          <ul className="res-col-links">
            {EXPLORE.map(([href, label]) => (
              <li key={href}>
                {href.startsWith('/#') ? (
                  <a href={href}>{label}</a>
                ) : (
                  <Link to={href}>{label}</Link>
                )}
              </li>
            ))}
          </ul>
        </li>
        <li className="res-col">
          <h3 className="res-col-title">Quick links</h3>
          <ul className="res-col-links">
            {COURSES.map(([href, label]) => (
              <li key={href}>
                <Link to={href}>{label}</Link>
              </li>
            ))}
            {gigsEnabled && (
              <li><Link to="/gigs">Gigs pilot</Link></li>
            )}
          </ul>
        </li>
        <li className="res-contact">
          <h3 className="res-col-title">Get in touch</h3>
          <ul className="res-contact-links">
            <li>
              <a href={`tel:+${WHATSAPP.number}`}>{INSTITUTE.phone}</a>
              <span>· Mon – Sat, 9 AM – 7 PM</span>
            </li>
            <li>
              <a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a>
            </li>
            <li>
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  );
}
