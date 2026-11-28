import { useState } from "react";
import type { FormEvent } from "react";
import {
  BookOpen,
  Check,
  Copy,
  FilePlus2,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { api, number } from "./api";
import { Badge, Empty, JsonDetail } from "./ui";
import { LoadError, useData } from "./shared";
import type { Document, PanelProps, SearchResult } from "./types";

export function KnowledgePanel({ site, run, jobs, system }: PanelProps) {
  const documents = useData<Document[]>(
    `/sites/${site.id}/documents`,
    [],
    jobs.find((job) => job.kind === "embed" && job.status === "completed")
      ?.id || "",
  );
  const [query, setQuery] = useState(""),
    [result, setResult] = useState<SearchResult | null>(null);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const form = event.currentTarget;
    await run(async () => {
      await api(`/sites/${site.id}/documents`, {
        method: "POST",
        body: {
          title: values.get("title"),
          source: values.get("source"),
          text: values.get("text"),
          verified: values.get("verified") === "on",
        },
      });
      form.reset();
      documents.reload();
    }, "Document version stored locally; nothing sent to an external AI service");
  }
  return (
    <div className="stack">
      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Add a source document</h2>
              <p className="muted">
                Course facts, reviewed teaching material or SEO evidence
              </p>
            </div>
            <FilePlus2 size={18} color="#16847c" />
          </div>
          <form className="form-grid" onSubmit={add}>
            <label className="field">
              Document title
              <input name="title" required minLength={2} maxLength={200} />
            </label>
            <label className="field">
              Source / provenance
              <input
                name="source"
                required
                minLength={2}
                placeholder="Verified course handbook, version 1"
              />
            </label>
            <label className="field">
              Source text
              <textarea aria-label="Source text"
                name="text"
                rows={6}
                required
                minLength={10}
                maxLength={100000}
              />
            </label>
            <label className="checkbox">
              <input name="verified" type="checkbox" />
              <span>
                I have personally verified these facts. Public crawl content
                stays unverified until reviewed.
              </span>
            </label>
            <button className="button">
              <BookOpen size={13} />
              Save local document
            </button>
          </form>
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Find supporting references</h2>
              <p className="muted">
                Hybrid retrieval when local embeddings are available
              </p>
            </div>
            <Search size={18} color="#688c9d" />
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () =>
                setResult(
                  await api(`/sites/${site.id}/knowledge/search`, {
                    method: "POST",
                    body: { query },
                  }),
                ),
              );
            }}
          >
            <label className="field">
              What do you want to investigate?
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                required
                minLength={2}
                maxLength={1000}
                placeholder="RAG prerequisites and practical exercises"
              />
            </label>
            <button className="button secondary">
              <Search size={13} />
              Retrieve references
            </button>
          </form>
          <div className="divider" />
          <p className="muted">
            Embedding model:{" "}
            {system?.ai.embedding_model || "Local model not configured"}.
            Unavailable AI uses lexical retrieval and is labeled accordingly.
          </p>
          <button
            className="button secondary"
            style={{ marginTop: 14 }}
            disabled={!documents.data.length}
            onClick={() => {
              void run(
                () =>
                  api(`/sites/${site.id}/jobs`, {
                    method: "POST",
                    body: { kind: "embed" },
                  }),
                "A bounded local embedding batch is queued; existing vectors are reused",
              );
            }}
          >
            <Sparkles size={13} />
            Index next local batch
          </button>
          {result && (
            <div style={{ marginTop: 20 }}>
              <span className="pill blue">{result.mode}</span>
              <p className="muted" style={{ margin: "12px 0" }}>
                {result.limitations}
              </p>
              {result.results.length ? (
                result.results.map((row) => (
                  <article className="action-row" key={row.chunk_id}>
                    <div className="grow">
                      <h3>{row.title}</h3>
                      <p className="muted">
                        {row.source} · similarity {number(row.score, 3)}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          lineHeight: 1.8,
                          margin: "10px 0",
                        }}
                      >
                        {row.text}
                      </p>
                      <Badge
                        value={
                          row.verified ? "Owner verified" : "Unverified source"
                        }
                      />
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">
                  No sufficiently matching reference. The system does not invent
                  a source.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Versioned local knowledge</h2>
            <p className="muted">
              Tenant-filtered documents and reusable embeddings
            </p>
          </div>
          <span className="pill gray">
            {documents.data.filter((doc) => doc.active).length} active documents
          </span>
        </div>
        <LoadError error={documents.error} />
        {!documents.data.length ? (
          <Empty title="Start with trusted source material">
            Add a reviewed document or crawl permitted public pages.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Document / source</th>
                  <th>Version</th>
                  <th>Characters</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {documents.data.map((doc) => (
                  <tr key={doc.id}>
                    <td className="query">
                      <strong style={{ fontWeight: 550 }}>{doc.title}</strong>
                      <p className="muted">{doc.source}</p>
                    </td>
                    <td>
                      <span className="pill gray">
                        {doc.active ? "Active" : "Prior version"}
                      </span>
                    </td>
                    <td>{number(doc.characters)}</td>
                    <td>
                      <Badge
                        value={
                          doc.verified ? "Owner verified" : "Unverified source"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function ContentPanel({ site, run, jobs, pages, system }: PanelProps) {
  const [task, setTask] = useState(
      "Improve the existing RAG explanation with a direct definition, one original exercise and appropriate internal links.",
    ),
    [kind, setKind] = useState("Content brief"),
    [pageId, setPageId] = useState("");
  const [exported, setExported] = useState<{
      export_id: string;
      prompt: string;
      notice: string;
    } | null>(null),
    [imported, setImported] = useState("");
  const latest = jobs.find((job) => job.kind === "draft");
  const result = latest?.status === "completed" ? latest.result : null;
  return (
    <div className="stack">
      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Draft with local AI</h2>
              <p className="muted">
                {system?.ai.default_model || "Configured local model"} · no paid
                API key
              </p>
            </div>
            <Sparkles size={18} color="#18857d" />
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                () =>
                  api(`/sites/${site.id}/jobs`, {
                    method: "POST",
                    body: { kind: "draft", task: `${kind}: ${task}` },
                  }),
                "Local draft queued. All output remains unreviewed until you verify it.",
              );
            }}
          >
            <label className="field">
              Draft type
              <select aria-label="Draft type"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {[
                  "Content brief",
                  "SEO title and meta description",
                  "FAQ and interview-question outline",
                  "Tutorial or course outline",
                  "Practical assignment ideas",
                  "Internal linking suggestions",
                ].map((kind) => (
                  <option key={kind}>{kind}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Requested analysis
              <textarea aria-label="Requested analysis"
                value={task}
                onChange={(event) => setTask(event.target.value)}
                required
                minLength={5}
                maxLength={1800}
                rows={5}
              />
            </label>
            <p className="notice">
              Source content is untrusted data. The model has no publishing,
              filesystem, shell or Git permissions. Unavailable or invalid model
              output uses a labeled deterministic fallback.
            </p>
            <button className="button">
              <Sparkles size={13} />
              Generate local draft
            </button>
          </form>
          {latest && (
            <p className="muted" style={{ marginTop: 15 }}>
              Latest draft job: <Badge value={latest.status} />
            </p>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Review the draft</h2>
              <p className="muted">
                Suggestions are never automatically published.
              </p>
            </div>
            <span className="pill amber">Human review required</span>
          </div>
          {result ? (
            <>
              <p className="mini-label">
                {String(result.engine || "")} ·{" "}
                {String(result.model || "rules")}
              </p>
              <h3 style={{ marginTop: 17 }}>{String(result.title || "")}</h3>
              <p className="muted">{String(result.description || "")}</p>
              <div className="divider" />
              <h3>Suggested outline</h3>
              {Array.isArray(result.outline) &&
                result.outline.map((line, index) => (
                  <p className="muted" key={index} style={{ marginTop: 8 }}>
                    • {String(line)}
                  </p>
                ))}
              <div className="divider" />
              <JsonDetail
                value={result.review_notes}
                label="Review notes and unknown facts"
              />
            </>
          ) : (
            <Empty title="Your draft will appear here">
              Verified knowledge makes a better starting point. Check technical
              examples, facts and intent before using any suggestion.
            </Empty>
          )}
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Manual ChatGPT review</h2>
            <p className="muted">
              Use your existing subscription yourself. No browser automation,
              session cookies or unofficial APIs.
            </p>
          </div>
          <span className="pill gray">Manual exchange</span>
        </div>
        <div className="flow-steps">
          <span className="current">1. Prepare context</span>
          <span>2. Review & copy</span>
          <span>3. Paste JSON response</span>
          <span>4. Review recommendations</span>
        </div>
        <div className="two-col">
          <div className="form-grid">
            <label className="field">
              Optional captured page content
              <select aria-label="Optional captured page content"
                value={pageId}
                onChange={(event) => setPageId(event.target.value)}
              >
                <option value="">GSC context only; no page content</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title || page.url}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              The prompt includes selected source evidence, keyword
              opportunities, technical findings, the requested task and a strict
              output schema. Contact-like strings are redacted. Review the text
              before sharing.
            </p>
            <button
              className="button secondary"
              onClick={() => {
                void run(
                  async () =>
                    setExported(
                      await api(`/sites/${site.id}/chatgpt/export`, {
                        method: "POST",
                        body: { task, page_id: pageId || null },
                      }),
                    ),
                  "Prompt prepared locally. Nothing has been sent to ChatGPT.",
                );
              }}
            >
              <FileUpIcon />
              Prepare ChatGPT prompt
            </button>
            {exported && (
              <>
                <label className="field">
                  Review and copy this prompt
                  <textarea aria-label="Review and copy this prompt"
                    rows={10}
                    className="code"
                    readOnly
                    value={exported.prompt}
                  />
                </label>
                <button
                  className="button secondary"
                  onClick={() => {
                    void run(
                      () => navigator.clipboard.writeText(exported.prompt),
                      "Prompt copied. Paste it manually into ChatGPT when ready.",
                    );
                  }}
                >
                  <Copy size={13} />
                  Copy reviewed prompt
                </button>
                <p className="muted">{exported.notice}</p>
              </>
            )}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const body = JSON.parse(imported);
                await api(`/sites/${site.id}/chatgpt/import`, {
                  method: "POST",
                  body,
                });
                setImported("");
              }, "Structured recommendations imported as unverified reviews. No files or publication changed.");
            }}
          >
            <label className="field">
              Structured response from ChatGPT
              <textarea aria-label="Structured response from ChatGPT"
                rows={12}
                value={imported}
                onChange={(event) => setImported(event.target.value)}
                required
                placeholder={
                  '{"export_id":"…","site_id":"…","recommendations":[…]}'
                }
                className="code"
              />
            </label>
            <p className="notice amber">
              Only the selected website, valid source IDs and allowed
              recommendation fields are accepted. Unknown tools, commands and
              fabricated source IDs are rejected.
            </p>
            <button className="button" disabled={!imported.trim()}>
              <Upload size={13} />
              Validate & import recommendations
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function FileUpIcon() {
  return <Check size={13} />;
}
