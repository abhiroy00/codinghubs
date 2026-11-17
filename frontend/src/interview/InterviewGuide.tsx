import { Link, useParams } from "react-router-dom";
import { LearnFrame } from "../learning/LearnFrame";
import { NotFound } from "../pages/NotFound";
import { ResourceActions } from "./ResourceActions";
import guides from "./guides.json";
import "../community/public.css";
export function InterviewGuide() {
  const { slug } = useParams();
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) return <NotFound />;
  return (
    <LearnFrame
      trail={[
        { label: "Interview", to: "/interview/" },
        { label: guide.title },
      ]}
      title={
        guide.title.length > 47
          ? guide.title.slice(0, 44) + "… | Coding Hubs"
          : guide.title + " | Coding Hubs"
      }
      description={guide.summary}
    >
      <div className="interview-guide-layout">
        <aside className="interview-topic-nav">
          <h2>Interview topics</h2>
          <nav aria-label="Interview topics">
            {guides.map((g) => (
              <Link
                key={g.slug}
                aria-current={g.slug === slug ? "page" : undefined}
                to={`/interview/guides/${g.slug}/`}
              >
                {g.category}: {g.title}
              </Link>
            ))}
          </nav>
        </aside>
        <article className="community community-article">
          <details className="interview-mobile-topics">
            <summary>Browse Interview topics</summary>
            <nav aria-label="Mobile Interview topics">
              {guides.map((g) => (
                <Link key={g.slug} to={`/interview/guides/${g.slug}/`}>
                  {g.category}: {g.title}
                </Link>
              ))}
            </nav>
          </details>
          <p>
            {guide.category} · {guide.difficulty}
          </p>
          <h1>{guide.title}</h1>
          <p className="community-lead">{guide.summary}</p>
          <ResourceActions resource={`/interview/guides/${guide.slug}/`} />
          <details className="community-toc" open>
            <summary>On this page</summary>
            <nav aria-label="Table of contents">
              {guide.sections.map((s) => (
                <a key={s.id} href={`#${s.id}`}>
                  {s.title}
                </a>
              ))}
              <a href="#exercise">Practice exercise</a>
            </nav>
          </details>
          {guide.sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 50)}>{p}</p>
              ))}
              {"code" in section && (
                <pre>
                  <code className={`language-${section.language}`}>
                    {section.code}
                  </code>
                </pre>
              )}
            </section>
          ))}
          <section id="exercise">
            <h2>Practice exercise</h2>
            <p>{guide.exercise}</p>
          </section>
          <aside className="community-related">
            <h2>Keep exploring</h2>
            <ul>
              {guides
                .filter((g) => g.slug !== slug)
                .slice(0, 3)
                .map((g) => (
                  <li key={g.slug}>
                    <Link to={`/interview/guides/${g.slug}/`}>{g.title}</Link>
                  </li>
                ))}
            </ul>
            <Link to="/interview/">All Interview topics →</Link>
          </aside>
        </article>
      </div>
    </LearnFrame>
  );
}
