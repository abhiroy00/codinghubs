import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HeroVideo } from "../components/HeroVideo";
import { api } from "../lib/api";
import { COURSE_CATALOG } from "../learning/catalog";
import { PREP_SOURCES } from "../learning/prep-content";
import initial from "./summaries.json";
import "../community/public.css";
import "../content-pages/blog.css";

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
      <section aria-labelledby="interview-search">
        <h2 id="interview-search">Find your next topic</h2>
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
            <article className="community-card" key={r.url}>
              <small>
                {r.category} · {r.difficulty} · {r.kind}
              </small>
              <h3>
                <Link to={r.url}>{r.title}</Link>
              </h3>
              <p>{r.summary}</p>
              <Link to={r.url}>Open resource →</Link>
            </article>
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
      </section>
      <section aria-labelledby="existing-roadmaps">
        <h2 id="existing-roadmaps">Subject interview roadmaps</h2>
        <p>
          Existing course questions, lessons and study plans are preserved. Each
          roadmap shows which lessons are available.
        </p>
        <ul className="community-link-list">
          {COURSE_CATALOG.map((c) => (
            <li key={c.slug}>
              <Link to={`/interview/${c.slug}/`}>{c.name}</Link>
              <span>
                {" "}
                ·{" "}
                {PREP_SOURCES[c.slug]?.availableDays
                  ? `${PREP_SOURCES[c.slug].availableDays} available lessons`
                  : "Course study outline"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
