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
import { CareersMenu } from "./CareersMenu";
import { DESKTOP_NAV_QUERY, MOBILE_NAV_QUERY } from "./HeaderDropdown";
import "./chrome-colors.css";
import { BRAND_LOGO_SRCSET } from '../lib/brand-images';

type Menu = 'Courses' | 'Careers' | 'Resources';

/** One primary navigation for marketing pages, accounts and learning workspaces. */
export function Header({ mainId = "main" }: { mainId?: string }) {
  const auth = useOptionalAuth();
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState<Menu | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popup = useRegisterPopup();
  const lenisRef = useLenisRef();

  useEffect(() => { setOpen(false); setDropdown(null); }, [pathname, hash]);

  function changeDropdown(menu: Menu, expanded: boolean) {
    setDropdown(current => expanded ? menu : current === menu ? null : current);
  }

  useEffect(() => {
    if (!open && !dropdown) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (dropdown) {
        setDropdown(null);
        headerRef.current?.querySelector<HTMLButtonElement>(`[data-header-dropdown="${dropdown}"] > button`)?.focus();
        return;
      }
      if (
        headerRef.current?.querySelector(
          '.sh-account-trigger[aria-expanded="true"]',
        )
      )
        return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) { setOpen(false); setDropdown(null); }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open, dropdown]);

  useEffect(() => {
    if (!open || !window.matchMedia(MOBILE_NAV_QUERY).matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const lenis = lenisRef.current;
    lenis?.stop();
    headerRef.current?.querySelector<HTMLElement>('.sh-nav button, .sh-nav a')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = [...(headerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? [])].filter(el => el.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
    };
    const desktop = window.matchMedia(DESKTOP_NAV_QUERY);
    const closeOnDesktop = () => { if (desktop.matches) { setOpen(false); setDropdown(null); } };
    desktop.addEventListener('change', closeOnDesktop);
    document.addEventListener('keydown', trap);
    return () => {
      if (!document.querySelector('[role="dialog"][aria-modal="true"]')) { document.body.style.overflow = previous; lenis?.start(); }
      desktop.removeEventListener('change', closeOnDesktop);
      document.removeEventListener('keydown', trap);
    };
  }, [open, lenisRef]);

  function bookDemo() {
    setOpen(false);
    setDropdown(null);
    requestAnimationFrame(() => popup.open());
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
              setDropdown(null);
              if (pathname !== "/" || hash !== "#home") return;
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
                srcSet={BRAND_LOGO_SRCSET}
                sizes="(max-width: 380px) 100px, (max-width: 760px) 132px, (max-width: 1250px) 140px, 156px"
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
            data-lenis-prevent
            onClick={(event) => {
              if ((event.target as Element).closest("a")) { setOpen(false); setDropdown(null); }
            }}
          >
            <CoursesMenu open={dropdown === 'Courses'} onOpenChange={expanded => changeDropdown('Courses', expanded)} />
            <Link to="/#demo-classes" className="sh-link">Demo Videos</Link>
            <NavLink to="/our-work" className="sh-link">Projects</NavLink>
            <CareersMenu open={dropdown === 'Careers'} onOpenChange={expanded => changeDropdown('Careers', expanded)} />
            <ResourcesMenu open={dropdown === 'Resources'} onOpenChange={expanded => changeDropdown('Resources', expanded)} />
            <div className="sh-mobile-utility" aria-label="Support and locations">
              <Link to="/#contact" className="sh-link">Support</Link>
              <Link to="/locations/" className="sh-link">Locations</Link>
              {!auth?.user && !auth?.loading && <Link to="/login" className="sh-link sh-mobile-login">
                Log in <span aria-hidden="true">↗</span>
              </Link>}
            </div>
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
                onOpen={() => { setOpen(false); setDropdown(null); }}
                closeForNavigation={dropdown !== null}
              />
            ) : null}

            <button type="button" className="sh-demo" onClick={bookDemo}>
              Book Free Demo
            </button>
            <button
              type="button"
              className="sh-toggle"
              ref={toggleRef}
              aria-expanded={open}
              aria-controls="nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => { setOpen(value => !value); setDropdown(null); }}
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
