import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import {
  ROOT,
  errorMessage,
  studioApi,
  useResource,
  type Analytics,
  type Catalog,
  type LearningRecord,
  type Problem,
  type StudioSession,
} from "./api";
import {
  ButtonLink,
  DateLabel,
  Difficulty,
  Empty,
  Icon,
  Loading,
  Notice,
  PageTitle,
} from "./ui";

const nice = (s: string) => s.replaceAll("-", " ").replaceAll("_", " ");
export function Dashboard() {
  const { user } = useAuth();
  const metrics = useResource<Analytics>("/analytics/");
  const sessions = useResource<StudioSession[]>("/sessions/");
  const catalog = useResource<Catalog>("/catalog/");
  const active = sessions.data?.find(
    (s) => s.status === "active" && new Date(s.deadline) > new Date(),
  );
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE PRACTICE. A LITTLE MORE CONFIDENCE."
        title={`Welcome${user?.username ? `, ${user.username}` : " back"}.`}
        description="Your next chapter starts with what you practice today."
        action={
          <ButtonLink to={`${ROOT}/coding-interviews/new`}>
            New mock interview
          </ButtonLink>
        }
      />
      {(metrics.error || sessions.error) && (
        <Notice error>
          {metrics.error || sessions.error}{" "}
          <button
            onClick={() => {
              void metrics.reload();
              void sessions.reload();
            }}
          >
            Retry
          </button>
        </Notice>
      )}
      <div className="st-stat-grid">
        {[
          ["chat", "Interviews completed", metrics.data?.completed],
          [
            "chart",
            "Average interview score",
            metrics.data?.average_score == null
              ? "—"
              : `${Math.round(metrics.data.average_score)}/100`,
          ],
          ["code", "Problems solved", metrics.data?.problems_solved],
          ["map", "Problems attempted", metrics.data?.problems_attempted],
        ].map(([icon, label, value]) => (
          <div className="st-stat" key={String(label)}>
            <span className="st-stat-label">
              <Icon name={String(icon)} size={17} />
              {label}
            </span>
            <strong>{metrics.loading ? "…" : (value ?? 0)}</strong>
            <small>
              {value === "—"
                ? "Complete an interview to see your score"
                : "From your saved activity"}
            </small>
          </div>
        ))}
      </div>
      <div className="st-dashboard-grid">
        <div>
          <section className="st-focus-card">
            <div>
              <span className="st-eyebrow">
                {active ? "PICK UP YOUR THREAD" : "A GOOD PLACE TO BEGIN"}
              </span>
              <h2>
                {active ? (
                  active.problem.title
                ) : (
                  <>
                    Make your thinking
                    <br />
                    part of the conversation.
                  </>
                )}
              </h2>
              <p>
                {active
                  ? "Your code, conversation and timer are saved. Return to your session and keep going."
                  : "Choose an interviewer, work through an original problem, and get a clearer picture of your strengths."}
              </p>
              <ButtonLink
                to={
                  active
                    ? `${ROOT}/coding-interviews/session/${active.id}`
                    : `${ROOT}/coding-interviews/new`
                }
              >
                {active ? "Resume interview" : "Set up an interview"}
              </ButtonLink>
            </div>
            <div className="st-focus-art" aria-hidden="true">
              <div>
                <Icon name="chat" size={34} />
              </div>
              <span className="st-art-bracket">{"{ }"}</span>
              <span className="st-art-note">clarify → reason → build</span>
            </div>
          </section>
          <div className="st-section-heading">
            <h2>Your practice toolkit</h2>
            <span>ONE SKILL AT A TIME</span>
          </div>
          <div className="st-tool-grid">
            {[
              [
                "practice",
                "code",
                "Coding practice",
                "Find the pattern behind the problem.",
              ],
              [
                "system-design",
                "design",
                "System design",
                "Build a system you can explain.",
              ],
              [
                "dsa-roadmaps",
                "map",
                "Your learning path",
                "A steady route to stronger fundamentals.",
              ],
              [
                "ai-tutor",
                "spark",
                "Learning assistant",
                "Work through the why, together.",
              ],
            ].map(([path, icon, title, desc]) => (
              <Link key={path} to={`${ROOT}/${path}`} className="st-tool-card">
                <span className="st-icon-tile">
                  <Icon name={icon} />
                </span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <span className="st-card-arrow">↗</span>
              </Link>
            ))}
          </div>
        </div>
        <aside className="st-dashboard-aside">
          <section className="st-card">
            <div className="st-card-head">
              <h2>Practice with intention</h2>
              <Icon name="spark" />
            </div>
            <p className="st-muted">A small habit for your next session</p>
            <div className="st-tip">
              <span>01</span>
              <h3>Say your assumptions out loud.</h3>
              <p>
                Before you code, explain what the input guarantees and what you
                still need to clarify.
              </p>
            </div>
            <Link className="st-text-link" to={`${ROOT}/coding-interviews/new`}>
              Put it into practice <Icon name="arrow" size={16} />
            </Link>
          </section>
          <section className="st-card st-library-note">
            <p className="st-eyebrow">INDEPENDENTLY AUTHORED</p>
            <h3>A library built for learning.</h3>
            <p>
              {catalog.data
                ? `${catalog.data.problem_count} coding exercises with original examples, graduated hints and private verification tests.`
                : "Explore original problems and practical design scenarios."}
            </p>
            <Link to={`${ROOT}/practice`}>Browse the library ↗</Link>
          </section>
        </aside>
      </div>
      <section className="st-card st-recent">
        <div className="st-card-head">
          <h2>Recent sessions</h2>
          <Link to={`${ROOT}/coding-interviews/history`}>View history ↗</Link>
        </div>
        {sessions.loading ? (
          <Loading />
        ) : sessions.data?.length ? (
          <SessionTable sessions={sessions.data.slice(0, 4)} />
        ) : (
          <Empty title="Your first session is a fresh start.">
            <p>Every conversation and code draft will be saved here.</p>
            <Link to={`${ROOT}/coding-interviews/new`}>
              Start your first interview →
            </Link>
          </Empty>
        )}
      </section>
    </>
  );
}
export function SessionTable({ sessions }: { sessions: StudioSession[] }) {
  return (
    <div className="st-table-scroll">
      <table>
        <thead>
          <tr>
            <th>Problem / scenario</th>
            <th>Date</th>
            <th>Difficulty</th>
            <th>Status</th>
            <th>Score</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{s.problem.title}</strong>
                <small>
                  {nice(s.problem.kind)} · {s.configuration.persona} ·{" "}
                  {s.configuration.duration} min
                </small>
              </td>
              <td>
                <DateLabel value={s.started_at} />
              </td>
              <td>
                <Difficulty value={s.problem.difficulty} />
              </td>
              <td>
                <span className="st-pill">
                  {s.status === "active" && new Date(s.deadline) < new Date()
                    ? "time ended"
                    : s.status}
                </span>
              </td>
              <td>{s.score == null ? "—" : `${s.score}/100`}</td>
              <td>
                <Link to={`${ROOT}/coding-interviews/session/${s.id}`}>
                  {s.status === "completed" ? "Review" : "Open"} ↗
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function History() {
  const { data, error, loading, reload } =
    useResource<StudioSession[]>("/sessions/");
  const [filter, setFilter] = useState("all");
  const sessions =
    data?.filter((s) => filter === "all" || s.status === filter) || [];
  return (
    <>
      <PageTitle
        eyebrow="YOUR PROGRESS"
        title="Every attempt counts."
        description="Revisit the reasoning, the code, and what you learned."
        action={
          <ButtonLink to={`${ROOT}/coding-interviews/new`}>
            New interview
          </ButtonLink>
        }
      />
      <div className="st-toolbar">
        <label>
          Status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All sessions</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>
      {error && (
        <Notice error>
          {error}
          <button onClick={() => void reload()}>Retry</button>
        </Notice>
      )}
      {loading ? (
        <Loading />
      ) : (
        <section className="st-card">
          {sessions.length ? (
            <SessionTable sessions={sessions} />
          ) : (
            <Empty title="No sessions here yet.">
              <p>
                Your saved interviews and practice attempts will appear here.
              </p>
            </Empty>
          )}
        </section>
      )}
    </>
  );
}
export function Library({
  kind = "coding",
  companyMode = false,
}: {
  kind?: string;
  companyMode?: boolean;
}) {
  const [query] = useSearchParams();
  const [search, setSearch] = useState(""),
    [difficulty, setDifficulty] = useState(""),
    [topic, setTopic] = useState(query.get("topic") || ""),
    [company, setCompany] = useState("");
  const catalog = useResource<Catalog>("/catalog/");
  const params = new URLSearchParams({
    kind,
    q: search,
    difficulty,
    topic,
    company,
  });
  const problems = useResource<Problem[]>(`/problems/?${params}`);
  const navigate = useNavigate();
  const heading = companyMode
    ? "Prepare with a direction."
    : kind === "system-design"
      ? "Think beyond a single service."
      : kind === "low-level-design"
        ? "Design for the next change."
        : "Find the pattern. Build the habit.";
  function open(p: Problem) {
    navigate(
      `${ROOT}/coding-interviews/new?problem=${p.id}&kind=${p.kind}&mode=practice${company ? `&company=${encodeURIComponent(company)}` : ""}`,
    );
  }
  return (
    <>
      <PageTitle
        eyebrow={
          companyMode
            ? "COMPANY-STYLE PRACTICE"
            : nice(kind).toUpperCase() + " LIBRARY"
        }
        title={heading}
        description={
          companyMode
            ? "Independently authored practice, organized around your target role and company category."
            : kind === "coding"
              ? "Original exercises. Clear constraints. A little more fluency with every attempt."
              : "Clarify requirements, draw your model, and explain the trade-offs."
        }
      />
      {companyMode && (
        <Notice>
          Company names are organizational categories, not endorsements. These
          exercises are not claimed to be questions asked by those companies.
          Role and experience can be selected when you start.
        </Notice>
      )}
      <div className="st-toolbar">
        <label className="st-search">
          Search problems
          <input
            aria-label="Search problems"
            type="search"
            placeholder="Find your next challenge…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">All difficulties</option>
            {["easy", "medium", "hard"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {catalog.data?.topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {companyMode && (
          <label>
            Company category
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            >
              <option value="">All categories</option>
              {catalog.data?.companies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {problems.error && (
        <Notice error>
          {problems.error}
          <button onClick={() => void problems.reload()}>Retry</button>
        </Notice>
      )}
      {problems.loading ? (
        <Loading />
      ) : problems.data?.length ? (
        <div className="st-problem-grid">
          {problems.data.map((p, i) => (
            <article className="st-problem-card" key={p.id}>
              <div className="st-problem-top">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Difficulty value={p.difficulty} />
              </div>
              <h2>{p.title}</h2>
              <p>{p.description.split("\n")[0]}</p>
              <div className="st-tags">
                {p.topics.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <button className="st-link-button" onClick={() => open(p)}>
                Open {kind === "coding" ? "problem" : "design workspace"}{" "}
                <Icon name="arrow" size={17} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No matching problems.">
          <p>Try a different topic, difficulty or search term.</p>
          <button
            onClick={() => {
              setSearch("");
              setDifficulty("");
              setTopic("");
              setCompany("");
            }}
          >
            Clear filters
          </button>
        </Empty>
      )}
    </>
  );
}
export function Performance() {
  const [days, setDays] = useState("30");
  const metrics = useResource<Analytics>(`/analytics/?days=${days}`);
  return (
    <>
      <PageTitle
        eyebrow="MY PERFORMANCE"
        title="A clearer picture of progress."
        description="Measured from your saved sessions and automated submissions."
      />
      <div className="st-toolbar">
        <label>
          Time range
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            {[
              ["7", "Last 7 days"],
              ["30", "Last 30 days"],
              ["90", "Last 90 days"],
              ["", "All time"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      {metrics.error && <Notice error>{metrics.error}</Notice>}
      {metrics.loading ? (
        <Loading />
      ) : (
        metrics.data && (
          <>
            <div className="st-stat-grid">
              {[
                ["Interview attempts", metrics.data.total_interviews],
                ["Completed sessions", metrics.data.completed],
                ["Problems solved", metrics.data.problems_solved],
                [
                  "Problem accuracy",
                  metrics.data.accuracy == null
                    ? "—"
                    : `${metrics.data.accuracy}%`,
                ],
              ].map(([t, v]) => (
                <div className="st-stat" key={t}>
                  <span>{t}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <div className="st-two-column">
              <section className="st-card">
                <h2>Reasoning dimensions</h2>
                <p className="st-muted">
                  AI-assessed ratings, on a 1–4 scale. Educational feedback, not
                  a hiring prediction.
                </p>
                <div className="st-bars">
                  {Object.entries(metrics.data.dimensions).map(([key, val]) => (
                    <div key={key}>
                      <div>
                        <span>{nice(key)}</span>
                        <strong>{val ?? "—"}</strong>
                      </div>
                      <progress
                        value={val ?? 0}
                        max={4}
                        aria-label={nice(key)}
                      />
                    </div>
                  ))}
                </div>
              </section>
              <section className="st-card">
                <h2>Session activity</h2>
                <p className="st-muted">
                  Sessions started on each active date.
                </p>
                {metrics.data.activity.length ? (
                  <div className="st-bars">
                    {metrics.data.activity.map((d) => (
                      <div key={d.day}>
                        <div>
                          <DateLabel value={d.day} />
                          <strong>{d.count}</strong>
                        </div>
                        <progress
                          value={d.count}
                          max={Math.max(
                            5,
                            ...metrics.data!.activity.map((x) => x.count),
                          )}
                          aria-label={`Sessions on ${d.day}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty title="Your next session is the first data point.">
                    <p>Start practicing to build a history.</p>
                  </Empty>
                )}
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
export function Profile({embedded=false}:{embedded?:boolean}={}) {
  const { user } = useAuth();
  const prefs = useResource<LearningRecord[]>("/records/?kind=preferences");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const existing = prefs.data?.[0]?.data;
  return (
    <>
      {embedded ? <h2 id="pf-section-title">Interview Studio preferences</h2> : <PageTitle
        eyebrow="YOUR ACCOUNT"
        title="Make space for your best work."
        description="Your Coding Hubs identity and Interview Studio preferences."
      />}
      <section className="st-card st-profile">
        <span className="st-avatar large">
          {user?.username?.[0]?.toUpperCase()}
        </span>
        <h2>{user?.username}</h2>
        <p className="st-muted">{user?.email}</p>
        <Link to="/my-account">Manage your Coding Hubs account ↗</Link>
      </section>
      {prefs.error && <Notice error>{prefs.error}</Notice>}
      {prefs.loading ? (
        <Loading />
      ) : (
        <form
          key={prefs.data?.[0]?.updated_at || "new"}
          className="st-card st-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setBusy(true);
            try {
              await studioApi.put("/records/", {
                kind: "preferences",
                key: "editor",
                data: {
                  font_size: Number(form.get("font_size")),
                  theme: form.get("theme"),
                },
              });
              setMessage("Your preferences are saved.");
              await prefs.reload();
            } catch (err) {
              setMessage(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Editor preferences</h2>
          <label>
            Font size
            <select
              name="font_size"
              defaultValue={String(existing?.font_size || 14)}
            >
              {[12, 14, 16, 18, 20].map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </label>
          <label>
            Theme
            <select
              name="theme"
              defaultValue={String(existing?.theme || "vs-dark")}
            >
              <option value="vs-dark">Dark workspace</option>
              <option value="light">Light workspace</option>
            </select>
          </label>
          <button className="st-button" disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
          <p role="status">{message}</p>
        </form>
      )}
    </>
  );
}
