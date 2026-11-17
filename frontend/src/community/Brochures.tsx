import { useSeo } from "../seo/useSeo";
import { pageSeo, LOGO_URL } from "../seo/site";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
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
  const [data, setData] = useState<Brochure[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    document.title = "Course PDF Brochures | Coding Hubs";
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
  }, [retry]);
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
          <p>
            No course brochures are published yet.{" "}
            <Link to="/courses/">Explore our course outlines</Link> or contact
            us for details.
          </p>
        ) : (
          <div className="community-grid">
            {data.map((b) => (
              <article className="community-card" key={b.id}>
                <p className="community-muted">{b.course_name}</p>
                <h2>{b.title}</h2>
                <p>{b.description}</p>
                <small>
                  PDF · {size(b.size)} · Updated{" "}
                  {new Date(b.updated_at).toLocaleDateString("en-IN")}
                </small>
                <a className="community-button" href={b.download_url} download>
                  Download Brochure
                </a>
                <p>
                  <Link to={`/courses/${b.course_slug}/`}>
                    Course details →
                  </Link>
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageFrame>
  );
}
