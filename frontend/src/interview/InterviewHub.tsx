import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HeroVideo } from "../components/HeroVideo";
import { api } from "../lib/api";
import { COURSE_CATALOG } from "../learning/catalog";
import { PREP_SOURCES } from "../learning/prep-content";
import initial from "./summaries.json";
import "../community/public.css";
import "../content-pages/blog.css";
import "./interview-hub.css";
import type { CourseTrack } from "../learning/catalog";
import { AnimatedCard, Reveal, Section } from '../components/ui'

type Resource = {
  url: string;
  title: string;
  category: string;
  difficulty: string;
  summary: string;
  kind: string;
};
type Results = {
  count: number;
  results: Resource[];
  categories: string[];
  difficulties: string[];
};
/** Roles group the existing subject roadmaps by the course track they already belong to. */
const ROLES: { id: string; label: string; tracks: CourseTrack[] }[] = [
  { id: "ai", label: "AI & GenAI engineer", tracks: ["ai"] },
  { id: "developer", label: "Software developer", tracks: ["development"] },
  { id: "data", label: "Data analyst & scientist", tracks: ["data"] },
  { id: "cloud", label: "Cloud & DevOps engineer", tracks: ["cloud"] },
  { id: "security", label: "Security analyst", tracks: ["security"] },
  { id: "design", label: "Design & marketing", tracks: ["design", "marketing"] },
  { id: "programs", label: "Internships & projects", tracks: ["program"] },
];
const PRACTICE = [
  { title: "Mock coding interview", detail: "Timed problems with a code editor and feedback in Interview Studio.", href: "/interview-studio/coding-interviews/new" },
  { title: "Practice problem library", detail: "Browse problems by topic and difficulty, then solve them at your own pace.", href: "/interview-studio/practice" },
  { title: "System design practice", detail: "Work through design prompts and explain your trade-offs.", href: "/interview-studio/system-design" },
];
const lessons = (slug: string) => PREP_SOURCES[slug]?.availableDays;

function RoleRoadmaps() {
  const [role, setRole] = useState("");
  const groups = ROLES.map((r) => ({ ...r, courses: COURSE_CATALOG.filter((c) => r.tracks.includes(c.track)) }))
    .filter((g) => g.courses.length && (!role || g.id === role));
  return (
    <Section className="ih-section" titleId="existing-roadmaps" align="left" badge="Roadmaps" title="Roadmaps by role" subtitle="Pick the role you are preparing for. Each roadmap is a 30-day plan with lessons, questions and practice; lesson counts show what is published today.">
      <div className="ih-chips" role="group" aria-label="Filter roadmaps by role">
        <button type="button" aria-pressed={!role} onClick={() => setRole("")}>All roles</button>
        {ROLES.map((r) => (
          <button key={r.id} type="button" aria-pressed={role === r.id} onClick={() => setRole(r.id)}>{r.label}</button>
        ))}
      </div>
      <Reveal stagger className="ih-roles" key={role || "all"}>
        {groups.map((g) => (
          <AnimatedCard bare className="ih-role" key={g.id} aria-labelledby={`role-${g.id}`}>
            <header>
              <h3 id={`role-${g.id}`}>{g.label}</h3>
              <p>Common roles: {g.courses[0].careers.slice(0, 3).join(", ")}</p>
            </header>
            <ul>
              {g.courses.map((c) => (
                <li key={c.slug}>
                  <Link to={`/interview/${c.slug}/`}>{c.name}</Link>
                  <span className={lessons(c.slug) ? "ih-count" : "ih-count ih-outline"}>
                    {lessons(c.slug) ? `${lessons(c.slug)} lessons` : "Study outline"}
                  </span>
                </li>
              ))}
            </ul>
          </AnimatedCard>
        ))}
      </Reveal>
    </Section>
  );
}

const INITIAL: Results = {
  count: initial.length,
  results: initial,
  categories: [...new Set(initial.map((g) => g.category))],
  difficulties: ["Beginner", "Intermediate", "Advanced"],
};
export function InterviewHub() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const difficulty = params.get("difficulty") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [text, setText] = useState(q);
  const [data, setData] = useState<Results>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    if (text === q) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (text) next.set("q", text); else next.delete("q");
      next.delete("page");
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [text, q, params, setParams]);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    api
      .get<Results>("/interview/resources/", {
        params: { q, category, difficulty, page },
      })
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active)
          setError(
            "Search is temporarily unavailable. You can still open the topic guides and course roadmaps below.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [q, category, difficulty, page, retry]);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key,value); else next.delete(key);
    next.delete("page");
    setParams(next);
  }
  return (
    <div className="community">
      <section className="bl-hero hv-host">
        <HeroVideo clip="interview-prep" />
        <div className="bl-hero-in">
          <p className="bl-eyebrow">Understand · Practice · Explain</p>
          <h1>
            Your next <span>Interview</span>
          </h1>
          <p className="bl-lead">
            Build sound fundamentals, work through real examples and explain
            your decisions. Read topic guides or continue an existing subject
            roadmap.
          </p>
        </div>
      </section>
      <Section className="ih-section ih-practice" titleId="ih-practice" align="left" badge="Interview Studio" title="Practise like the real interview" subtitle="Read a guide, then rehearse. Interview Studio sessions are saved to your account, so you will be asked to log in.">
        <Reveal as="ul" stagger className="ih-practice-grid">
          {PRACTICE.map((p, i) => (
            <li key={p.href}>
              <AnimatedCard bare as={Link} to={p.href} className={i === 0 ? "ih-practice-card is-primary" : "ih-practice-card"}>
                <strong>{p.title}</strong>
                <span>{p.detail}</span>
                <span className="ih-go" aria-hidden="true">→</span>
              </AnimatedCard>
            </li>
          ))}
        </Reveal>
        <p className="ih-studio-link"><Link to="/interview-studio">What is Interview Studio?</Link></p>
      </Section>
      <RoleRoadmaps />
      <Section className="ih-section" titleId="interview-search" align="left" badge="Topic guides" title="Topic guides" subtitle="Search focused guides by topic and difficulty.">
        <div className="community-filters">
          <label>
            Search topics, questions and explanations
            <input
              type="search"
              value={text}
              maxLength={200}
              onChange={(e) => setText(e.target.value)}
              placeholder="Try indexes, promises or cache invalidation"
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => filter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {data.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => filter("difficulty", e.target.value)}
            >
              <option value="">All difficulties</option>
              {data.difficulties.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
        </div>
        {busy && <p role="status">Searching interview resources…</p>}
        {error && (
          <p role="alert" className="community-error">
            {error}{" "}
            <button onClick={() => setRetry((x) => x + 1)}>Retry search</button>
          </p>
        )}
        {!busy && !error && data.count === 0 && (
          <p>
            No resources match these filters.{" "}
            <button
              onClick={() => {
                setText("");
                setParams({});
              }}
            >
              Clear filters
            </button>
          </p>
        )}
        <div className="community-grid" aria-busy={busy}>
          {data.results.map((r) => (
            <AnimatedCard bare className="community-card" key={r.url}>
              <p className="ih-tags">
                <span>{r.category}</span>
                <span className={`ih-level ih-${r.difficulty.toLowerCase()}`}>{r.difficulty}</span>
              </p>
              <h3>
                <Link to={r.url}>{r.title}</Link>
              </h3>
              <p>{r.summary}</p>
              <Link to={r.url}>Open resource →</Link>
            </AnimatedCard>
          ))}
        </div>
        {!error && data.count > 24 && (
          <nav
            className="community-pager"
            aria-label="Interview resource pages"
          >
            <button
              disabled={page === 1}
              onClick={() => {
                const n = new URLSearchParams(params);
                n.set("page", String(page - 1));
                setParams(n);
              }}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              disabled={page * 24 >= data.count}
              onClick={() => {
                const n = new URLSearchParams(params);
                n.set("page", String(page + 1));
                setParams(n);
              }}
            >
              Next
            </button>
          </nav>
        )}
      </Section>
    </div>
  );
}
