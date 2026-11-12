import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ROOT,
  errorMessage,
  studioApi,
  useResource,
  type Catalog,
  type Configuration,
  type StudioSession,
} from "./api";
import { Icon, Loading, Notice, PageTitle } from "./ui";

export function Configure({
  intro = false,
  kind = "coding",
}: {
  intro?: boolean;
  kind?: string;
}) {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  const catalog = useResource<Catalog>("/catalog/");
  const [conf, setConf] = useState<Configuration>({
    kind: params.get("kind") || kind,
    mode: params.get("mode") || "interview",
    persona: "balanced",
    experience: "New Graduate",
    difficulty: "mixed",
    topics: [],
    company: params.get("company") || "",
    role: "Software Engineer",
    duration: 45,
    language: "python",
    run_mode: "run",
    ...(params.get("problem")
      ? { problem_id: Number(params.get("problem")) }
      : {}),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("ch-studio-config") || "null",
      );
      if (saved && !params.get("problem"))
        setConf((c) => ({
          ...c,
          ...saved,
          kind: params.get("kind") || kind,
          mode: params.get("mode") || "interview",
        }));
    } catch {
      /* use defaults */
    }
  }, [kind, params]);
  function update<K extends keyof Configuration>(
    key: K,
    value: Configuration[K],
  ) {
    setConf((c) => ({ ...c, [key]: value }));
  }
  async function start(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem("ch-studio-config", JSON.stringify(conf));
      const session = await studioApi.post<StudioSession>("/sessions/", conf);
      navigate(`${ROOT}/coding-interviews/session/${session.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (catalog.loading) return <Loading />;
  if (catalog.error)
    return (
      <Notice error>
        {catalog.error}
        <button onClick={() => void catalog.reload()}>Retry</button>
      </Notice>
    );
  const data = catalog.data!;
  return (
    <>
      <PageTitle
        eyebrow={
          conf.mode === "practice"
            ? "YOUR PRACTICE SESSION"
            : "AI MOCK INTERVIEWS"
        }
        title={
          intro
            ? "Your next interview starts here."
            : "Set the tone. Find your challenge."
        }
        description="A focused session, tailored to where you are and where you want to go."
      />
      {!data.ai_available && (
        <Notice>
          The AI provider is awaiting server configuration. You can open a
          workspace, save code and use authored hints. Live AI conversation and
          reports become available when the provider is connected.
        </Notice>
      )}
      <form onSubmit={start} className="st-config">
        <section className="st-card">
          <div className="st-section-heading">
            <h2>
              01 <span>Choose your interviewer</span>
            </h2>
            <span>THE CONVERSATION STYLE</span>
          </div>
          <div className="st-personas">
            {[
              [
                "strict",
                "A sharper challenge",
                "Precise questions. Fewer hints. Defend your reasoning.",
                "design",
              ],
              [
                "balanced",
                "A realistic conversation",
                "Professional pace. Focused follow-ups. Room to think.",
                "chat",
              ],
              [
                "coaching",
                "Learn as you go",
                "Graduated hints. Thoughtful guidance. Build understanding.",
                "spark",
              ],
            ].map(([id, title, desc, icon]) => (
              <label
                className={`st-persona ${conf.persona === id ? "selected" : ""}`}
                key={id}
              >
                <input
                  type="radio"
                  name="persona"
                  value={id}
                  checked={conf.persona === id}
                  onChange={() => update("persona", id)}
                />
                <Icon name={icon} />
                <span className="st-persona-name">{id}</span>
                <strong>{title}</strong>
                <p>{desc}</p>
              </label>
            ))}
          </div>
        </section>
        <div className="st-two-column">
          <section className="st-card st-form">
            <h2>
              02 <span>Your preparation focus</span>
            </h2>
            <div className="st-form-grid">
              <label>
                Interview type
                <select
                  value={conf.kind}
                  disabled={!!conf.problem_id}
                  onChange={(e) => update("kind", e.target.value)}
                >
                  <option value="coding">Coding interview</option>
                  <option value="system-design">System design</option>
                  <option value="low-level-design">Low-level design</option>
                </select>
              </label>
              <label>
                Experience level
                <select
                  value={conf.experience}
                  onChange={(e) => update("experience", e.target.value)}
                >
                  {data.levels.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                Target role
                <select
                  value={conf.role}
                  onChange={(e) => update("role", e.target.value)}
                >
                  {data.roles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                Company-style category
                <select
                  value={conf.company}
                  onChange={(e) => update("company", e.target.value)}
                >
                  <option value="">General preparation</option>
                  {data.companies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="st-fine">
              Company categories organize original practice material and do not
              imply endorsement or verified interview questions.
            </p>
          </section>
          <section className="st-card st-form">
            <h2>
              03 <span>Set your session</span>
            </h2>
            <div className="st-form-grid">
              <label>
                Difficulty
                <select
                  value={conf.difficulty}
                  disabled={!!conf.problem_id}
                  onChange={(e) => update("difficulty", e.target.value)}
                >
                  {["mixed", "easy", "medium", "hard"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Duration
                <select
                  value={conf.duration}
                  onChange={(e) => update("duration", Number(e.target.value))}
                >
                  {[15, 30, 45, 60, 90].map((n) => (
                    <option value={n} key={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </label>
              {conf.kind === "coding" && (
                <>
                  <label>
                    Language
                    <select
                      value={conf.language}
                      onChange={(e) => update("language", e.target.value)}
                    >
                      {data.languages.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Run mode
                    <select
                      value={conf.run_mode}
                      onChange={(e) => update("run_mode", e.target.value)}
                    >
                      <option value="run">Run as you code</option>
                      <option value="no-run">No-run interview</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            <p className="st-fine">
              Your timer starts when the workspace opens. Refreshing will
              restore your saved session.
            </p>
          </section>
        </div>
        {!conf.problem_id && (
          <section className="st-card">
            <h2>
              04 <span>Topics to explore</span>
            </h2>
            <p className="st-muted">
              Choose a few, or leave this open for a random approved question.
            </p>
            <div className="st-topic-selector">
              {data.topics.map((t) => (
                <label
                  key={t}
                  className={conf.topics.includes(t) ? "selected" : ""}
                >
                  <input
                    type="checkbox"
                    checked={conf.topics.includes(t)}
                    onChange={(e) =>
                      update(
                        "topics",
                        e.target.checked
                          ? [...conf.topics, t]
                          : conf.topics.filter((x) => x !== t),
                      )
                    }
                  />
                  {t}
                </label>
              ))}
            </div>
          </section>
        )}
        {error && <Notice error>{error}</Notice>}
        <div className="st-config-bottom">
          <div>
            <strong>A thoughtful session. A useful next step.</strong>
            <p>
              Your code, conversation and configuration are saved to your
              account.
            </p>
          </div>
          <button className="st-button" disabled={busy}>
            {busy ? "Opening your workspace…" : "Begin session"}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </form>
    </>
  );
}
