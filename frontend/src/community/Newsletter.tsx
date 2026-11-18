import NewsletterSignup from "./NewsletterSignup";
import { TechFeed } from "./TechFeed";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageFrame } from "../content-pages/shared";
import { HeroVideo } from "../components/HeroVideo";
import { api } from "../lib/api";
import { useSeo } from "../seo/useSeo";
import { pageSeo, LOGO_URL } from "../seo/site";
import "./public.css";
import "../content-pages/blog.css";

type Issue = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content_html?: string;
  published_at: string;
};
type Paged<T> = { count: number; results: T[] };
const NEWSLETTER_META = {
  path: "/newsletter/",
  title: "Coding & Interview Newsletter | Coding Hubs",
  description:
    "Get Coding Hubs coding tips, practical interview preparation, AI updates and course announcements. Subscribe with confirmation and read published issues.",
  image: LOGO_URL,
  indexable: true,
};

export function Newsletter() {
  useSeo(pageSeo(NEWSLETTER_META));
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [data, setData] = useState<Paged<Issue> | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api
      .get<Paged<Issue>>("/newsletter/issues/", { params: { page } })
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active) setError("Could not load published issues.");
      });
    return () => {
      active = false;
    };
  }, [page, retry]);
  return (
    <PageFrame>
      <div className="community">
        <section className="bl-hero hv-host">
          <HeroVideo clip="blog" />
          <div className="bl-hero-in">
            <p className="bl-eyebrow">Learn · Stay curious</p>
            <h1>
              The Coding Hubs <span>Newsletter</span>
            </h1>
            <p className="bl-lead">
              Practical ideas for coding, interviews and working with AI. No
              inflated promises. Unsubscribe whenever you like.
            </p>
          </div>
        </section>
        <NewsletterSignup />
        <TechFeed />
        <section aria-labelledby="published-issues">
          <h2 id="published-issues">Published issues</h2>
          {!data && !error && <p role="status">Loading issues…</p>}
          {error && (
            <p role="alert">
              {error}{" "}
              <button
                className="community-button"
                onClick={() => setRetry((x) => x + 1)}
              >
                Retry
              </button>
            </p>
          )}
          {data?.count === 0 && (
            <p>No newsletter issues have been published yet.</p>
          )}
          <div className="community-grid">
            {data?.results.map((issue) => (
              <article className="community-card" key={issue.id}>
                <small>
                  <time dateTime={issue.published_at}>
                    {new Date(issue.published_at).toLocaleDateString("en-IN", {
                      dateStyle: "long",
                    })}
                  </time>
                </small>
                <h3>
                  <Link to={`/newsletter/issues/${issue.slug}/`}>
                    {issue.title}
                  </Link>
                </h3>
                <p>{issue.excerpt}</p>
              </article>
            ))}
          </div>
          {data && data.count > 25 && (
            <nav className="community-pager" aria-label="Newsletter pages">
              <button
                disabled={page <= 1}
                onClick={() => setParams({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                disabled={page * 25 >= data.count}
                onClick={() => setParams({ page: String(page + 1) })}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      </div>
    </PageFrame>
  );
}
export function NewsletterIssue() {
  const { slug } = useParams();
  const [data, setData] = useState<Issue | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api
      .get<Issue>(`/newsletter/issues/${slug}/`)
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active)
          setError("This issue is unavailable or has not been published.");
      });
    return () => {
      active = false;
    };
  }, [slug]);
  useEffect(() => {
    if (data) document.title = `${data.title} | Coding Hubs Newsletter`;
  }, [data]);
  useSeo(
    data
      ? pageSeo({
          path: `/newsletter/issues/${data.slug}/`,
          title: data.title.slice(0, 50) + " | Coding Hubs",
          description: data.excerpt,
          image: LOGO_URL,
          indexable: true,
        })
      : null,
  );
  return (
    <PageFrame>
      <article className="community community-article">
        <nav aria-label="Breadcrumb">
          <Link to="/">Home</Link> / <Link to="/newsletter/">Newsletter</Link>
        </nav>
        {error ? (
          <p role="alert">{error}</p>
        ) : !data ? (
          <p role="status">Loading issue…</p>
        ) : (
          <>
            <h1>{data.title}</h1>
            <p>
              <time dateTime={data.published_at}>
                {new Date(data.published_at).toLocaleDateString("en-IN", {
                  dateStyle: "long",
                })}
              </time>
            </p>
            <p className="community-lead">{data.excerpt}</p>
            <div
              dangerouslySetInnerHTML={{ __html: data.content_html || "" }}
            />
            <NewsletterSignup source="issue" />
          </>
        )}
      </article>
    </PageFrame>
  );
}
export function NewsletterAction({
  action,
}: {
  action: "confirm" | "unsubscribe";
}) {
  const [params, setParams] = useSearchParams();
  const token = params.get("token");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.append(meta);
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.append(robots);
    return () => {
      meta.remove();
      robots.remove();
    };
  }, []);
  async function run() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/newsletter/${action}/`, { token });
      setMessage(data.detail);
      setParams({}, { replace: true });
    } catch {
      setError(
        "This link is invalid or expired. Request a fresh subscription link or contact support.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageFrame>
      <div className="community community-article">
        <h1>
          {action === "confirm"
            ? "Confirm your subscription"
            : "Unsubscribe from the newsletter"}
        </h1>
        {message ? (
          <p role="status">{message}</p>
        ) : (
          <>
            <p>
              {action === "confirm"
                ? "Confirm that you want Coding Hubs newsletters sent to your email."
                : "Choose unsubscribe to stop newsletter emails."}
            </p>
            {token ? (
              <button
                className="community-button"
                disabled={busy}
                onClick={run}
              >
                {busy
                  ? "Processing…"
                  : action === "confirm"
                    ? "Confirm subscription"
                    : "Unsubscribe"}
              </button>
            ) : (
              <p>A valid link from your email is required.</p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="community-error">
            {error}
          </p>
        )}
        <p>
          <Link to="/newsletter/">Back to Newsletter</Link>
        </p>
      </div>
    </PageFrame>
  );
}
