import { useSeo } from "../seo/useSeo";
import { pageSeo, LOGO_URL } from "../seo/site";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { takeInitial } from "../content-pages/api";
import { PageFrame } from "../content-pages/shared";
import { HeroVideo } from "../components/HeroVideo";
import "./public.css";
import "../content-pages/blog.css";

type Brochure = {
  id: number;
  course_id: number;
  course_slug: string;
  course_name: string;
  title: string;
  description: string;
  size: number;
  download_url: string;
  view_url: string;
  updated_at: string;
};
const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
export function CourseBrochureDownload({ slug }: { slug: string }) {
  const [data, setData] = useState<Brochure | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    api
      .get<Brochure>(`/courses/brochures/${slug}/`)
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch((e) => {
        if (active) setError(e.response?.status !== 404);
      });
    return () => {
      active = false;
    };
  }, [slug]);
  return data ? (
    <a
      className="learn-button learn-button-quiet"
      href={data.download_url}
      download
    >
      Download Brochure · {size(data.size)}
    </a>
  ) : error ? (
    <span role="status">Brochure temporarily unavailable.</span>
  ) : null;
}
export function Brochures() {
  useSeo(
    pageSeo({
      path: "/brochures/",
      title: "Course PDF Brochures | Coding Hubs School of AI",
      description:
        "Download published Coding Hubs course PDF brochures for free, with course descriptions and file sizes. No signup is required to download a brochure.",
      image: LOGO_URL,
      indexable: true,
    }),
  );
  // The server page embeds the published list (#__CONTENT__): render it straight away, with no loading state and no
  // second request. Client-side navigation has no embedded list and fetches it.
  const [data, setData] = useState<Brochure[] | null>(() => {
    const initial = takeInitial() as unknown;
    return Array.isArray(initial) ? (initial as Brochure[]) : null;
  });
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [embedded] = useState(() => data !== null);
  useEffect(() => {
    document.title = "Course PDF Brochures | Coding Hubs";
    if (embedded && retry === 0) return;
    let active = true;
    setError("");
    api
      .get<Brochure[] | { results: Brochure[] }>("/courses/brochures/")
      .then((r) => {
        if (active) setData(Array.isArray(r.data) ? r.data : r.data.results);
      })
      .catch(() => {
        if (active) setError("Could not load published brochures.");
      });
    return () => {
      active = false;
    };
  }, [retry, embedded]);
  return (
    <PageFrame>
      <div className="community">
        <section className="bl-hero hv-host">
          <HeroVideo clip="courses" />
          <div className="bl-hero-in">
            <p className="bl-eyebrow">Explore · Course PDFs</p>
            <h1>
              Course <span>Brochures</span>
            </h1>
            <p className="bl-lead">
              Download published course PDFs to read at your own pace. No signup
              required.
            </p>
          </div>
        </section>
        {error ? (
          <p role="alert">
            {error}{" "}
            <button
              className="community-button"
              onClick={() => setRetry((x) => x + 1)}
            >
              Retry
            </button>
          </p>
        ) : !data ? (
          <p role="status">Loading brochures…</p>
        ) : data.length === 0 ? (
          <p className="brochure-empty">
            No course brochures are published yet.{" "}
            <Link to="/courses/">Explore our course outlines</Link> or contact
            us for details.
          </p>
        ) : (
          // Same markup as the server page (backend newsletter/brochures.html), so nothing moves when React takes over.
          // No image yet: the card is text-only until brochure covers are added.
          <div className="brochure-grid">
            {data.map((b) => (
              <article className="brochure-card" key={b.id}>
                <p className="brochure-course">{b.course_name}</p>
                <h2>{b.title}</h2>
                {b.description && <p className="brochure-desc">{b.description}</p>}
                <p className="brochure-meta">
                  <span className="brochure-tag">PDF</span>
                  <span>{size(b.size)}</span>
                  <span>Updated {new Date(b.updated_at).toLocaleDateString("en-IN")}</span>
                </p>
                <div className="brochure-actions">
                  <a className="brochure-btn brochure-download" href={b.download_url} download="" aria-label="Download Brochure">
                    Download
                  </a>
                  <a className="brochure-btn brochure-view" href={b.view_url} target="_blank" rel="noopener" aria-label="View Brochure (opens in a new tab)">
                    View
                  </a>
                </div>
                <Link className="brochure-more" to={`/courses/${b.course_slug}/`}>
                  Course details →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageFrame>
  );
}
