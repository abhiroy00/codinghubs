import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";

const LINKS = [
  ["/brochures/", "Course Brochures"],
  ["/book-a-tutor/", "Tutor"],
  ["/#contact", "Support"],
] as const;

export function CoursesMenu() {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
      className="sh-res sh-courses"
      ref={ref}
      onMouseEnter={() => {
        if (window.matchMedia("(min-width: 1101px) and (hover: hover)").matches)
          setOpen(true);
      }}
      onMouseLeave={() => {
        if (!ref.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <div className="sh-courses-trigger">
        <NavLink to="/courses/" className="sh-link">
          Courses
        </NavLink>
        <button
          type="button"
          className="sh-res-button"
          ref={triggerRef}
          aria-label="Courses menu"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
        >
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
      </div>
      <ul
        className="sh-res-list"
        id={listId}
        hidden={!open}
        onClick={() => setOpen(false)}
      >
        {LINKS.map(([href, label]) => (
          <li key={href}>
            {href.startsWith("/#") ? (
              <a href={href}>{label}</a>
            ) : (
              <Link to={href}>{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
