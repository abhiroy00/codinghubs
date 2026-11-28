import { useState } from "react";
import type { FormEvent } from "react";
import {
  Archive,
  Check,
  Download,
  FileCode2,
  FolderGit2,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { api, bytes, dateLabel, number, setCsrf } from "./api";
import { Badge, Empty, JsonDetail } from "./ui";
import { Jobs, LoadError, useData } from "./shared";
import type {
  Agent,
  PanelProps,
  Proposal,
  Report,
  Repository,
  Run,
  Schedule,
  System,
} from "./types";

function ScheduleRow({
  schedule,
  siteId,
  run,
  reload,
}: {
  schedule: Schedule;
  siteId: string;
  run: Run;
  reload: () => void;
}) {
  const [enabled, setEnabled] = useState(schedule.enabled),
    [hour, setHour] = useState(schedule.hour),
    [minute, setMinute] = useState(schedule.minute);
  return (
    <tr>
      <td>
        <strong style={{ fontWeight: 550 }}>{schedule.name}</strong>
        <p className="muted">
          {schedule.cadence} · {schedule.kind}
        </p>
      </td>
      <td>
        <label className="checkbox">
          <input
            aria-label={`Enable ${schedule.name}`}
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {enabled ? "Enabled" : "Paused"}
        </label>
      </td>
      <td>
        <div className="row" style={{ minWidth: 133 }}>
          <input
            aria-label={`Hour for ${schedule.name}`}
            type="number"
            min={0}
            max={23}
            value={hour}
            onChange={(event) => setHour(Number(event.target.value))}
            style={{ width: 62 }}
          />
          :
          <input
            aria-label={`Minute for ${schedule.name}`}
            type="number"
            min={0}
            max={59}
            value={minute}
            onChange={(event) => setMinute(Number(event.target.value))}
            style={{ width: 62 }}
          />
        </div>
      </td>
      <td className="muted">
        {schedule.last_slot
          ? dateLabel(schedule.last_slot, true)
          : "No slot run yet"}
      </td>
      <td>
        <button
          className="button secondary"
          onClick={() => {
            void run(async () => {
              await api(`/sites/${siteId}/schedules/${schedule.id}`, {
                method: "POST",
                body: { enabled, hour, minute },
              });
              reload();
            }, "Schedule updated in Asia/Kolkata time");
          }}
        >
          <Save size={12} />
          Save
        </button>
      </td>
    </tr>
  );
}

export function AutomationPanel({
  site,
  jobs,
  run,
  agents,
}: PanelProps & { agents: Agent[] }) {
  const schedules = useData<Schedule[]>(`/sites/${site.id}/schedules`, []);
  return (
    <div className="stack">
      <p className="notice">
        Schedules use <strong>Asia/Kolkata</strong>. The local host and worker
        must be running. After shutdown, the latest missed slot is coalesced
        into one run; the app does not claim jobs ran while powered off.
      </p>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Daily, weekly & monthly schedule</h2>
            <p className="muted">
              Changes take effect only after Save. Competitor schedules begin
              paused.
            </p>
          </div>
          <Badge value="Local scheduler" />
        </div>
        <LoadError error={schedules.error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>State</th>
                <th>Kolkata time</th>
                <th>Last scheduled slot</th>
                <th>Apply</th>
              </tr>
            </thead>
            <tbody>
              {schedules.data.map((schedule) => (
                <ScheduleRow
                  key={schedule.id + schedule.last_slot}
                  schedule={schedule}
                  siteId={site.id}
                  run={run}
                  reload={schedules.reload}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Persistent job history</h2>
          <span className="muted">
            Latest 8 jobs · all states remain in the database
          </span>
        </div>
        {jobs.length ? (
          <Jobs jobs={jobs} run={run} siteId={site.id} />
        ) : (
          <Empty title="No jobs yet">
            Start an analysis, crawl or local draft. Daily automation will use
            the configured slots.
          </Empty>
        )}
      </section>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Independent agent states</h2>
            <p className="muted">
              Local rules first. Inference is requested separately when useful.
            </p>
          </div>
          <span className="pill blue">{agents.length} / 20</span>
        </div>
        {!agents.length ? (
          <Empty title="Run your first analysis">
            Every agent records a result, a blocked data requirement or a
            failure.
          </Empty>
        ) : (
          <div className="agent-list">
            {agents.map((agent) => (
              <article className="agent-item" key={agent.agent}>
                <div className="row between">
                  <h3>{agent.agent}</h3>
                  <Badge value={agent.status} />
                </div>
                <p className="muted" style={{ margin: "7px 0 10px" }}>
                  {agent.summary}
                </p>
                <JsonDetail value={agent.evidence} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function ReportsPanel({
  site,
  reports,
}: PanelProps & { reports: Report[] }) {
  return (
    <div className="stack">
      {!reports.length ? (
        <section className="card">
          <Empty title="Your first report starts with evidence">
            Import data and run analysis. The Reporting agent saves a report and
            a local notification.
          </Empty>
        </section>
      ) : (
        reports.map((report) => (
          <article className="card" key={report.id}>
            <div className="card-head">
              <div>
                <p className="eyebrow">{report.kind} review</p>
                <h2>
                  Organic growth evidence · {dateLabel(report.created_at)}
                </h2>
                <p className="muted">
                  {site.name} · generated locally at{" "}
                  {dateLabel(report.created_at, true)}
                </p>
              </div>
              <a
                className="button secondary"
                href={`/api/sites/${site.id}/reports/${report.id}/download`}
              >
                <Download size={12} />
                Export JSON
              </a>
            </div>
            <div className="row wrap" style={{ marginBottom: 18 }}>
              <span className="pill blue">
                {report.data.totals
                  ? number(report.data.totals.clicks) + " measured clicks"
                  : "No click baseline supplied"}
              </span>
              <span className="pill gray">
                Source through {dateLabel(report.data.source?.observed_end)}
              </span>
              <span className="pill gray">
                {report.data.agents?.filter(
                  (agent) => agent.status === "blocked",
                ).length || 0}{" "}
                evidence gaps
              </span>
            </div>
            <p className="muted">
              Targets are goals, not guarantees. Imported data, assumptions and
              blocked integrations remain part of the report.
            </p>
            <div style={{ marginTop: 15 }}>
              <JsonDetail
                value={report.data}
                label="Inspect the complete evidence and limitations"
              />
            </div>
          </article>
        ))
      )}
    </div>
  );
}

export function ProposalsPanel({ site, run }: PanelProps) {
  const repositories = useData<Repository[]>(
    `/sites/${site.id}/repositories`,
    [],
  );
  const proposals = useData<Proposal[]>(`/sites/${site.id}/proposals`, []);
  const [repositoryId, setRepositoryId] = useState(""),
    [path, setPath] = useState(""),
    [source, setSource] = useState<{ hash: string; content: string } | null>(
      null,
    );
  const [oldText, setOldText] = useState(""),
    [newText, setNewText] = useState("");
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!source) return;
    await run(async () => {
      await api(`/sites/${site.id}/proposals`, {
        method: "POST",
        body: {
          repository_id: repositoryId,
          path,
          before_hash: source.hash,
          old_text: oldText,
          new_text: newText,
        },
      });
      proposals.reload();
    }, "Concrete diff prepared. No file has been changed.");
  }
  function operation(
    proposal: Proposal,
    operation: string,
    approval: string,
    message: string,
  ) {
    if (operation !== "test" && !window.confirm(message)) return;
    void run(async () => {
      await api(`/sites/${site.id}/proposals/${proposal.id}`, {
        method: "POST",
        body: { operation, approval },
      });
      proposals.reload();
    }, message);
  }
  return (
    <div className="stack">
      <p className="notice">
        A proposal is a reviewable local diff. Approval and application are
        separate. Sensitive paths, stale source, symlinks and dirty repositories
        are refused. There is no automatic commit, push or production
        deployment.
      </p>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Prepare a source change</h2>
            <p className="muted">
              Local repository access must be granted by the computer’s owner
              first.
            </p>
          </div>
          <FolderGit2 size={19} color="#18847b" />
        </div>
        <LoadError error={repositories.error || proposals.error} />
        {!repositories.data.length ? (
          <Empty title="No repository is authorized for this website">
            Register one through the local CLI using this site ID:
            <pre>{`python -m app.cli register-repo --site ${site.id} --path /absolute/repository/path`}</pre>
            The path must match an OS-owner configured allowed root. Another
            workspace cannot reuse this permission.
          </Empty>
        ) : (
          <form className="form-grid" onSubmit={create}>
            <div className="two-col">
              <label className="field">
                Registered repository
                <select aria-label="Registered repository"
                  value={repositoryId}
                  onChange={(event) => {
                    setRepositoryId(event.target.value);
                    setSource(null);
                  }}
                  required
                >
                  <option value="">Choose an authorized repository</option>
                  {repositories.data.map((repo) => (
                    <option value={repo.id} key={repo.id}>
                      {repo.name} · {repo.frameworks.join(", ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Relative source path
                <input
                  value={path}
                  onChange={(event) => {
                    setPath(event.target.value);
                    setSource(null);
                  }}
                  required
                  placeholder="frontend/src/seo/site.ts"
                />
              </label>
            </div>
            <button
              type="button"
              className="button secondary"
              disabled={!repositoryId || !path}
              onClick={() => {
                void run(async () =>
                  setSource(
                    await api(
                      `/sites/${site.id}/repositories/${repositoryId}/file?path=${encodeURIComponent(path)}`,
                    ),
                  ),
                );
              }}
            >
              <FileCode2 size={13} />
              Load current source preview
            </button>
            {source && (
              <>
                <label className="field">
                  Current source (read only)
                  <textarea aria-label="Current source (read only)"
                    value={source.content}
                    readOnly
                    rows={6}
                    className="code"
                  />
                </label>
                <div className="two-col">
                  <label className="field">
                    Exact existing fragment
                    <textarea aria-label="Exact existing fragment"
                      value={oldText}
                      onChange={(event) => setOldText(event.target.value)}
                      required
                      rows={5}
                      maxLength={20000}
                      className="code"
                    />
                  </label>
                  <label className="field">
                    Proposed replacement
                    <textarea aria-label="Proposed replacement"
                      value={newText}
                      onChange={(event) => setNewText(event.target.value)}
                      rows={5}
                      maxLength={50000}
                      className="code"
                    />
                  </label>
                </div>
                <button className="button" disabled={!oldText}>
                  <FolderGit2 size={13} />
                  Generate reviewable diff
                </button>
              </>
            )}
          </form>
        )}
      </section>
      {proposals.data.map((proposal) => (
        <section className="card" key={proposal.id}>
          <div className="card-head">
            <div>
              <h2>{proposal.path}</h2>
              <p className="muted">
                {proposal.branch || "No feature branch created yet"}
              </p>
            </div>
            <Badge value={proposal.status} />
          </div>
          <pre>{proposal.diff}</pre>
          <div className="row wrap" style={{ marginTop: 18 }}>
            {proposal.status === "pending" && (
              <button
                className="button secondary"
                onClick={() =>
                  operation(
                    proposal,
                    "approve",
                    "approve local diff",
                    "Approve this exact local diff? This does not apply it yet.",
                  )
                }
              >
                <Check size={12} />
                Approve this diff
              </button>
            )}
            {proposal.status === "approved" && (
              <button
                className="button"
                onClick={() =>
                  operation(
                    proposal,
                    "apply",
                    "apply local proposal",
                    "Apply this approved diff to a new local feature branch? The repository must be clean.",
                  )
                }
              >
                <Play size={12} />
                Apply locally
              </button>
            )}
            {proposal.status === "applied" && (
              <>
                <button
                  className="button secondary"
                  onClick={() =>
                    operation(
                      proposal,
                      "test",
                      "",
                      "Run bounded static checks on this local change.",
                    )
                  }
                >
                  <ShieldCheck size={12} />
                  Run static checks
                </button>
                <button
                  className="button danger"
                  onClick={() =>
                    operation(
                      proposal,
                      "rollback",
                      "rollback local proposal",
                      "Roll back only this local change if its file, branch and commit are still unchanged?",
                    )
                  }
                >
                  <RotateCcw size={12} />
                  Roll back local change
                </button>
              </>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <JsonDetail
              value={proposal.results}
              label="Validation, framework and rollback evidence"
            />
          </div>
          <p className="muted" style={{ marginTop: 14 }}>
            Framework behavior tests and any GitHub PR require separate,
            explicit local review. Static checks do not prove that application
            behavior is correct.
          </p>
        </section>
      ))}
    </div>
  );
}

export function SystemPanel({
  system,
  run,
}: {
  system: System | null;
  run: Run;
}) {
  const [backup, setBackup] = useState<unknown>(null);
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const form = event.currentTarget;
    await run(async () => {
      const result = await api<{ csrf: string }>("/auth/password", {
        method: "POST",
        body: {
          current_password: values.get("current"),
          new_password: values.get("new"),
        },
      });
      setCsrf(result.csrf);
      form.reset();
    }, "Password changed and sessions rotated locally");
  }
  return (
    <div className="stack">
      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Zero additional API budget</h2>
              <p className="muted">
                The free-only policy is enforced in the backend.
              </p>
            </div>
            <span className="pill">
              <ShieldCheck size={11} />
              Enforced
            </span>
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 650,
              letterSpacing: -1,
              margin: "20px 0",
            }}
          >
            ₹0 <span className="muted">monthly external API budget</span>
          </div>
          {[
            "Paid AI and SEO providers disabled",
            "Cloud provisioning disabled",
            "Automatic paid upgrades disabled",
            "Ollama restricted to localhost",
            "No automatic production deployment",
          ].map((label) => (
            <p className="muted" key={label} style={{ marginTop: 10 }}>
              <Check
                size={12}
                color="#18847c"
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              {label}
            </p>
          ))}
          <div className="divider" />
          <p className="muted">
            Verified external expenditure: not available.{" "}
            {system?.cost_policy.limits ||
              "No billing feed is connected; no savings or existing-hosting costs are invented."}
          </p>
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Measured local resources</h2>
              <p className="muted">
                {system?.os} · {system?.architecture} ·{" "}
                {system?.profile || "lightweight"} profile
              </p>
            </div>
            <Badge
              value={
                system?.ai.available
                  ? "Local Ollama available"
                  : "Deterministic fallback"
              }
            />
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {[
                  [
                    "RAM",
                    `${bytes(system?.ram_available_bytes)} available / ${bytes(system?.ram_total_bytes)}`,
                  ],
                  [
                    "CPU sample",
                    system ? number(system.cpu_used_pct, 1) + "%" : "—",
                  ],
                  ["GPU utilization", "Not measured"],
                  ["Free disk", bytes(system?.disk_free_bytes)],
                  ["Database storage", bytes(system?.database_bytes)],
                  [
                    "Uploaded evidence storage",
                    bytes(system?.upload_storage_bytes),
                  ],
                  [
                    "Recorded app inference requests",
                    number(system?.local_ai_requests),
                  ],
                  [
                    "Recorded app AI elapsed time",
                    system
                      ? number(system.local_ai_processing_ms / 1000, 2) +
                        " seconds"
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: 16 }}>
            Setup benchmarks and out-of-app requests are not included in
            application counters. CPU/RAM are host-wide samples; GPU usage is
            not fabricated.
          </p>
        </section>
      </div>
      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Local model configuration</h2>
            <Badge value="No automatic downloads" />
          </div>
          <p className="muted">
            Generation: {system?.ai.default_model || "Unavailable"}
            <br />
            Embeddings: {system?.ai.embedding_model || "Unavailable"}
            <br />
            Installed local tags:{" "}
            {system?.ai.models.join(", ") || "None detected"}
          </p>
          <p className="notice" style={{ marginTop: 17 }}>
            Profiles and model names are configured by the computer’s owner.
            Models unload after inference; only one model is loaded at a time in
            the native launcher.
          </p>
          <p className="muted" style={{ marginTop: 17 }}>
            Use the local setup guide for lightweight, standard and advanced
            settings. Do not enable an oversized model just to make the
            dashboard look complete.
          </p>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Private local backups</h2>
            <Archive size={19} color="#718d9c" />
          </div>
          <p className="muted">
            The initial local administrator can create a PostgreSQL/evidence
            archive. The credential master key is intentionally excluded and
            must be stored separately. Backup files stay private on this
            computer.
          </p>
          <button
            className="button secondary"
            style={{ marginTop: 17 }}
            onClick={() => {
              if (
                window.confirm(
                  "Create a private local database/evidence backup? No external storage is used.",
                )
              )
                void run(
                  async () =>
                    setBackup(await api("/backup", { method: "POST" })),
                  "Private local backup created; keep the separate master key safe",
                );
            }}
          >
            <Archive size={12} />
            Create local backup
          </button>
          {backup != null && (
            <div style={{ marginTop: 14 }}>
              <JsonDetail
                value={backup}
                label="Backup file and recovery requirements"
              />
            </div>
          )}
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <h2>Change your local password</h2>
          <ShieldCheck size={18} color="#17877d" />
        </div>
        <form className="form-grid" onSubmit={password}>
          <div className="two-col">
            <label className="field">
              Current password
              <input
                name="current"
                type="password"
                required
                minLength={12}
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              New password
              <input
                name="new"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          </div>
          <button className="button secondary" style={{ justifySelf: "start" }}>
            Update local password
          </button>
        </form>
      </section>
    </div>
  );
}
