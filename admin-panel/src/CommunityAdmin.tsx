import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "./api";
import "./community-admin.css";

type Paged<T> = { count: number; results: T[] };
type Subscriber = {
  id: number;
  email: string;
  status: string;
  source: string;
  consent_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
};
type Issue = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content_html: string;
  is_published: boolean;
  published_at: string | null;
};
type Campaign = {
  id: number;
  subject: string;
  created_at: string;
  counts: Record<string, number>;
};
type Preview = {
  title: string;
  content_html: string;
  confirmed_recipients: number;
  preview_token: string;
};
const date = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-IN") : "—";
const emptyIssue = {
  slug: "",
  title: "",
  excerpt: "",
  content_html: "",
  is_published: false,
};
function message(error: unknown) {
  return (error as { response?: { status: number } }).response?.status === 403
    ? "You do not have permission for this action."
    : "The action could not be completed. Check the fields and try again.";
}
async function download(url: string, filename: string) {
  const { data } = await adminApi.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function NewsletterAdmin() {
  const [tab, setTab] = useState("subscribers");
  const [rows, setRows] = useState<Paged<Subscriber> | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuePage, setIssuePage] = useState(1);
  const [issueCount, setIssueCount] = useState(0);
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignCount, setCampaignCount] = useState(0);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [deliveryCampaign, setDeliveryCampaign] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(emptyIssue);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const key = useRef(crypto.randomUUID());
  const [deliveries, setDeliveries] = useState<
    { id: number; subscriber_id: number; status: string; error_code: string }[]
  >([]);
  useEffect(() => {
    let active = true;
    setError("");
    const t = setTimeout(() => {
      adminApi
        .get<Paged<Subscriber>>("/newsletter/subscribers/", {
          params: { q, status, page },
        })
        .then((r) => {
          if (active) setRows(r.data);
        })
        .catch((e) => {
          if (active) setError(message(e));
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, status, page, tick]);
  useEffect(() => {
    let active = true;
    Promise.all([
      adminApi.get<Paged<Issue>>("/newsletter/issues/", {
        params: { page: issuePage },
      }),
      adminApi.get<Paged<Campaign>>("/newsletter/campaigns/", {
        params: { page: campaignPage },
      }),
    ])
      .then(([a, b]) => {
        if (active) {
          setIssues(a.data.results);
          setIssueCount(a.data.count);
          setCampaignCount(b.data.count);
          setCampaigns(b.data.results);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [tick, issuePage, campaignPage]);
  useEffect(() => {
    if (!deliveryCampaign) return;
    let active = true;
    adminApi
      .get<
        Paged<{
          id: number;
          subscriber_id: number;
          status: string;
          error_code: string;
        }>
      >(`/newsletter/campaigns/${deliveryCampaign}/deliveries/`, {
        params: { page: deliveryPage },
      })
      .then((r) => {
        if (active) {
          setDeliveries(r.data.results);
          setDeliveryCount(r.data.count);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [deliveryCampaign, deliveryPage, tick]);
  useEffect(() => {
    setSelected("");
    setPreview(null);
    setConfirmation("");
  }, [tab, issuePage]);
  async function action(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await fn();
      setNote(success);
      setTick((x) => x + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    await action(async () => {
      const r = editing
        ? await adminApi.patch<Issue>(`/newsletter/issues/${editing}/`, form)
        : await adminApi.post<Issue>("/newsletter/issues/", form);
      setEditing(r.data.id);
      setForm(r.data);
    }, "Issue saved. Website publication does not send email.");
    setPreview(null);
  }
  return (
    <div className="cm-admin">
      <h1 className="ad-h1">Newsletter</h1>
      <p className="ad-muted">
        Manage consent, published issues and explicitly queued email campaigns.
      </p>
      <nav className="cm-tabs" aria-label="Newsletter admin">
        {["subscribers", "issues", "campaigns"].map((t) => (
          <button
            key={t}
            className="ad-btn"
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setError("");
              setNote("");
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      {error && (
        <p className="ad-error" role="alert">
          {error}
        </p>
      )}
      {note && <p role="status">{note}</p>}
      {tab === "subscribers" && (
        <>
          <div className="cm-fields">
            <label>
              Search email
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {["pending", "confirmed", "unsubscribed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button
              className="ad-btn"
              disabled={busy}
              onClick={() =>
                action(
                  () =>
                    download(
                      `/newsletter/subscribers/export/?q=${encodeURIComponent(q)}&status=${status}`,
                      "newsletter-subscribers.csv",
                    ),
                  "Export prepared.",
                )
              }
            >
              Export filtered CSV
            </button>
          </div>
          {!rows ? (
            <p role="status">Loading subscribers…</p>
          ) : (
            <>
              <div className="ad-tablewrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Status / source</th>
                      <th>Consent</th>
                      <th>Confirmed</th>
                      <th>Unsubscribed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.results.map((s) => (
                      <tr key={s.id}>
                        <td>{s.email}</td>
                        <td>
                          {s.status}
                          <br />
                          {s.source}
                        </td>
                        <td>{date(s.consent_at)}</td>
                        <td>{date(s.confirmed_at)}</td>
                        <td>{date(s.unsubscribed_at)}</td>
                        <td>
                          <button
                            disabled={busy || s.status === "unsubscribed"}
                            onClick={() =>
                              action(
                                () =>
                                  adminApi.post(
                                    `/newsletter/subscribers/${s.id}/`,
                                  ),
                                "Subscriber unsubscribed.",
                              )
                            }
                          >
                            Unsubscribe
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Delete this subscriber and associated delivery history?",
                                )
                              )
                                void action(
                                  () =>
                                    adminApi.delete(
                                      `/newsletter/subscribers/${s.id}/`,
                                    ),
                                  "Subscriber deleted.",
                                );
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.count === 0 && <p>No subscribers match these filters.</p>}
              <div className="cm-tabs">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  disabled={page * 25 >= rows.count}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}
      {tab === "issues" && (
        <div className="cm-columns">
          <section>
            <h2>Issues</h2>
            <button
              className="ad-btn"
              onClick={() => {
                setEditing(null);
                setForm(emptyIssue);
                setPreview(null);
              }}
            >
              New issue
            </button>
            <div className="cm-tabs">
              <button
                disabled={issuePage === 1}
                onClick={() => setIssuePage((p) => p - 1)}
              >
                Previous issues
              </button>
              <span>Page {issuePage}</span>
              <button
                disabled={issuePage * 25 >= issueCount}
                onClick={() => setIssuePage((p) => p + 1)}
              >
                Next issues
              </button>
            </div>
            {issues.length === 0 && <p>No issues yet.</p>}
            <ul>
              {issues.map((i) => (
                <li key={i.id}>
                  <button
                    onClick={() => {
                      setEditing(i.id);
                      setForm(i);
                      setPreview(null);
                    }}
                  >
                    {i.title} · {i.is_published ? "Published" : "Draft"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <form onSubmit={save} className="cm-form">
            <h2>{editing ? "Edit issue" : "Create issue"}</h2>
            <label>
              Title
              <input
                required
                maxLength={160}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Slug
              <input
                required
                pattern="[a-z0-9-]+"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
            <label>
              Excerpt
              <textarea
                required
                maxLength={300}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </label>
            <label>
              Content (HTML, sanitized by server)
              <textarea
                required
                rows={14}
                value={form.content_html}
                onChange={(e) =>
                  setForm({ ...form, content_html: e.target.value })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) =>
                  setForm({ ...form, is_published: e.target.checked })
                }
              />{" "}
              Publish on website
            </label>
            <button className="ad-btn" disabled={busy}>
              Save issue
            </button>
            {editing && (
              <button
                type="button"
                className="ad-btn"
                onClick={() =>
                  action(async () => {
                    const r = await adminApi.get<Preview>(
                      `/newsletter/issues/${editing}/preview/`,
                    );
                    setPreview(r.data);
                  }, "Preview loaded from saved content.")
                }
              >
                Preview saved issue
              </button>
            )}
            {preview && (
              <section className="cm-preview" aria-label="Issue preview">
                <h3>{preview.title}</h3>
                <div
                  dangerouslySetInnerHTML={{ __html: preview.content_html }}
                />
              </section>
            )}
          </form>
        </div>
      )}
      {tab === "campaigns" && (
        <>
          <section className="cm-form">
            <h2>Preview and queue a campaign</h2>
            <p>
              Only confirmed subscribers are queued. The worker checks their
              subscription again before delivery.
            </p>
            <div className="cm-tabs">
              <button
                disabled={issuePage === 1}
                onClick={() => setIssuePage((p) => p - 1)}
              >
                Previous issue choices
              </button>
              <button
                disabled={issuePage * 25 >= issueCount}
                onClick={() => setIssuePage((p) => p + 1)}
              >
                More issue choices
              </button>
            </div>
            <label>
              Published issue
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setPreview(null);
                  setConfirmation("");
                  key.current = crypto.randomUUID();
                }}
              >
                <option value="">Choose an issue</option>
                {issues
                  .filter((i) => i.is_published)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
              </select>
            </label>
            <button
              disabled={!selected || busy}
              className="ad-btn"
              onClick={() =>
                action(async () => {
                  const r = await adminApi.get<Preview>(
                    `/newsletter/issues/${selected}/preview/`,
                  );
                  setPreview(r.data);
                }, "Review the preview before confirming.")
              }
            >
              Preview recipients and content
            </button>
            {preview && (
              <>
                <p>
                  {preview.confirmed_recipients} currently confirmed recipients.
                  Final eligibility is checked at send time.
                </p>
                <section className="cm-preview">
                  <h3>{preview.title}</h3>
                  <div
                    dangerouslySetInnerHTML={{ __html: preview.content_html }}
                  />
                  <p>Each email includes a personal unsubscribe link.</p>
                </section>
                <label>
                  Type SEND to queue this campaign
                  <input
                    autoComplete="off"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
                <button
                  disabled={busy || confirmation !== "SEND"}
                  className="ad-btn"
                  onClick={() =>
                    action(
                      () =>
                        adminApi.post("/newsletter/campaigns/", {
                          issue: Number(selected),
                          idempotency_key: key.current,
                          confirmation,
                          preview_token: preview.preview_token,
                        }),
                      "Campaign recorded. Repeated requests reuse the existing campaign. Check delivery status below.",
                    )
                  }
                >
                  Queue campaign
                </button>
              </>
            )}
          </section>
          <h2>Delivery history</h2>
          <div className="cm-tabs">
            <button
              disabled={campaignPage === 1}
              onClick={() => setCampaignPage((p) => p - 1)}
            >
              Previous campaigns
            </button>
            <span>Page {campaignPage}</span>
            <button
              disabled={campaignPage * 25 >= campaignCount}
              onClick={() => setCampaignPage((p) => p + 1)}
            >
              Next campaigns
            </button>
          </div>
          {campaigns.length === 0 && <p>No campaigns have been queued.</p>}
          <ul>
            {campaigns.map((c) => (
              <li key={c.id}>
                <strong>{c.subject}</strong> · {date(c.created_at)}
                <pre>{JSON.stringify(c.counts)}</pre>
                <button
                  onClick={() =>
                    action(async () => {
                      const r = await adminApi.get<
                        Paged<{
                          id: number;
                          subscriber_id: number;
                          status: string;
                          error_code: string;
                        }>
                      >(`/newsletter/campaigns/${c.id}/deliveries/`);
                      setDeliveryPage(1);
                      setDeliveryCampaign(c.id);
                      setDeliveries(r.data.results);
                      setDeliveryCount(r.data.count);
                    }, "Delivery statuses loaded.")
                  }
                >
                  Inspect deliveries
                </button>
              </li>
            ))}
          </ul>
          {deliveryCampaign && (
            <div className="cm-tabs">
              <button
                disabled={deliveryPage === 1}
                onClick={() => setDeliveryPage((p) => p - 1)}
              >
                Previous deliveries
              </button>
              <span>Page {deliveryPage}</span>
              <button
                disabled={deliveryPage * 25 >= deliveryCount}
                onClick={() => setDeliveryPage((p) => p + 1)}
              >
                Next deliveries
              </button>
            </div>
          )}
          {deliveries.length > 0 && (
            <ul aria-label="Delivery statuses">
              {deliveries.map((d) => (
                <li key={d.id}>
                  Recipient #{d.subscriber_id}: {d.status} {d.error_code}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

type Brochure = {
  title: string;
  description: string;
  download_name: string;
  original_name: string;
  size: number;
  is_published: boolean;
  updated_at: string;
  download_url: string;
};
export function BrochureAdmin() {
  const { id } = useParams();
  const [course, setCourse] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    download_name: "",
    is_published: true,
  });
  const [data, setData] = useState<Brochure | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    adminApi
      .get<
        { id: number; name: string }[] | Paged<{ id: number; name: string }>
      >("/courses/")
      .then((r) => {
        if (active)
          setCourse(
            (Array.isArray(r.data) ? r.data : r.data.results).find(
              (c) => c.id === Number(id),
            )?.name || "Course",
          );
      });
    adminApi
      .get<Brochure>(`/courses/${id}/brochure/`)
      .then((r) => {
        if (active) {
          setData(r.data);
          setForm(r.data);
        }
      })
      .catch((e) => {
        if (active && e.response?.status !== 404) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [id, tick]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      let r;
      if (file) {
        const body = new FormData();
        Object.entries(form).forEach(([k, v]) => body.append(k, String(v)));
        body.append("file", file);
        r = await adminApi.put<Brochure>(`/courses/${id}/brochure/`, body);
      } else
        r = await adminApi.patch<Brochure>(`/courses/${id}/brochure/`, form);
      setData(r.data);
      setForm(r.data);
      setFile(null);
      setNote("Brochure saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cm-admin">
      <Link to="/courses">← Courses</Link>
      <h1 className="ad-h1">{course} brochure</h1>
      <p>
        One PDF per course. Published brochures appear on the website's Course
        Brochures page (/brochures/) with Download and View buttons.
      </p>
      {error && (
        <p role="alert" className="ad-error">
          {error}
        </p>
      )}
      {note && <p role="status">{note}</p>}
      {data ? (
        <section>
          <p>
            Original: {data.original_name} · {(data.size / 1024).toFixed(1)} KB
            · Updated {date(data.updated_at)} ·{" "}
            {data.is_published ? "Published" : "Draft"}
          </p>
          <p className={data.is_published ? "ad-muted" : "ad-error"}>
            {data.is_published
              ? "Showing on the website at /brochures/ (only while the course itself is switched on in Courses)."
              : "Draft: not shown on the website. Tick “Published for public download” and save to show it."}
          </p>
          <button
            className="ad-btn"
            onClick={() =>
              download(data.download_url, data.download_name).catch((e) =>
                setError(message(e)),
              )
            }
          >
            Download current PDF
          </button>
          <button
            className="ad-btn"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Remove this brochure? The course will remain available.",
                )
              )
                return;
              setBusy(true);
              try {
                await adminApi.delete(`/courses/${id}/brochure/`);
                setData(null);
                setForm({
                  title: "",
                  description: "",
                  download_name: "",
                  is_published: true,
                });
                setNote("Brochure removed.");
                setTick((x) => x + 1);
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove brochure
          </button>
        </section>
      ) : (
        <p>No brochure is uploaded for this course.</p>
      )}
      <form className="cm-form" onSubmit={save}>
        <label>
          PDF file (up to 10 MB by default)
          <input
            key={data?.updated_at || "new"}
            type="file"
            accept="application/pdf,.pdf"
            required={!data}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <label>
          Title
          <input
            required
            maxLength={180}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            maxLength={500}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label>
          Download filename
          <input
            required
            maxLength={120}
            value={form.download_name}
            placeholder="course-brochure.pdf"
            onChange={(e) =>
              setForm({ ...form, download_name: e.target.value })
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) =>
              setForm({ ...form, is_published: e.target.checked })
            }
          />{" "}
          Published for public download
        </label>
        <p className="ad-muted">
          Ticked by default for a new brochure, so it shows on the website as
          soon as it is uploaded. Untick to keep it hidden.
        </p>
        <button className="ad-btn" disabled={busy || (!data && !file)}>
          {busy
            ? "Saving…"
            : file
              ? "Upload / replace PDF"
              : "Save details and status"}
        </button>
      </form>
    </div>
  );
}
