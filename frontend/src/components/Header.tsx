import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useRegisterPopup } from "../lib/register-popup";
import { useLenisRef } from "../lib/lenis-context";
import { ResourcesMenu } from "../locations/ResourcesMenu";
import { IconSprite } from "../pages/free-session/icons";
import { ScrollProgress } from "./ScrollProgress";
import "./header.css";
import { useOptionalAuth } from "../lib/auth-context";
import { AccountMenu } from "./AccountMenu";
import { CoursesMenu } from "./CoursesMenu";
import "./chrome-colors.css";

const LINKS = [
  ["/interview/", "Interview"],
  ["/our-work", "Our Work"],
  ["/ai-tools", "AI Tools"],
  ["/latest-jobs/", "Jobs"],
] as const;
// Course Brochures, Tutor and Support live in <CoursesMenu />.

/** One primary navigation for marketing pages, accounts and learning workspaces. */
export function Header({ mainId = "main" }: { mainId?: string }) {
  const auth = useOptionalAuth();
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popup = useRegisterPopup();
  const lenisRef = useLenisRef();

  useEffect(() => setOpen(false), [pathname, hash]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (
        headerRef.current?.querySelector(
          '.sh-res-button[aria-expanded="true"], .sh-account-trigger[aria-expanded="true"]',
        )
      )
        return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onOutside = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 1100px)').matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    headerRef.current?.querySelector<HTMLAnchorElement>('.sh-nav a')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = [...(headerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? [])].filter(el => el.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
    };
    const desktop = window.matchMedia('(min-width: 1101px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    document.addEventListener('keydown', trap);
    return () => {document.body.style.overflow = previous;desktop.removeEventListener('change', closeOnDesktop);document.removeEventListener('keydown', trap);};
  }, [open]);

  function bookDemo() {
    setOpen(false);
    popup.open();
  }

  return (
    <>
      <IconSprite />
      <a href={`#${mainId}`} className="sh-skip">
        Skip to content
      </a>
      <ScrollProgress className="site-progress" />
      <header className="site-header" id="hdr" ref={headerRef}>
        <div className="sh-inner">
          <Link
            to="/#home"
            className="sh-brand"
            aria-label="Coding Hubs School of AI home"
            onClick={(event) => {
              setOpen(false);
              if (pathname !== "/") return;
              event.preventDefault();
              if (lenisRef.current) lenisRef.current.scrollTo(0);
              else
                window.scrollTo({
                  top: 0,
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "auto"
                    : "smooth",
                });
            }}
          >
            <picture>
              <source
                srcSet="/assets/coding-hubs-school-of-ai-logo-wide.webp"
                type="image/webp"
              />
              <img
                src="/assets/coding-hubs-school-of-ai-logo-wide.png"
                alt="Coding Hubs School of AI"
                width={720}
                height={208}
              />
            </picture>
          </Link>
          <nav
            className={`sh-nav${open ? " is-open" : ""}`}
            id="nav"
            aria-label="Primary"
            onClick={(event) => {
              if ((event.target as Element).closest("a")) setOpen(false);
            }}
          >
            <a href="/#demo-classes" className="sh-link">
              Free Demo Classes
            </a>
            <CoursesMenu key={`${pathname}${hash}`} />
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} className="sh-link">
                {label}
              </NavLink>
            ))}
            <ResourcesMenu />
            {!auth?.user && !auth?.loading && (
              <Link to="/login" className="sh-link sh-mobile-login">
                Log in <span aria-hidden="true">↗</span>
              </Link>
            )}
          </nav>
          <div className={`sh-actions${auth?.user ? " has-account" : ""}`}>
            {auth?.loading ? (
              <span
                className="sh-account-loading"
                aria-label="Loading account"
              />
            ) : auth?.user ? (
              <AccountMenu
                user={auth.user}
                logout={auth.logout}
                onOpen={() => setOpen(false)}
              />
            ) : (
              <Link to="/login" className="sh-login">
                Log in <span aria-hidden="true">↗</span>
              </Link>
            )}

            <button type="button" className="sh-demo" onClick={bookDemo}>
              Free Demo
            </button>
            <button
              type="button"
              className="sh-toggle"
              ref={toggleRef}
              aria-expanded={open}
              aria-controls="nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
