import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  FileUp,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api, dateLabel, number } from "./api";
import { Badge, Empty, JsonDetail } from "./ui";
import { Jobs, LoadError, useData } from "./shared";
import type { Keywords, PanelProps, Technical } from "./types";

export function KeywordsPanel({ site }: PanelProps) {
  const { data, error, loading, reload } = useData<Keywords>(
    `/sites/${site.id}/keywords`,
    { rows: [], overlap_candidates: [], overlap_limit: null, ideas: [] },
  );
  const [query, setQuery] = useState(""),
    [intent, setIntent] = useState("all"),
    [page, setPage] = useState(0);
  const rows = data.rows.filter(
    (row) =>
      row.key.toLowerCase().includes(query.toLowerCase()) &&
      (intent === "all" || row.intent === intent),
  );
  const visible = rows.slice(page * 25, page * 25 + 25);
  return (
    <div className="stack">
      <section className="card">
        <div className="toolbar">
          <input
            type="search"
            aria-label="Search keyword opportunities"
            placeholder="Search keywords…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="Filter search intent"
            style={{ width: 170 }}
            value={intent}
            onChange={(event) => {
              setIntent(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">All search intents</option>
            {[
              "informational",
              "commercial",
              "local",
              "career",
              "interview",
              "comparison",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button className="button secondary" onClick={reload}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
        <LoadError error={error} />
        {loading && !data.rows.length ? (
          <p className="loading">Analyzing the selected source set…</p>
        ) : !rows.length ? (
          <Empty title="No measured keywords in this view">
            Import a matching GSC query table. Missing metrics are never filled
            with zeros.
          </Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Search query / suggested page</th>
                    <th>Impressions</th>
                    <th>Clicks</th>
                    <th>CTR</th>
                    <th>Avg. position</th>
                    <th>Intent / score</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.key}>
                      <td className="query">
                        <strong style={{ fontWeight: 550 }}>{row.key}</strong>
                        <div className="muted">Cluster: {row.cluster}</div>
                        {row.mapping && (
                          <a
                            className="url"
                            title={row.mapping.method}
                            href={row.mapping.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {new URL(row.mapping.url).pathname}
                            <ExternalLink size={9} style={{ marginLeft: 4 }} />
                          </a>
                        )}
                      </td>
                      <td>{number(row.impressions)}</td>
                      <td>{number(row.clicks)}</td>
                      <td>
                        {row.ctr_pct == null
                          ? "—"
                          : number(row.ctr_pct, 2) + "%"}
                      </td>
                      <td>{number(row.position, 2)}</td>
                      <td>
                        <span className="pill gray">{row.intent}</span>
                        <p className="muted" style={{ marginTop: 6 }}>
                          {number(row.score, 1)} · {row.confidence}
                        </p>
                        <details>
                          <summary>Click scenario</summary>
                          <p className="muted">
                            {row.potential_clicks_scenario} additional clicks
                            under a 3% CTR assumption, at unchanged impressions.
                            A scenario, not a forecast. Do not sum overlapping
                            dimensions.
                          </p>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                {page * 25 + 1}–{Math.min(page * 25 + 25, rows.length)} of{" "}
                {number(rows.length)} visible queries
              </span>
              <div className="row">
                <button
                  className="icon-button"
                  aria-label="Previous keyword page"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next keyword page"
                  disabled={(page + 1) * 25 >= rows.length}
                  onClick={() => setPage((value) => value + 1)}
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      <div className="two-col">
        <section className="card">
          <h2>Query-to-page overlap</h2>
          <p className="muted" style={{ margin: "12px 0" }}>
            {data.overlap_limit ||
              "Observed joined rows identify candidates for intent review, not proof of harmful cannibalization."}
          </p>
          {data.overlap_candidates.length > 0 && (
            <JsonDetail value={data.overlap_candidates} />
          )}
        </section>
        <section className="card">
          <h2>Ideas awaiting validation</h2>
          <p className="muted" style={{ margin: "12px 0" }}>
            These ideas have no verified search volume, CPC or keyword
            difficulty.
          </p>
          {data.ideas.slice(0, 8).map((idea, index) => (
            <p className="muted" key={index} style={{ marginTop: 7 }}>
              • {idea.query}
              <br />
              <span style={{ fontSize: 9 }}>{idea.status}</span>
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}

export function AuditPanel({ site, run, jobs, pages, system }: PanelProps) {
  const revision =
    jobs.find((job) => job.kind === "crawl" && job.status === "completed")
      ?.id || "";
  const technical = useData<Technical>(
    `/sites/${site.id}/technical`,
    {
      checked_pages: 0,
      findings: [],
      broken_internal_links: [],
      duplicates: [],
      no_observed_inbound: [],
      graph_limit: "",
    },
    revision,
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await run(
      () =>
        api(`/sites/${site.id}/jobs`, {
          method: "POST",
          body: {
            kind: "crawl",
            limit: Number(values.get("limit")),
            concurrency: Number(values.get("concurrency")),
            incremental: values.get("incremental") === "on",
            permitted_public_research: true,
          },
        }),
      "Bounded crawl queued. Requests respect robots and stay on the selected website.",
    );
  }
  return (
    <div className="stack">
      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Start an incremental crawl</h2>
              <p className="muted">{site.base_url}</p>
            </div>
            <ShieldCheck size={18} color="#16847c" />
          </div>
          <form className="form-grid" onSubmit={submit}>
            <div className="two-col">
              <label className="field">
                Maximum pages
                <input
                  name="limit"
                  type="number"
                  defaultValue={Math.min(10, system?.limits.crawl_limit || 30)}
                  min={1}
                  max={system?.limits.crawl_limit || 30}
                  required
                />
              </label>
              <label className="field">
                Concurrent requests
                <input
                  name="concurrency"
                  type="number"
                  defaultValue={1}
                  min={1}
                  max={system?.limits.concurrency || 1}
                  required
                />
              </label>
            </div>
            <label className="checkbox">
              <input type="checkbox" name="incremental" defaultChecked />
              <span>
                Reuse unchanged content and conditional HTTP responses.
              </span>
            </label>
            <label className="checkbox">
              <input type="checkbox" required />
              <span>
                I have permission to analyze this public website. Robots
                restrictions and the profile limit remain enforced.
              </span>
            </label>
            <button className="button">
              <Play size={13} />
              Start crawl
            </button>
          </form>
        </section>
        <section className="card">
          <h2>Captured signals</h2>
          <div className="row wrap" style={{ margin: "23px 0" }}>
            <span className="pill blue">
              {technical.data.checked_pages} pages
            </span>
            <span className="pill gray">
              {technical.data.broken_internal_links.length} broken captured
              links
            </span>
            <span className="pill gray">
              {technical.data.duplicates.length} duplicate groups
            </span>
          </div>
          <p className="muted">
            HTTP responses, titles, descriptions, canonicals, headings, JSON-LD
            parsing, content hashes and observed links are retained. Indexing
            signals are not a Google indexing verdict.
          </p>
          <p className="notice" style={{ margin: "17px 0" }}>
            {technical.data.graph_limit ||
              "A partial crawl cannot prove that an entire site is free of orphan pages or broken links."}
          </p>
          <button className="button secondary" onClick={technical.reload}>
            <RefreshCw size={12} />
            Refresh findings
          </button>
        </section>
      </div>
      <section className="card">
        <h2>Mobile rendering lab</h2>
        <p className="muted" style={{ margin: "12px 0" }}>Run a single mobile page capture in local Chrome. Third-party requests and tracking writes are blocked. Lab LCP and CLS are observations from this constrained run; field Core Web Vitals need real-user data.</p>
        <form onSubmit={async (event) => {
          event.preventDefault();
          await run(() => api(`/sites/${site.id}/jobs`, { method: "POST", body: { kind: "mobile", permitted_public_research: true } }), "Mobile browser lab queued locally.");
        }}>
          <label className="checkbox"><input type="checkbox" required /><span>I authorize this public website mobile capture.</span></label>
          <button className="button secondary" style={{ marginTop: 12 }}>Run mobile rendering check</button>
        </form>
        <Jobs jobs={jobs.filter((job) => job.kind === "mobile")} siteId={site.id} run={run} />
        {jobs.filter((job) => job.kind === "mobile" && job.status === "completed").slice(0, 1).map((job) => <div key={job.id} style={{ marginTop: 14 }}><JsonDetail value={job.result} label="Measured mobile lab result" /><a className="text-link" target="_blank" rel="noreferrer" href={`/api/sites/${site.id}/jobs/${job.id}/screenshot`}>Open private mobile screenshot</a></div>)}
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Crawl jobs & controls</h2>
          <span className="muted">Progress is persisted between restarts.</span>
        </div>
        <Jobs
          jobs={jobs.filter((job) => job.kind === "crawl")}
          siteId={site.id}
          run={run}
        />
        {!jobs.some((job) => job.kind === "crawl") && (
          <p className="muted">No crawl has been queued yet.</p>
        )}
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Captured page inventory</h2>
          <span className="muted">Latest {pages.length} records</span>
        </div>
        <LoadError error={technical.error} />
        {!pages.length ? (
          <Empty title="No captured pages yet">
            Start a permitted crawl to collect real HTML signals.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>HTTP</th>
                  <th>Indexing signal</th>
                  <th>Words</th>
                  <th>Last checked</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id}>
                    <td className="query">
                      <p>{page.title || "(No title observed)"}</p>
                      <a
                        className="url"
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {page.url}
                      </a>
                    </td>
                    <td>
                      <Badge value={String(page.status)} />
                    </td>
                    <td>{page.robots || "No robots tag observed"}</td>
                    <td>{number(page.word_count)}</td>
                    <td>{dateLabel(page.checked_at, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="divider" />
        <JsonDetail
          value={technical.data.findings}
          label={`${technical.data.findings.length} pages need signal/content review`}
        />
      </section>
    </div>
  );
}

interface ImportRow {
  id: string;
  kind: string;
  filename: string;
  rows: number;
  created_at: number;
}
interface GoogleStatus {
  configured: boolean;
  status: string;
  property_url: string;
  paused_until: number | null;
  redirect_uri: string;
  quota_reservations: unknown[];
}

export function IntegrationsPanel({ site, run }: PanelProps) {
  const imports = useData<ImportRow[]>(`/sites/${site.id}/imports`, []);
  const google = useData<GoogleStatus>(`/sites/${site.id}/google`, {
    configured: false,
    status: "not configured",
    property_url: "",
    paused_until: null,
    redirect_uri: "",
    quota_reservations: [],
  });
  const [kind, setKind] = useState("gsc"),
    [files, setFiles] = useState<File[]>([]),
    [oauthUrl, setOauthUrl] = useState(""),
    [properties, setProperties] = useState<
      { siteUrl: string; permissionLevel: string }[]
    >([]),
    [property, setProperty] = useState(""),
    [result, setResult] = useState<unknown>(null);
  async function upload(event: FormEvent) {
    event.preventDefault();
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    await run(async () => {
      setResult(
        await api(`/sites/${site.id}/imports?kind=${kind}`, {
          method: "POST",
          files: form,
        }),
      );
      imports.reload();
    }, "Import validated. Original files remain unchanged and duplicate rows are not added.");
  }
  async function saveGoogle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const form = event.currentTarget;
    await run(async () => {
      await api(`/sites/${site.id}/google/config`, {
        method: "POST",
        body: {
          client_id: values.get("client_id"),
          client_secret: values.get("client_secret"),
          analytics_property: values.get("ga4") || "",
          allow_sitemap_write: values.get("write") === "on",
        },
      });
      form.reset();
      google.reload();
    }, "OAuth client encrypted locally. Use Google consent next.");
  }
  return (
    <div className="stack">
      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Import first-party data</h2>
              <p className="muted">
                CSV or XLSX · up to 5 MB per file, 10 MB combined
              </p>
            </div>
            <FileUp size={19} color="#18847d" />
          </div>
          <form className="form-grid" onSubmit={upload}>
            <label className="field">
              Data source
              <select aria-label="Data source"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {[
                  ["gsc", "Search Console performance exports"],
                  ["ga4", "Google Analytics export"],
                  [
                    "keywords",
                    "Keyword / Trends / Planner / suggestion dataset",
                  ],
                  ["backlinks", "Links / backlink report"],
                  ["serp", "Manually obtained SERP report"],
                  ["ai_visibility", "Manual AI visibility observations"],
                  [
                    "performance",
                    "Local Lighthouse / performance measurements",
                  ],
                  ["indexing", "Indexing / URL inspection export"],
                ].map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Select source files
              <input
                type="file"
                name="files"
                accept=".csv,.xlsx"
                multiple
                required
                onChange={(event) =>
                  setFiles(Array.from(event.target.files || []))
                }
              />
            </label>
            {files.length > 0 && (
              <p className="muted">
                {files.map((file) => file.name).join(" · ")}
              </p>
            )}
            {kind === "gsc" && (
              <p className="notice">
                Select Chart, Queries, Pages, Countries, Devices, Filters and
                Search appearance together when they belong to one export.
                Filter labels do not prove complete date coverage.
              </p>
            )}
            <button className="button" disabled={!files.length}>
              <ArrowDownToLine size={13} />
              Import selected files
            </button>
          </form>
          {result != null && (
            <div style={{ marginTop: 18 }}>
              <JsonDetail value={result} label="Inspect import result" />
            </div>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Free Google connection</h2>
              <p className="muted">Official OAuth · Search Console & GA4</p>
            </div>
            <Badge value={google.data.status} />
          </div>
          <LoadError error={google.error} />
          <form onSubmit={saveGoogle} className="form-grid">
            <label className="field">
              Desktop OAuth client ID
              <input
                name="client_id"
                required
                autoComplete="off"
                placeholder="…apps.googleusercontent.com"
              />
            </label>
            <label className="field">
              OAuth client secret
              <input
                name="client_secret"
                type="password"
                required
                autoComplete="off"
              />
            </label>
            <label className="field">
              GA4 property (optional)
              <input
                name="ga4"
                placeholder="properties/123456789"
                autoComplete="off"
              />
            </label>
            <label className="checkbox">
              <input name="write" type="checkbox" />
              <span>
                Request a separate sitemap-write scope. Each submission still
                requires explicit approval.
              </span>
            </label>
            <button className="button secondary">
              <ShieldCheck size={12} />
              Save encrypted configuration
            </button>
          </form>
          <div className="divider" />
          <p className="muted">
            Loopback redirect:{" "}
            {google.data.redirect_uri ||
              "http://127.0.0.1:8765/api/google/callback"}
          </p>
          <div className="row wrap" style={{ marginTop: 14 }}>
            <button
              className="button"
              disabled={!google.data.configured}
              onClick={() => {
                void run(async () => {
                  const value = await api<{ url: string }>(
                    `/sites/${site.id}/google/authorize`,
                    { method: "POST" },
                  );
                  setOauthUrl(value.url);
                });
              }}
            >
              Prepare Google consent
            </button>
            {oauthUrl && (
              <a
                className="button secondary"
                href={oauthUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open Google consent
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          <p className="muted" style={{ marginTop: 15 }}>
            Your own authorized free OAuth client is required. No credentials
            are bundled and no paid provider is used as a fallback.
          </p>
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Property, quotas & authorized checks</h2>
            <p className="muted">
              Select only properties Google confirms you can access.
            </p>
          </div>
          <span className="pill gray">CSV fallback always available</span>
        </div>
        <div className="two-col">
          <div className="form-grid">
            <button
              className="button secondary"
              disabled={!google.data.configured}
              onClick={() => {
                void run(async () => {
                  setProperties(
                    await api(`/sites/${site.id}/google/properties`),
                  );
                  google.reload();
                });
              }}
            >
              Load authorized properties
            </button>
            {properties.length > 0 && (
              <>
                <label className="field">
                  Search Console property
                  <select aria-label="Search Console property"
                    value={property}
                    onChange={(event) => setProperty(event.target.value)}
                  >
                    <option value="">Select a property</option>
                    {properties.map((row) => (
                      <option value={row.siteUrl} key={row.siteUrl}>
                        {row.siteUrl} · {row.permissionLevel}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button secondary"
                  disabled={!property}
                  onClick={() => {
                    void run(async () => {
                      await api(`/sites/${site.id}/google/property`, {
                        method: "POST",
                        body: { property_url: property },
                      });
                      google.reload();
                    }, "Authorized property selected");
                  }}
                >
                  <Check size={12} />
                  Select property
                </button>
              </>
            )}
            <p className="muted">
              Current property: {google.data.property_url || "None selected"}
            </p>
            <button
              className="button"
              disabled={!google.data.property_url}
              onClick={() => {
                void run(
                  () =>
                    api(`/sites/${site.id}/jobs`, {
                      method: "POST",
                      body: { kind: "sync" },
                    }),
                  "Free API synchronization queued",
                );
              }}
            >
              Sync available Google data
            </button>
            <JsonDetail
              value={google.data.quota_reservations}
              label="Local quota reservations"
            />
          </div>
          <div className="form-grid">
            <label className="field">
              Important public URL
              <input
                id="inspection-url"
                type="url"
                defaultValue={site.base_url}
              />
            </label>
            <button
              className="button secondary"
              disabled={!google.data.property_url}
              onClick={() => {
                const url = (
                  document.getElementById("inspection-url") as HTMLInputElement
                ).value;
                void run(async () => {
                  setResult(
                    await api(`/sites/${site.id}/google/inspect`, {
                      method: "POST",
                      body: { url },
                    }),
                  );
                  google.reload();
                }, "Official inspection result stored as evidence");
              }}
            >
              Inspect authorized URL
            </button>
            <button
              className="button secondary"
              disabled={!google.data.property_url}
              onClick={() => {
                void run(async () =>
                  setResult(await api(`/sites/${site.id}/google/sitemaps`)),
                );
              }}
            >
              Read sitemap status
            </button>
            <details>
              <summary>Explicit sitemap submission</summary>
              <form
                className="form-grid"
                style={{ marginTop: 12 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  const values = new FormData(event.currentTarget);
                  void run(async () => {
                    setResult(
                      await api(`/sites/${site.id}/google/sitemaps`, {
                        method: "POST",
                        body: {
                          url: values.get("url"),
                          approval: "submit sitemap",
                        },
                      }),
                    );
                    google.reload();
                  }, "Authorized sitemap submission completed");
                }}
              >
                <label className="field">
                  Sitemap URL
                  <input
                    name="url"
                    type="url"
                    required
                    defaultValue={site.base_url + "sitemap.xml"}
                  />
                </label>
                <label className="checkbox">
                  <input type="checkbox" required />
                  <span>
                    I authorize this specific sitemap submission. A separately
                    consented write scope is required.
                  </span>
                </label>
                <button
                  className="button secondary"
                  disabled={!google.data.property_url}
                >
                  Submit this sitemap
                </button>
              </form>
            </details>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Imported source history</h2>
          <button className="small-link" onClick={imports.reload}>
            Refresh
          </button>
        </div>
        <LoadError error={imports.error} />
        {!imports.data.length ? (
          <Empty title="No imported source files yet">
            Start with your existing exports. Search demand is measured, never
            invented.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Source file</th>
                  <th>Dimension</th>
                  <th>Rows</th>
                  <th>Imported</th>
                </tr>
              </thead>
              <tbody>
                {imports.data.map((row) => (
                  <tr key={row.id}>
                    <td>{row.filename}</td>
                    <td>{row.kind}</td>
                    <td>{number(row.rows)}</td>
                    <td>{dateLabel(row.created_at, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ marginTop: 18 }}>
          No restricted Google suggestion/SERP endpoints are scraped. Competitor
          ranks, full backlink coverage and AI citations require reliable
          imported evidence.
        </p>
      </section>
    </div>
  );
}
