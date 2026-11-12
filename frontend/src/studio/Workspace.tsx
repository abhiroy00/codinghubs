import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ROOT,
  errorMessage,
  studioApi,
  useResource,
  type Catalog,
  type LearningRecord,
  type Report,
  type StudioSession,
  type Submission,
} from "./api";
import { ButtonLink, Difficulty, Icon, Loading, Notice } from "./ui";
import { StudioEditor } from "./Editor";
import { Diagram, type DiagramValue } from "./Diagram";
import { VoiceControls } from "./voice";

export function Workspace() {
  const { sessionId } = useParams();
  const resource = useResource<StudioSession>(`/sessions/${sessionId}/`),
    catalog = useResource<Catalog>("/catalog/"),
    prefs = useResource<LearningRecord[]>("/records/?kind=preferences");
  const [code, setCode] = useState(""),
    [diagram, setDiagram] = useState<DiagramValue>({ nodes: [], edges: [] }),
    [input, setInput] = useState(""),
    [error, setError] = useState(""),
    [saveStatus, setSaveStatus] = useState("Saved to your account"),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [tab, setTab] = useState("problem"),
    [customInput, setCustomInput] = useState(""),
    [submissions, setSubmissions] = useState<Submission[]>([]),
    [report, setReport] = useState<Report | null>(null),
    [fontSize, setFontSize] = useState(14),
    [theme, setTheme] = useState("vs-dark"),
    [expanded, setExpanded] = useState(false),
    [ready, setReady] = useState(false);
  const version = useRef(0),
    latest = useRef({
      code: "",
      diagram: { nodes: [], edges: [] } as DiagramValue,
    }),
    lastSaved = useRef(""),
    inflight = useRef<Promise<void> | null>(null),
    requestId = useRef<string | null>(null);
  const session = resource.data;
  latest.current = { code, diagram };
  useEffect(() => {
    if (!session) return;
    setCode(session.code);
    setDiagram({
      nodes: (session.diagram.nodes as DiagramValue["nodes"]) || [],
      edges: (session.diagram.edges as DiagramValue["edges"]) || [],
    });
    version.current = session.revision;
    lastSaved.current = JSON.stringify({
      code: session.code,
      diagram: {
        nodes: session.diagram.nodes || [],
        edges: session.diagram.edges || [],
      },
    });
    setSubmissions(session.submissions);
    setReport(session.report);
    setReady(true);
  }, [session?.id]); // initialize once; conversation updates must not overwrite a local draft
  useEffect(() => {
    const pref = prefs.data?.[0]?.data;
    if (pref) {
      setFontSize(Number(pref.font_size) || 14);
      setTheme(String(pref.theme || "vs-dark"));
    }
  }, [prefs.data]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const expired = !!session && new Date(session.deadline).getTime() <= now;
  const readOnly = session?.status !== "active" || expired;
  async function save() {
    while (inflight.current) await inflight.current;
    const body = latest.current,
      encoded = JSON.stringify(body);
    if (encoded === lastSaved.current || !ready || readOnly) return;
    setSaveStatus("Saving…");
    const pending = studioApi
      .patch<{ revision: number }>(`/sessions/${sessionId}/`, {
        ...body,
        revision: version.current,
      })
      .then((result) => {
        version.current = result.revision;
        lastSaved.current = encoded;
        setSaveStatus("Saved to your account");
      })
      .catch((err) => {
        setSaveStatus("Draft not saved");
        setError(errorMessage(err));
        throw err;
      });
    inflight.current = pending;
    try {
      await pending;
    } finally {
      if (inflight.current === pending) inflight.current = null;
    }
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!ready || readOnly) return;
    if (JSON.stringify({ code, diagram }) === lastSaved.current) {
      setSaveStatus("Saved to your account");
      return;
    }
    setSaveStatus("Unsaved changes");
    const timer = setTimeout(() => {
      void saveRef.current().catch(() => undefined);
    }, 900);
    return () => clearTimeout(timer);
  }, [code, diagram, ready, readOnly]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== lastSaved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    if (
      !submissions.some((s) => s.status === "queued" || s.status === "running")
    )
      return;
    const timer = setInterval(() => {
      studioApi
        .get<Submission[]>(`/sessions/${sessionId}/runs/`)
        .then(setSubmissions)
        .catch((err) => setError(errorMessage(err)));
    }, 1500);
    return () => clearInterval(timer);
  }, [submissions, sessionId]);
  async function turn(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy || readOnly) return;
    setBusy(true);
    setError("");
    try {
      await save();
      requestId.current ??= crypto.randomUUID();
      const next = await studioApi.post<StudioSession>(
        `/sessions/${sessionId}/turn/`,
        { content: input, request_id: requestId.current },
      );
      resource.setData(next);
      setInput("");
      requestId.current = null;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function hint() {
    setBusy(true);
    try {
      resource.setData(
        await studioApi.post<StudioSession>(`/sessions/${sessionId}/hint/`),
      );
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function run(mode: string) {
    setBusy(true);
    setError("");
    try {
      await save();
      const result = await studioApi.post<Submission>(
        `/sessions/${sessionId}/runs/`,
        { mode, custom_input: customInput },
      );
      setSubmissions((current) => [result, ...current]);
      setTab("tests");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    setBusy(true);
    setError("");
    try {
      await save();
      const result = await studioApi.post<Report>(
        `/sessions/${sessionId}/finish/`,
      );
      setReport(result);
      setTab("report");
      await resource.reload();
    } catch (err) {
      setError(errorMessage(err));
      await resource.reload();
    } finally {
      setBusy(false);
    }
  }
  if (resource.loading && !session) return <Loading />;
  if (!session)
    return (
      <Notice error>
        {resource.error || "Session not found."}
        <button onClick={() => void resource.reload()}>Retry</button>
      </Notice>
    );
  const seconds = Math.max(
      0,
      Math.floor((new Date(session.deadline).getTime() - now) / 1000),
    ),
    design = session.problem.kind !== "coding";
  const lastReply =
    [...session.messages].reverse().find((m) => m.role === "assistant")
      ?.content || "";
  return (
    <div className={`st-workspace ${expanded ? "expanded" : ""}`}>
      <div className="st-workspace-header">
        <div>
          <Link
            className="st-text-link"
            to={`${ROOT}/coding-interviews/history`}
          >
            ← Your sessions
          </Link>
          <h1>
            {session.problem.title}{" "}
            <Difficulty value={session.problem.difficulty} />
          </h1>
          <p>
            {session.configuration.persona} interviewer ·{" "}
            {session.configuration.experience} · Version{" "}
            {session.problem.version}
          </p>
        </div>
        <div className="st-session-actions">
          <span className={`st-timer ${seconds < 300 ? "warning" : ""}`}>
            <Icon name="clock" size={17} />
            {session.status === "completed"
              ? "Completed"
              : `${Math.floor(seconds / 60)
                  .toString()
                  .padStart(
                    2,
                    "0",
                  )}:${(seconds % 60).toString().padStart(2, "0")}`}
          </span>
          <button
            className="st-button secondary"
            disabled={busy}
            onClick={() => void finish()}
          >
            {busy
              ? "Working…"
              : session.status === "completed"
                ? "Generate / refresh report"
                : "Finish & review"}
          </button>
        </div>
      </div>
      {error && <Notice error>{error}</Notice>}
      {expired && session.status === "active" && (
        <Notice>
          Your time is complete. Finish the session to request an evaluation of
          your saved work.
        </Notice>
      )}
      <div className="st-workspace-grid">
        <section className="st-problem-panel">
          <div
            className="st-workspace-tabs"
            role="tablist"
            aria-label="Session information"
          >
            {["problem", "tests", ...(report ? ["report"] : [])].map((t) => (
              <button
                role="tab"
                aria-selected={tab === t}
                key={t}
                onClick={() => setTab(t)}
              >
                {t === "tests"
                  ? "Test results"
                  : t === "report"
                    ? "Your report"
                    : "The problem"}
              </button>
            ))}
          </div>
          <div className="st-panel-body">
            {tab === "problem" && (
              <>
                <p className="st-eyebrow">
                  {design ? "DESIGN SCENARIO" : "ORIGINAL CODING CHALLENGE"}
                </p>
                <h2>{session.problem.title}</h2>
                <div className="st-tags">
                  {session.problem.topics.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <p className="st-problem-description">
                  {session.problem.description}
                </p>
                <h3>Constraints & assumptions</h3>
                <p>{session.problem.constraints}</p>
                {session.problem.examples.map((example, i) => (
                  <div className="st-example" key={i}>
                    <h3>Example {i + 1}</h3>
                    <span>INPUT</span>
                    <pre>{example.input}</pre>
                    <span>EXPECTED OUTPUT</span>
                    <pre>{example.output}</pre>
                  </div>
                ))}
                <p className="st-fine">{session.problem.provenance}</p>
                <div className="st-stage">
                  <span className="st-eyebrow">CURRENT STAGE</span>
                  <strong>
                    {(session.stages || catalog.data?.stages)?.[session.stage] ||
                      "Clarify the problem"}
                  </strong>
                  <progress
                    value={session.stage + 1}
                    max={(session.stages || catalog.data?.stages)?.length || 7}
                    aria-label="Interview stages"
                  />
                </div>
                <button
                  className="st-button secondary"
                  disabled={busy || readOnly}
                  onClick={() => void hint()}
                >
                  Request next hint <small>({session.hint_level} used)</small>
                </button>
              </>
            )}
            {tab === "tests" && (
              <>
                <h2>Automated execution evidence</h2>
                <p className="st-muted">
                  A run is verified only when the isolated worker returns a
                  result. Durations include container startup and execution.
                </p>
                {!catalog.data?.execution_available && (
                  <Notice>
                    The isolated execution service is not configured. No tests
                    have been run.
                  </Notice>
                )}
                {!submissions.length && (
                  <p>
                    Run sample tests or submit for hidden-test verification to
                    see results here.
                  </p>
                )}
                {submissions.map((s) => (
                  <article className="st-test-run" key={s.id}>
                    <h3>
                      {s.mode === "submit"
                        ? "Full submission"
                        : s.mode === "custom"
                          ? "Custom input"
                          : "Sample tests"}{" "}
                      <span className="st-pill">{s.status}</span>
                    </h3>
                    {s.results.map((r, i) => (
                      <div className="st-test-result" key={i}>
                        <strong>
                          {r.hidden ? "Private test" : `Test ${i + 1}`} ·{" "}
                          {r.passed === true
                            ? "Passed"
                            : r.passed === false
                              ? "Failed"
                              : "Not verified"}
                        </strong>
                        <p>
                          {r.status.replaceAll("_", " ")}
                          {r.duration_ms != null
                            ? ` · ${r.duration_ms} ms`
                            : ""}
                        </p>
                        {!r.hidden && (
                          <>
                            <span>Input</span>
                            <pre>{r.input}</pre>
                            {r.expected != null && (
                              <>
                                <span>Expected</span>
                                <pre>{r.expected}</pre>
                              </>
                            )}
                            <span>Program output</span>
                            <pre>{r.output || "(no output)"}</pre>
                          </>
                        )}
                      </div>
                    ))}
                  </article>
                ))}
              </>
            )}
            {tab === "report" && report && (
              <ReportView report={report} session={session} />
            )}
          </div>
        </section>
        <section className="st-code-panel">
          <div className="st-editor-toolbar">
            <span>
              <Icon name={design ? "design" : "code"} size={17} />
              {design
                ? "Architecture & reasoning"
                : session.configuration.language}
            </span>
            <div>
              <label>
                <span className="sr-only">Editor font size</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                >
                  {[12, 14, 16, 18, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}px
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() =>
                  setTheme(theme === "light" ? "vs-dark" : "light")
                }
              >
                Theme
              </button>
              <button onClick={() => setExpanded(!expanded)}>
                {expanded ? "Exit focus" : "Focus"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(code)
                    .then(() => setSaveStatus("Code copied"))
                    .catch(() =>
                      setError(
                        "Clipboard is unavailable. Select and copy the code in the editor.",
                      ),
                    );
                }}
              >
                Copy
              </button>
              <button
                disabled={readOnly}
                onClick={() => {
                  if (
                    window.confirm("Reset this draft to the original starter?")
                  )
                    setCode(
                      session.problem.starters[
                        session.configuration.language
                      ] || "",
                    );
                }}
              >
                Reset
              </button>
            </div>
          </div>
          {design && (
            <Diagram
              value={diagram}
              onChange={setDiagram}
              readOnly={readOnly}
            />
          )}
          <StudioEditor
            code={code}
            onChange={setCode}
            language={session.configuration.language}
            theme={theme}
            fontSize={fontSize}
            readOnly={readOnly}
          />
          <div className="st-editor-footer">
            <span role="status">{saveStatus}</span>
            <div>
              <button
                className="st-link-button"
                disabled={readOnly}
                onClick={() => void save().catch(() => undefined)}
              >
                Save now
              </button>
              {!design && (
                <>
                  <button
                    className="st-button secondary"
                    disabled={
                      busy ||
                      readOnly ||
                      session.configuration.run_mode === "no-run" ||
                      !catalog.data?.execution_available
                    }
                    onClick={() => void run("sample")}
                  >
                    ▷ Run samples
                  </button>
                  <button
                    className="st-button"
                    disabled={
                      busy ||
                      readOnly ||
                      session.configuration.run_mode === "no-run" ||
                      !catalog.data?.execution_available
                    }
                    onClick={() => void run("submit")}
                  >
                    Submit code
                  </button>
                </>
              )}
            </div>
          </div>
          {!design && (
            <details className="st-custom-input">
              <summary>Custom test input</summary>
              <label htmlFor="st-stdin">JSON input</label>
              <textarea
                id="st-stdin"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                maxLength={10000}
                rows={3}
              />
              <button
                disabled={
                  busy ||
                  readOnly ||
                  !catalog.data?.execution_available ||
                  session.configuration.run_mode === "no-run"
                }
                onClick={() => void run("custom")}
              >
                Run custom input
              </button>
            </details>
          )}
          <div className="st-conversation">
            <div className="st-card-head">
              <h2>
                <Icon name="chat" size={19} />
                The conversation
              </h2>
              <span className="st-pill">{session.configuration.persona}</span>
            </div>
            <div className="st-chat-messages">
              {session.messages.map((m, i) => (
                <article
                  className={`st-chat-message ${m.role}`}
                  key={m.id || i}
                >
                  <span>{m.role === "user" ? "YOU" : "YOUR INTERVIEWER"}</span>
                  <p>{m.content}</p>
                </article>
              ))}
            </div>
            <VoiceControls
              onTranscript={(text) =>
                setInput((current) => (current ? `${current} ${text}` : text))
              }
              lastReply={lastReply}
              disabled={readOnly || busy}
            />
            <form className="st-chat-compose" onSubmit={turn}>
              <label className="sr-only" htmlFor="st-interview-message">
                Your response to the interviewer
              </label>
              <textarea
                id="st-interview-message"
                placeholder={
                  readOnly
                    ? "This conversation is complete."
                    : "Talk through your approach…"
                }
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  requestId.current = null;
                }}
                maxLength={5000}
                rows={3}
                disabled={readOnly}
                required
              />
              <button
                className="st-button"
                disabled={
                  busy ||
                  readOnly ||
                  !input.trim() ||
                  !catalog.data?.ai_available
                }
              >
                {busy ? "Thinking…" : "Send response"}
                <Icon name="arrow" size={17} />
              </button>
            </form>
            {!catalog.data?.ai_available && (
              <p className="st-fine">
                Live chat is unavailable until the AI provider is configured.
                Your code and authored hints remain available.
              </p>
            )}
          </div>
        </section>
      </div>
      {session.status === "completed" && !report && (
        <section className="st-card">
          <h2>Your session is saved.</h2>
          <p>
            The report can be generated when the AI provider is available and
            execution has finished.
          </p>
          <button
            className="st-button"
            disabled={busy || !catalog.data?.ai_available}
            onClick={() => void finish()}
          >
            Generate evaluation
          </button>
        </section>
      )}
    </div>
  );
}
function ReportView({
  report,
  session,
}: {
  report: Report;
  session: StudioSession;
}) {
  return (
    <div className="st-report">
      <p className="st-eyebrow">AI-ASSESSED EDUCATIONAL FEEDBACK</p>
      <div className="st-report-score">
        <strong>
          {report.score}
          <small>/100</small>
        </strong>
        <p>{report.feedback.summary}</p>
      </div>
      <Notice>
        This feedback supports learning. It is not an objective hiring decision.
        Automated test results are recorded separately.
      </Notice>
      {Object.entries(report.dimensions).map(([key, d]) => (
        <section className="st-dimension" key={key}>
          <div>
            <h3>{key}</h3>
            <strong>
              {d.rating}/4 <small>· {report.weights[key]}% weight</small>
            </strong>
          </div>
          <progress value={d.rating} max={4} aria-label={key} />
          <p>{d.explanation}</p>
        </section>
      ))}
      {[
        ["Strengths", report.feedback.strengths],
        ["Focus areas", report.feedback.improvements],
        ["What to practice next", report.feedback.recommendations],
      ].map(([title, items]) => (
        <section key={title as string}>
          <h3>{title as string}</h3>
          <ul>
            {(items as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <p>
        Hints used: <strong>{session.hint_level}</strong>. Automated runs
        recorded: <strong>{report.evidence.length}</strong>.
      </p>
      <p className="st-fine">
        Score = Σ(weight × rating ÷ 4). Weights and evidence are frozen with
        this report. Prompt {report.prompt_version}.
      </p>
      <div className="st-actions">
        <button className="st-button secondary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <ButtonLink
          to={`${ROOT}/coding-interviews/new?problem=${session.problem.id}&kind=${session.problem.kind}`}
        >
          Try again
        </ButtonLink>
      </div>
      <Link to={`${ROOT}/dsa-roadmaps`}>Build a revision plan →</Link>
    </div>
  );
}
