import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  FileText,
  FolderGit2,
  Globe2,
  LayoutDashboard,
  Leaf,
  ListTodo,
  LogOut,
  Menu,
  MousePointer2,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import {
  api,
  dateLabel,
  errorText,
  number,
  onUnauthorized,
  setCsrf,
} from "./api";
import type {
  Action,
  Agent,
  Job,
  Page,
  PanelProps,
  Report,
  Run,
  Session,
  Site,
  Summary,
  System,
} from "./types";
import {
  AuditPanel,
  AutomationPanel,
  ContentPanel,
  IntegrationsPanel,
  KeywordsPanel,
  KnowledgePanel,
  ProposalsPanel,
  ReportsPanel,
  SystemPanel,
} from "./panels";
import { Badge, Empty, JsonDetail } from "./ui";

const PerformanceChart = lazy(() => import("./PerformanceChart"));

type Tab =
  | "overview"
  | "actions"
  | "keywords"
  | "audit"
  | "knowledge"
  | "content"
  | "integrations"
  | "automation"
  | "proposals"
  | "reports"
  | "system";
const NAV: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "actions", label: "Action center", icon: ListTodo },
  { id: "keywords", label: "Keywords", icon: Search },
  { id: "audit", label: "Technical audit", icon: Activity },
  { id: "knowledge", label: "Knowledge base", icon: BookOpen },
  { id: "content", label: "Content studio", icon: Sparkles },
  { id: "integrations", label: "Data & integrations", icon: Database },
  { id: "automation", label: "Automation", icon: Clock3 },
  { id: "proposals", label: "Change proposals", icon: FolderGit2 },
  { id: "reports", label: "Reports", icon: FileText },
];
const DESCRIPTIONS: Record<Tab, string> = {
  overview:
    "A clear view of your search visibility and the work that matters next.",
  actions:
    "Prioritized reviews grounded in your actual website and search data.",
  keywords:
    "Measured demand, search intent and opportunities worth investigating.",
  audit:
    "Crawl permitted public pages, inspect signals and keep a history of changes.",
  knowledge:
    "Private source material, local embeddings and references you can inspect.",
  content:
    "Draft with local AI or exchange a reviewed prompt with ChatGPT manually.",
  integrations:
    "Bring your own first-party data. No paid SEO subscriptions required.",
  automation: "Durable jobs and sensible schedules on your own computer.",
  proposals:
    "Inspect the exact diff, approve a local change and retain a safe rollback.",
  reports: "Save the evidence, decisions and limitations behind every review.",
  system:
    "Your local resources, private storage and enforced zero-cost policy.",
};

function Auth({
  setup,
  complete,
}: {
  setup: boolean;
  complete: (value: Session) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const result = await api<Session>(`/auth/${setup ? "setup" : "login"}`, {
        method: "POST",
        body: {
          username: values.get("username"),
          password: values.get("password"),
          ...(setup ? { workspace: values.get("workspace") } : {}),
        },
      });
      complete(result);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-icon">
            <ChartNoAxesCombined size={23} />
          </span>
          <span>
            CodingHubs<small>LOCAL GROWTH WORKSPACE</small>
          </span>
        </div>
        <div>
          <div className="pill">
            <Leaf size={12} /> Local by design
          </div>
          <h1>
            Better search decisions.
            <br />
            Your data stays here.
          </h1>
          <p>
            Turn first-party search data and your own expertise into a practical
            organic growth workflow.
          </p>
        </div>
        <p style={{ fontSize: 11 }}>
          Local models. Evidence-led recommendations.
          <br />
          No paid API dependency. No automatic publishing.
        </p>
      </section>
      <section className="auth-form">
        <div className="auth-inner">
          <p className="eyebrow">Your private workspace</p>
          <h1>{setup ? "Start with a local owner" : "Welcome back"}</h1>
          <p className="muted">
            {setup
              ? "Create the first account on this computer. Your password is hashed and your session stays local."
              : "Sign in to review your sites, source data and daily actions."}
          </p>
          <form className="form-grid" onSubmit={submit}>
            {setup && (
              <label className="field">
                Workspace name
                <input
                  name="workspace"
                  required
                  minLength={2}
                  defaultValue="CodingHubs workspace"
                  autoComplete="organization"
                />
              </label>
            )}
            <label className="field">
              Username
              <input
                name="username"
                required
                minLength={3}
                maxLength={64}
                pattern="[a-zA-Z0-9_.-]+"
                autoComplete="username"
              />
            </label>
            <label className="field">
              Password
              <input
                name="password"
                aria-label="Password"
                aria-describedby="password-help"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={setup ? "new-password" : "current-password"}
              />
              <span id="password-help" className="muted">
                At least 12 characters. No cloud account is required.
              </span>
            </label>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? "Please wait…"
                : setup
                  ? "Create local workspace"
                  : "Sign in"}
              <ArrowRight size={14} />
            </button>
          </form>
          <div className="divider" />
          <p className="muted">
            <ShieldCheck
              size={13}
              style={{ verticalAlign: "middle", marginRight: 5 }}
            />
            Hosted on localhost. Paid providers are disabled.
          </p>
        </div>
      </section>
    </main>
  );
}

function AddSite({
  close,
  complete,
  run,
}: {
  close: () => void;
  complete: (site: Site) => void;
  run: Run;
}) {
  const modal = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = modal.current;
    root?.querySelector<HTMLInputElement>('input')?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab' || !root) return;
      const controls = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    root?.addEventListener('keydown', keys);
    return () => { root?.removeEventListener('keydown', keys); previous?.focus(); };
  }, [close]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await run(async () => {
      const result = await api<Site>("/sites", {
        method: "POST",
        body: {
          name: values.get("name"),
          base_url: values.get("url"),
          kind: values.get("kind"),
        },
      });
      complete(result);
    }, "Website added to your local workspace");
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={modal}
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-site-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-head">
          <div>
            <h2 id="add-site-title">Add a website</h2>
            <p className="muted">
              Public website origins only. Private networks are blocked.
            </p>
          </div>
          <button className="icon-button" aria-label="Close" onClick={close}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="form-grid">
          <label className="field">
            Website name
            <input
              name="name"
              required
              minLength={2}
              defaultValue="CodingHubs"
            />
          </label>
          <label className="field">
            Website URL
            <input
              name="url"
              type="url"
              required
              defaultValue="https://codinghubs.in/"
            />
          </label>
          <label className="field">
            Website relationship
            <select name="kind">
              <option value="owned">My website</option>
              <option value="competitor">Permitted competitor research</option>
            </select>
          </label>
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              I am permitted to analyze these public pages. Owned-site schedules
              run only while this computer is on and can be disabled.
            </span>
          </label>
          <button className="button">
            Add website
            <Plus size={14} />
          </button>
        </form>
      </section>
    </div>
  );
}

function Overview({
  data,
  actions,
  agents,
  reports,
  navigate,
  site,
}: {
  data: Summary | null;
  actions: Action[];
  agents: Agent[];
  reports: Report[];
  navigate: (tab: Tab) => void;
  site: Site;
}) {
  const total = data?.totals,
    latest = data?.windows.last7?.totals,
    previous = data?.windows.previous7?.totals;
  const devices = data?.dimensions.device.rows || [];
  const open = actions.filter((action) => action.status === "open");
  const chart = (data?.chart || []).map((row) => ({
    ...row,
    day: new Date(row.key + "T12:00:00+05:30").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
  }));
  const kpis = [
    {
      label: "Organic clicks",
      value: number(total?.clicks),
      icon: MousePointer2,
      sub:
        latest && previous
          ? `${latest.clicks} vs ${previous.clicks} · latest exported week / prior week`
          : "Actual property-level clicks from the selected source",
    },
    {
      label: "Search impressions",
      value: number(total?.impressions),
      icon: ChartNoAxesCombined,
      sub: "Property total · page totals can differ",
    },
    {
      label: "Average CTR",
      value: total?.ctr_pct == null ? "—" : number(total.ctr_pct, 2) + "%",
      icon: Target,
      sub: "Calculated from summed clicks and impressions",
    },
    {
      label: "Average position",
      value:
        total?.position_approx == null
          ? "—"
          : "~" + number(total.position_approx, 2),
      icon: TrendingUp,
      sub: "Approximation from rounded daily positions",
    },
  ];
  return (
    <>
      <div className="kpis">
        {kpis.map((kpi) => (
          <article className="card kpi" key={kpi.label}>
            <div className="label">
              <kpi.icon size={15} />
              {kpi.label}
              <CircleHelp
                size={11}
                style={{ marginLeft: "auto", opacity: 0.5 }}
              />
            </div>
            <div className="value">{kpi.value}</div>
            <div className="sub">{kpi.sub}</div>
            <span className="stripe" />
          </article>
        ))}
      </div>
      <div className="grid-main">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Search performance</h2>
              <p className="muted">
                {data?.source
                  ? `${dateLabel(data.source.observed_start)} – ${dateLabel(data.source.observed_end)} · observed source dates`
                  : "Import a chart export to establish a measured baseline"}
              </p>
            </div>
            <span className="pill gray">Web search</span>
          </div>
          {chart.length ? (
            <>
              <div
                className="row wrap muted"
                style={{ justifyContent: "flex-end", marginBottom: 8 }}
              >
                <span>
                  <span
                    className="status-dot"
                    style={{ background: "#52bca8" }}
                  />
                  Impressions · left axis
                </span>
                <span>
                  <span
                    className="status-dot"
                    style={{ background: "#2a5d7a" }}
                  />
                  Clicks · right axis
                </span>
              </div>
              <div
                style={{ width: "100%", height: 240 }}
                aria-label="Daily clicks and impressions chart"
              >
<Suspense fallback={<div className="loading">Loading measured chart…</div>}><PerformanceChart data={chart}/></Suspense>
              </div>
            </>
          ) : (
            <Empty title="Your data, without the guesswork">
              Import the Search Console files to see actual search performance.
            </Empty>
          )}
          <div className="divider" />
          <div className="row between muted">
            <span>No synthetic traffic or ranking estimates.</span>
            <button
              className="small-link"
              onClick={() => navigate("integrations")}
            >
              Review data sources{" "}
              <ChevronRight size={10} style={{ verticalAlign: "middle" }} />
            </button>
          </div>
        </section>
        <section className="card devices">
          <div className="card-head">
            <div>
              <h2>Device breakdown</h2>
              <p className="muted">Impression share and observed CTR</p>
            </div>
          </div>
          {devices.length ? (
            devices.map((device) => (
              <div className="device-row" key={device.key}>
                <div className="row between">
                  <span style={{ fontSize: 11, fontWeight: 550 }}>
                    {device.key}
                  </span>
                  <span className="mini-label">
                    {number(device.clicks)} clicks
                  </span>
                </div>
                <div className="bar">
                  <span
                    style={{
                      width: `${(device.impressions / (data?.dimensions.device.totals?.impressions || 1)) * 100}%`,
                      background:
                        device.key === "Mobile" ? "#7193ae" : undefined,
                    }}
                  />
                </div>
                <div className="row between muted">
                  <span>{number(device.impressions)} impressions</span>
                  <span>{number(device.ctr_pct, 2)}% CTR</span>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">
              Import the matching device table. No segment metrics are inferred.
            </p>
          )}
          <div className="notice" style={{ marginTop: 23 }}>
            Device and ranking mix can affect CTR. A gap alone does not prove a
            UI problem.
          </div>
        </section>
      </div>
      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Your next best actions</h2>
              <p className="muted">Demand, relevance, confidence and effort</p>
            </div>
            <button className="small-link" onClick={() => navigate("actions")}>
              View all{" "}
              <ArrowRight size={11} style={{ verticalAlign: "middle" }} />
            </button>
          </div>
          {open.length ? (
            open.slice(0, 4).map((action, index) => (
              <div className="action-row" key={action.id}>
                <span className="action-number">0{index + 1}</span>
                <div className="grow">
                  <p className="action-title">
                    {action.title.replace(site.base_url, "/")}
                  </p>
                  <div className="row" style={{ marginTop: 7 }}>
                    <Badge value={action.severity} />
                    <span className="muted">{action.confidence}</span>
                  </div>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Review ${action.title}`}
                  onClick={() => navigate("actions")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ))
          ) : (
            <Empty title="Build an evidence-led action list">
              Import data, then run analysis. Unavailable evidence stays
              visible.
            </Empty>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Analysis coverage</h2>
              <p className="muted">Independent agents, honest data limits</p>
            </div>
            <span className="pill blue">{agents.length} / 20 agents</span>
          </div>
          {[
            ["Search Console", !!data?.source],
            [
              "Captured website content",
              agents.some(
                (a) => a.agent === "Technical SEO" && a.status === "complete",
              ),
            ],
            [
              "Google Analytics evidence",
              agents.some(
                (a) => a.agent === "Google Analytics" && a.status !== "blocked",
              ),
            ],
            ["Saved reports", reports.length > 0],
          ].map(([label, available]) => (
            <div
              className="row between"
              style={{ marginBottom: 19 }}
              key={String(label)}
            >
              <span className="mini-label">{label}</span>
              <span className={`pill ${available ? "" : "gray"}`}>
                {available ? (
                  <>
                    <Check size={10} />
                    Available
                  </>
                ) : (
                  "Not supplied"
                )}
              </span>
            </div>
          ))}
          <div className="divider" />
          <p className="muted">
            {agents.filter((a) => a.status === "blocked").length} agents need
            more evidence. No source is marked complete just to fill the
            dashboard.
          </p>
          <button
            className="small-link"
            style={{ marginTop: 14 }}
            onClick={() => navigate("automation")}
          >
            Inspect agent states{" "}
            <ArrowRight size={11} style={{ verticalAlign: "middle" }} />
          </button>
        </section>
      </div>
      {data?.source && (
        <p className="notice amber" style={{ marginTop: 22 }}>
          Observed through {dateLabel(data.source.observed_end)}; imported{" "}
          {dateLabel(data.source.created_at)}.{" "}
          {data.windows.last90?.complete
            ? "90 observed daily rows available."
            : "A complete 90-day daily history is not available in this source."}{" "}
          Growth in pre-release data is not attributed to new code changes.
        </p>
      )}
    </>
  );
}

function Actions({
  actions,
  run,
  site,
}: {
  actions: Action[];
  run: Run;
  site: Site;
}) {
  const [filter, setFilter] = useState("all");
  const shown = actions.filter(
    (action) => filter === "all" || action.severity === filter,
  );
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Prioritized review queue</h2>
          <p className="muted">
            Scores explain triage. Potential clicks are documented scenarios,
            never forecasts.
          </p>
        </div>
        <select
          aria-label="Filter priority"
          style={{ width: 110 }}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All priorities</option>
          <option>P1</option>
          <option>P2</option>
        </select>
      </div>
      {!shown.length ? (
        <Empty title="No actions in this view">
          Run analysis after importing first-party data or crawling permitted
          pages.
        </Empty>
      ) : (
        shown.map((action, index) => (
          <article className="action-row" key={action.id}>
            <span className="action-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="grow">
              <div className="row wrap" style={{ marginBottom: 7 }}>
                <Badge value={action.severity} />
                <span className="muted">
                  Score {number(action.score, 1)} · {action.confidence}
                </span>
              </div>
              <h3 className="action-title">{action.title}</h3>
              <JsonDetail value={action.evidence} />
            </div>
            <select
              aria-label={`Review status ${index + 1}`}
              style={{ width: 112 }}
              value={action.status}
              onChange={(event) => {
                void run(
                  () =>
                    api(`/sites/${site.id}/actions/${action.id}`, {
                      method: "POST",
                      body: { status: event.target.value },
                    }),
                  "Review state updated; no site change applied",
                );
              }}
            >
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="done">Done</option>
            </select>
          </article>
        ))
      )}
    </section>
  );
}

export default function App() {
  const [boot, setBoot] = useState<"loading" | "setup" | "login" | "ready">(
      "loading",
    ),
    [session, setSession] = useState<Session | null>(null);
  const [sites, setSites] = useState<Site[]>([]),
    [siteId, setSiteId] = useState(""),
    [tab, setTab] = useState<Tab>("overview");
  const [system, setSystem] = useState<System | null>(null),
    [summary, setSummary] = useState<Summary | null>(null);
  const [actions, setActions] = useState<Action[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [agents, setAgents] = useState<Agent[]>([]),
    [reports, setReports] = useState<Report[]>([]),
    [pages, setPages] = useState<Page[]>([]);
  const [mobile, setMobile] = useState(false),
    [adding, setAdding] = useState(false),
    [refreshKey, setRefreshKey] = useState(0),
    [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
    null,
  );
  const closeSite = useCallback(() => setAdding(false), []);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const run: Run = async (work, success) => {
    setBusy(true);
    try {
      await work();
      if (success) setToast({ text: success });
      refresh();
    } catch (error) {
      setToast({ text: errorText(error), error: true });
    } finally {
      setBusy(false);
    }
  };
  const authenticated = (value: Session) => {
    setSession(value);
    setCsrf(value.csrf);
    setBoot("ready");
  };
  useEffect(() => {
    void (async () => {
      try {
        const setup = await api<{ required: boolean }>("/auth/setup");
        if (setup.required) setBoot("setup");
        else {
          try {
            authenticated(await api<Session>("/auth/session"));
          } catch {
            setBoot("login");
          }
        }
      } catch (error) {
        setToast({ text: errorText(error), error: true });
        setBoot("login");
      }
    })();
  }, []);
  useEffect(() => {
    onUnauthorized(() => {
      setSession(null);
      setSites([]);
      setSiteId("");
      setSummary(null);
      setActions([]);
      setCsrf("");
      setBoot("login");
    });
    return () => onUnauthorized(null);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void Promise.all([api<Site[]>("/sites"), api<System>("/system")])
      .then(([sites, system]) => {
        if (!cancelled) {
          setSites(sites);
          setSystem(system);
          setSiteId((current) =>
            sites.some((site) => site.id === current)
              ? current
              : sites[0]?.id || "",
          );
        }
      })
      .catch((error) => {
        if (!cancelled) setToast({ text: errorText(error), error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [session]);
  useEffect(() => {
    setSummary(null);
    setActions([]);
    setJobs([]);
    setAgents([]);
    setReports([]);
    setPages([]);
  }, [siteId]);
  useEffect(() => {
    if (!siteId || !session) return;
    let cancelled = false;
    async function load() {
      try {
        const prefix = `/sites/${siteId}`;
        const [summary, actions, jobs, agents, reports, pages] =
          await Promise.all([
            api<Summary>(prefix + "/summary"),
            api<Action[]>(prefix + "/actions"),
            api<Job[]>(prefix + "/jobs"),
            api<Agent[]>(prefix + "/agents"),
            api<Report[]>(prefix + "/reports"),
            api<Page[]>(prefix + "/pages"),
          ]);
        if (!cancelled) {
          setSummary(summary);
          setActions(actions);
          setJobs(jobs);
          setAgents(agents);
          setReports(reports);
          setPages(pages);
        }
      } catch (error) {
        if (!cancelled) setToast({ text: errorText(error), error: true });
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [siteId, session, refreshKey]);
  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => {
      void api<System>("/system")
        .then(setSystem)
        .catch(() => {});
    }, 60000);
    return () => window.clearInterval(timer);
  }, [session]);
  const site = sites.find((site) => site.id === siteId);
  const navigate = (value: Tab) => {
    setTab(value);
    setMobile(false);
  };
  const panelProps: PanelProps | null = site
    ? { site, run, refresh, jobs, pages, system }
    : null;
  const current = NAV.find((item) => item.id === tab);
  const activeJobs = jobs.filter((job) =>
    ["queued", "running", "waiting_quota"].includes(job.status),
  );
  if (boot === "loading")
    return <div className="loading">Connecting to your local workspace…</div>;
  if (boot !== "ready" || !session)
    return (
      <>
        <Auth setup={boot === "setup"} complete={authenticated} />
        {toast && (
          <div className="toast error" role="alert">
            {toast.text}
          </div>
        )}
      </>
    );
  return (
    <div className="app">
      <aside
        className={`sidebar ${mobile ? "open" : ""}`}
        aria-label="Workspace navigation"
      >
        <button
          className="mobile-close icon-button"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        >
          <X size={17} />
        </button>
        <div className="brand">
          <span className="brand-icon">
            <ChartNoAxesCombined size={22} />
          </span>
          <span>
            CodingHubs<small>SEO WORKSPACE</small>
          </span>
        </div>
        <p className="nav-section">Growth intelligence</p>
        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="nav" style={{ marginBottom: 17 }}>
            <button
              className={tab === "system" ? "active" : ""}
              onClick={() => navigate("system")}
            >
              <Settings2 size={16} />
              System & privacy
            </button>
          </div>
          <div className="local-card">
            <strong>
              <span className="status-dot" />
              Local workspace
            </strong>
            {system?.profile || "Lightweight"} profile · ₹0 API budget
            <br />
            Paid integrations blocked
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="site-picker">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={19} />
            </button>
            <Globe2 size={17} color="#7794a6" />
            <select
              aria-label="Selected website"
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
            >
              {!sites.length && <option value="">Choose a website</option>}
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              aria-label="Add website"
              onClick={() => setAdding(true)}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="top-actions">
            <span className="pill hide-mobile">
              <ShieldCheck size={11} />
              Local & private
            </span>
            <button
              className="icon-button"
              aria-label="View reports"
              onClick={() => navigate("reports")}
            >
              <Bell size={16} />
            </button>
            <span className="avatar" title={session.username}>
              {session.username.slice(0, 2).toUpperCase()}
            </span>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={() => {
                void run(async () => {
                  await api("/auth/logout", { method: "POST" });
                  setSession(null);
                  setCsrf("");
                  setSites([]);
                  setSiteId("");
                  setBoot("login");
                });
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>
        <div className="content" aria-busy={busy}>
          <div className="page-head">
            <div>
              <p className="eyebrow">
                Workspace{" "}
                <ChevronRight size={9} style={{ verticalAlign: "middle" }} />{" "}
                {site?.name || "Get started"}
              </p>
              <h1>{tab === "system" ? "System & privacy" : current?.label}</h1>
              <p className="muted">{DESCRIPTIONS[tab]}</p>
            </div>
            {site && (
              <div className="row wrap">
                <button
                  className="button secondary"
                  onClick={() => navigate("integrations")}
                >
                  <ArrowDownToLine size={13} />
                  Import data
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    void run(
                      () =>
                        api(`/sites/${site.id}/jobs`, {
                          method: "POST",
                          body: { kind: "analyze" },
                        }),
                      "Analysis queued for the local worker",
                    );
                  }}
                >
                  <Sparkles size={13} />
                  Run analysis
                </button>
              </div>
            )}
          </div>
          {activeJobs.length > 0 && (
            <div className="notice" style={{ marginBottom: 20 }} role="status">
              <span className="status-dot" />
              {activeJobs.length} queued/running job
              {activeJobs.length > 1 ? "s" : ""}.{" "}
              <button
                className="small-link"
                onClick={() => navigate("automation")}
              >
                Inspect progress and controls
              </button>
            </div>
          )}
          {!site ? (
            <section className="card">
              <Empty title="Add your first website">
                Connect a public website, import first-party data and build a
                measured baseline.
                <br />
                <button
                  className="button"
                  style={{ marginTop: 20 }}
                  onClick={() => setAdding(true)}
                >
                  Add website
                  <Plus size={13} />
                </button>
              </Empty>
            </section>
          ) : (
            <>
              {tab === "overview" && (
                <Overview
                  site={site}
                  data={summary}
                  actions={actions}
                  agents={agents}
                  reports={reports}
                  navigate={navigate}
                />
              )}
              {tab === "actions" && (
                <Actions site={site} actions={actions} run={run} />
              )}
              {panelProps && tab === "keywords" && (
                <KeywordsPanel key={site.id} {...panelProps} />
              )}
              {panelProps && tab === "audit" && (
                <AuditPanel key={site.id} {...panelProps} />
              )}
              {panelProps && tab === "knowledge" && (
                <KnowledgePanel key={site.id} {...panelProps} />
              )}
              {panelProps && tab === "content" && (
                <ContentPanel key={site.id} {...panelProps} />
              )}
              {panelProps && tab === "integrations" && (
                <IntegrationsPanel key={site.id} {...panelProps} />
              )}
              {panelProps && tab === "automation" && (
                <AutomationPanel
                  key={site.id}
                  {...panelProps}
                  agents={agents}
                />
              )}
              {panelProps && tab === "proposals" && (
                <ProposalsPanel key={site.id} {...panelProps} />
              )}
              {panelProps && tab === "reports" && (
                <ReportsPanel key={site.id} {...panelProps} reports={reports} />
              )}
              {tab === "system" && <SystemPanel system={system} run={run} />}
            </>
          )}
          <p
            className="muted"
            style={{ textAlign: "center", marginTop: 32, fontSize: 9 }}
          >
            CODINGHUBS LOCAL SEO · Your evidence, your decisions · No automatic
            publication or deployment
          </p>
        </div>
      </main>
      {adding && (
        <AddSite
          close={closeSite}
          run={run}
          complete={(site) => {
            setSites((previous) => [...previous, site]);
            setSiteId(site.id);
            setAdding(false);
          }}
        />
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
