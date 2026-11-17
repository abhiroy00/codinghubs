import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate, NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "../lib/auth-context";
import { ROOT } from "./api";
import { Brand, Icon, Loading } from "./ui";
import { StudioLanding } from "./Landing";
import { Dashboard, History, Library, Performance } from "./pages";
import { Configure } from "./configure";
import { Roadmaps, Tutor } from "./learning";
import { STUDIO_META, pageSeo } from '../seo/site';
import { useSeo } from '../seo/useSeo';
import "./studio.css";
const Workspace = lazy(() =>
  import("./Workspace").then((m) => ({ default: m.Workspace })),
);
const NAV = [
  ["", "YOUR WORKSPACE", ""],
  ["dashboard", "Overview", "grid"],
  ["coding-interviews", "AI Mock Interviews", "chat"],
  ["practice", "Coding Practice", "code"],
  ["dsa-roadmaps", "DSA Roadmaps", "map"],
  ["company-preparation", "Company Preparation", "building"],
  ["", "THINK IN SYSTEMS", ""],
  ["system-design", "System Design", "design"],
  ["low-level-design", "Low-Level Design", "code"],
  ["ai-tutor", "AI Learning Assistant", "spark"],
  ["", "YOUR PROGRESS", ""],
  ["analytics", "My Performance", "chart"],
  ["coding-interviews/history", "Interview History", "clock"],
  ["profile", "Profile & Settings", "user"],
];
function Shell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <div className="st-shell">
      <aside className={`st-sidebar ${open ? "open" : ""}`}>
        <Brand />
        <button
          className="st-mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="st-navigation"
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav id="st-navigation" aria-label="Interview Studio">
          {NAV.map(([path, label, icon], i) =>
            path ? (
              <NavLink
                key={path}
                to={`${ROOT}/${path}`}
                end={path === "coding-interviews" || path === "dashboard"}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {path === "coding-interviews" && <small>AI</small>}
              </NavLink>
            ) : (
              <p key={i}>{label}</p>
            ),
          )}
        </nav>
        <div className="st-sidebar-bottom">
          <div className="st-sidebar-note">
            <Icon name="spark" />
            <strong>Progress, at your pace.</strong>
            <p>Small, focused sessions add up.</p>
            <Link to={`${ROOT}/dsa-roadmaps`}>Find your path →</Link>
          </div>
          <Link className="st-user" to="/my-account">
            <span className="st-avatar">
              {user?.username?.[0]?.toUpperCase()}
            </span>
            <span>
              <strong>{user?.username}</strong>
              <small>Your learning workspace</small>
            </span>
            <Icon name="user" size={17} />
          </Link>
        </div>
      </aside>
      <div className="st-main">
        <header className="st-topbar">
          <div>
            <Link to="/">Coding Hubs</Link>
            <span>/</span>
            <span>Interview Studio</span>
          </div>
          <div>
            <span className="st-private-label">
              <span className="st-live-dot" /> Personal workspace
            </span>
            <button className="st-link-button" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main id="st-content" className="st-content">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="st-app-footer">
          <span>Built for the way engineers think.</span>
          <Link to={`${ROOT}`}>About Interview Studio ↗</Link>
        </footer>
      </div>
    </div>
  );
}
export function StudioApp() {
  const { pathname } = useLocation();
  const seo = useMemo(() => ({
    ...pageSeo(STUDIO_META),
    ...(pathname.replace(/\/$/, '') === ROOT ? {} : { canonical: '', robots: 'noindex, nofollow', json_ld: null }),
  }), [pathname]);
  useSeo(seo);
  useEffect(() => {
    document.documentElement.classList.add("studio-route");
    return () => {
      document.documentElement.classList.remove("studio-route");
    };
  }, [pathname]);
  return (
    <div className="studio">
      <a className="st-skip" href="#st-content">
        Skip to content
      </a>
      <Routes>
        <Route index element={<StudioLanding />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="coding-interviews" element={<Configure intro />} />
            <Route path="coding-interviews/new" element={<Configure />} />
            <Route path="coding-interviews/history" element={<History />} />
            <Route
              path="coding-interviews/session/:sessionId"
              element={<Workspace />}
            />
            <Route path="practice" element={<Library />} />
            <Route path="problems" element={<Library />} />
            <Route
              path="company-preparation"
              element={<Library companyMode />}
            />
            <Route
              path="system-design"
              element={<Library kind="system-design" />}
            />
            <Route
              path="system-design/interview"
              element={<Configure kind="system-design" />}
            />
            <Route
              path="low-level-design"
              element={<Library kind="low-level-design" />}
            />
            <Route path="dsa-roadmaps" element={<Roadmaps />} />
            <Route path="analytics" element={<Performance />} />
            <Route path="ai-tutor" element={<Tutor />} />
            <Route path="profile" element={<Navigate to="/my-account?section=studio" replace />} />
            <Route
              path="*"
              element={
                <div className="st-empty">
                  <h1>That workspace could not be found.</h1>
                  <Link to={`${ROOT}/dashboard`}>Return to overview</Link>
                </div>
              }
            />
          </Route>
        </Route>
      </Routes>
    </div>
  );
}
