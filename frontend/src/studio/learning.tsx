import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ROOT,
  errorMessage,
  studioApi,
  useResource,
  type Catalog,
  type ChatMessage,
  type LearningRecord,
} from "./api";
import { Empty, Icon, Loading, Notice, PageTitle } from "./ui";

export function Roadmaps() {
  const [duration, setDuration] = useState(30),
    [completed, setCompleted] = useState<number[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [expanded, setExpanded] = useState<number | null>(null);
  const catalog = useResource<Catalog>("/catalog/"),
    progress = useResource<LearningRecord[]>("/records/?kind=roadmap");
  useEffect(() => {
    const record = progress.data?.find((x) => x.key === String(duration));
    setCompleted(
      Array.isArray(record?.data.completed)
        ? (record.data.completed as number[])
        : [],
    );
  }, [duration, progress.data]);
  async function toggle(index: number) {
    const next = completed.includes(index)
      ? completed.filter((x) => x !== index)
      : [...completed, index];
    setBusy(true);
    try {
      await studioApi.put("/records/", {
        kind: "roadmap",
        key: String(duration),
        data: { completed: next },
      });
      setCompleted(next);
      setError("");
      await progress.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="DSA ROADMAPS"
        title="A steady path to clear thinking."
        description="Study the idea, trace it by hand, then put it into practice."
      />
      <div className="st-toolbar">
        <label>
          Your preparation window
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <span>
          {completed.length} of {catalog.data?.patterns.length ?? "…"} concepts
          reviewed
        </span>
      </div>
      {(error || catalog.error || progress.error) && (
        <Notice error>{error || catalog.error || progress.error}</Notice>
      )}
      {catalog.loading || progress.loading ? (
        <Loading />
      ) : (
        <div className="st-roadmap">
          {catalog.data?.patterns.map((pattern, i) => (
            <article
              className={`st-roadmap-step ${completed.includes(i) ? "done" : ""}`}
              key={pattern.title}
            >
              <div className="st-roadmap-number">
                {completed.includes(i) ? (
                  <Icon name="check" />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </div>
              <div>
                <span className="st-eyebrow">
                  DAY{" "}
                  {Math.floor((i * duration) / catalog.data!.patterns.length) +
                    1}{" "}
                  · CONCEPT & REVISION
                </span>
                <button
                  className="st-roadmap-title"
                  aria-expanded={expanded === i}
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  {pattern.title} <span>{expanded === i ? "−" : "+"}</span>
                </button>
                {expanded === i && (
                  <div className="st-lesson">
                    <p>{pattern.lesson}</p>
                    <p className="st-fine">
                      Try this: state an invariant, trace a small example, and
                      identify one boundary case before writing an
                      implementation.
                    </p>
                    <Link
                      to={`${ROOT}/practice?topic=${encodeURIComponent(pattern.title)}`}
                    >
                      Find related practice ↗
                    </Link>
                    {i === 1 && <WindowVisualization />}
                  </div>
                )}
              </div>
              <label className="st-complete">
                <input
                  type="checkbox"
                  checked={completed.includes(i)}
                  disabled={busy}
                  onChange={() => void toggle(i)}
                />
                <span>Reviewed</span>
              </label>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
export function WindowVisualization() {
  const [step, setStep] = useState(0),
    [answer, setAnswer] = useState("");
  const values = [4, 2, 7, 1, 3],
    sums = [6, 9, 8, 4];
  return (
    <div className="st-visualizer">
      <h3>Move the window</h3>
      <p>
        Keep two readings at a time. Subtract the outgoing value and add the
        incoming value.
      </p>
      <div className="st-array">
        {values.map((n, i) => (
          <span
            key={i}
            className={i === step || i === step + 1 ? "selected" : ""}
          >
            {n}
          </span>
        ))}
      </div>
      <p>
        Current sum: <strong>{sums[step]}</strong> · Smallest seen:{" "}
        <strong>{Math.min(...sums.slice(0, step + 1))}</strong>
      </p>
      <div className="st-actions">
        <button
          className="st-button secondary"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={!step}
        >
          Previous
        </button>
        <button
          className="st-button"
          onClick={() => setStep(Math.min(3, step + 1))}
          disabled={step === 3}
        >
          Next window
        </button>
      </div>
      <fieldset className="st-quiz">
        <legend>What is the extra space needed for a rolling total?</legend>
        {["O(1)", "O(n)"].map((v) => (
          <label key={v}>
            <input
              type="radio"
              name="window-quiz"
              value={v}
              checked={answer === v}
              onChange={() => setAnswer(v)}
            />
            {v}
          </label>
        ))}
        {answer && (
          <p role="status">
            {answer === "O(1)"
              ? "Correct. Only the current total and minimum are needed."
              : "Try again. Does storing one total require a value for every reading?"}
          </p>
        )}
      </fieldset>
    </div>
  );
}
export function Tutor() {
  const [conversation, setConversation] = useState("default"),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [input, setInput] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [notice, setNotice] = useState("");
  const records = useResource<LearningRecord[]>("/records/?kind=tutor"),
    notes = useResource<LearningRecord[]>("/records/?kind=note"),
    catalog = useResource<Catalog>("/catalog/");
  useEffect(() => {
    setMessages(
      (records.data?.find((r) => r.key === conversation)?.data
        .messages as ChatMessage[]) || [],
    );
  }, [records.data, conversation]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await studioApi.post<{ messages: ChatMessage[] }>(
        "/tutor/",
        {
          content: input,
          conversation_id: conversation,
          request_id: crypto.randomUUID(),
        },
      );
      setMessages(result.messages);
      setInput("");
      await records.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function saveNote(content: string) {
    if (!content.trim()) return;
    try {
      await studioApi.put("/records/", {
        kind: "note",
        key: crypto.randomUUID(),
        data: { content },
      });
      setNote("");
      setNotice("Saved to your notebook.");
      await notes.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="AI LEARNING ASSISTANT"
        title="Work through the why."
        description="Explore concepts with an assistant grounded in approved, original Studio material."
      />
      {catalog.data && !catalog.data.ai_available && (
        <Notice>
          The AI provider needs server configuration before tutoring is
          available. Your notebook remains available.
        </Notice>
      )}
      <div className="st-tutor-layout">
        <section className="st-card st-tutor-chat">
          <div className="st-card-head">
            <label>
              Conversation
              <select
                value={conversation}
                onChange={(e) => setConversation(e.target.value)}
              >
                <option value="default">Main conversation</option>
                {records.data
                  ?.filter((r) => r.key !== "default")
                  .map((r, i) => (
                    <option key={r.key} value={r.key}>
                      Study session {i + 1}
                    </option>
                  ))}
                {conversation !== "default" &&
                  !records.data?.some((r) => r.key === conversation) && (
                    <option value={conversation}>New study session</option>
                  )}
              </select>
            </label>
            <button
              className="st-link-button"
              onClick={() => {
                setConversation(crypto.randomUUID());
                setMessages([]);
              }}
            >
              + New session
            </button>
          </div>
          {records.loading ? (
            <Loading />
          ) : messages.length ? (
            <div className="st-chat-messages">
              {messages.map((m, i) => (
                <article className={`st-chat-message ${m.role}`} key={i}>
                  <span>
                    {m.role === "user" ? "YOU" : "LEARNING ASSISTANT"}
                  </span>
                  <p>{m.content}</p>
                  {m.sources?.length ? (
                    <div className="st-source-list">
                      Approved sources:{" "}
                      {m.sources.map((s) => (
                        <span key={s.id}>{s.title}</span>
                      ))}
                    </div>
                  ) : null}
                  {m.role === "assistant" && (
                    <button
                      className="st-link-button"
                      onClick={() => void saveNote(m.content)}
                    >
                      Save to notebook
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty title="Start with a question.">
              <p>
                Try “Why does a sliding window need an invariant?” or “Explain
                lower-bound binary search.”
              </p>
            </Empty>
          )}
          {(error || records.error) && (
            <Notice error>{error || records.error}</Notice>
          )}
          <form className="st-chat-compose" onSubmit={send}>
            <label className="sr-only" htmlFor="st-tutor-message">
              Ask the learning assistant
            </label>
            <textarea
              id="st-tutor-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={5000}
              placeholder="What would you like to understand?"
              rows={3}
              required
            />
            <button
              className="st-button"
              disabled={busy || !input.trim() || !catalog.data?.ai_available}
            >
              {busy ? "Thinking…" : "Ask assistant"}
              <Icon name="arrow" size={16} />
            </button>
          </form>
          <p className="st-fine">
            Retrieval uses approved Studio editorials. Answers can be mistaken;
            source references are shown when retrieved material supports the
            explanation.
          </p>
        </section>
        <aside className="st-card st-notebook">
          <div className="st-card-head">
            <h2>Your notebook</h2>
            <Icon name="map" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveNote(note);
            }}
          >
            <label htmlFor="st-note">A thought to keep</label>
            <textarea
              id="st-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={10000}
              rows={4}
              placeholder="An insight, a snippet, a question…"
              required
            />
            <button className="st-button secondary" disabled={!note.trim()}>
              Save note
            </button>
          </form>
          {notice && <p role="status">{notice}</p>}
          {notes.error && <Notice error>{notes.error}</Notice>}
          {notes.data?.map((n) => (
            <article key={n.id} className="st-note">
              <p>{String(n.data.content || "")}</p>
              <button
                className="st-link-button"
                onClick={async () => {
                  try {
                    await studioApi.delete(`/records/?id=${n.id}`);
                    await notes.reload();
                  } catch (err) {
                    setError(errorMessage(err));
                  }
                }}
              >
                Delete note
              </button>
            </article>
          ))}
        </aside>
      </div>
    </>
  );
}
