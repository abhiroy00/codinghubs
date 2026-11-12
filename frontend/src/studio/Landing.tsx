import { Link } from "react-router-dom";
import { ROOT } from "./api";
import { ButtonLink, Icon } from "./ui";

export function StudioLanding() {
  return (
    <div className="studio st-landing">
      <main>
        <section className="st-hero">
          <div className="st-hero-copy">
            <p className="st-eyebrow">
              <span className="st-live-dot" /> BUILT FOR YOUR NEXT CHAPTER
            </p>
            <h1>
              Good interviews
              <br />
              start with
              <br />
              <em>clear thinking.</em>
            </h1>
            <p className="st-hero-lead">
              A focused space to practice your craft, talk through your
              reasoning, and walk into your next technical interview with
              confidence.
            </p>
            <div className="st-actions">
              <ButtonLink to={`${ROOT}/coding-interviews/new`}>
                Start a mock interview
              </ButtonLink>
              <Link className="st-text-link" to={`${ROOT}/practice`}>
                Explore the problem library <span>↗</span>
              </Link>
            </div>
            <div className="st-hero-foot">
              <span>
                <Icon name="check" size={16} /> Original practice material
              </span>
              <span>
                <Icon name="check" size={16} /> Feedback you can act on
              </span>
            </div>
          </div>
          <div
            className="st-hero-workspace"
            aria-label="Illustration of the interview workflow"
          >
            <div className="st-window-bar">
              <div className="st-window-dots">
                <i />
                <i />
                <i />
              </div>
              <span>YOUR THINKING SPACE</span>
              <Icon name="code" size={16} />
            </div>
            <div className="st-preview-main">
              <div className="st-preview-label">
                <span>01 / UNDERSTAND</span>
                <span className="st-pill">Sliding window</span>
              </div>
              <h2>A quieter signal.</h2>
              <p>
                A sensor sends a stream of noise readings. Find the quietest
                stretch of consecutive readings.
              </p>
              <div className="st-array">
                {[4, 2, 7, 1, 3].map((n, i) => (
                  <span key={i} className={i > 2 ? "selected" : ""}>
                    {n}
                    <small>{i}</small>
                  </span>
                ))}
              </div>
              <div className="st-preview-observation">
                <Icon name="spark" />
                <p>What changes when the window moves one position?</p>
              </div>
              <div className="st-preview-code">
                <span>
                  <b>def</b> solve(data):
                </span>
                <span>
                  {" "}
                  readings = data[<i>"readings"</i>]
                </span>
                <span>
                  {" "}
                  width = data[<i>"width"</i>]
                </span>
                <span className="comment"> # Start with what you know.</span>
                <span>
                  {" "}
                  <span className="st-caret" />
                </span>
              </div>
              <div className="st-preview-bottom">
                <span>
                  <span className="st-live-dot" /> Think. Explain. Iterate.
                </span>
                <span>PYTHON</span>
              </div>
            </div>
            <div className="st-margin-note">
              <span>
                Better reasoning.
                <br />
                One conversation at a time.
              </span>
              <svg
                width="55"
                height="26"
                viewBox="0 0 55 26"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 3c10 20 28 22 49 10m-12-2 13 1-5 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        </section>
        <div className="st-principle-strip">
          <p>
            THINK CLEARLY. <span>CODE CONFIDENTLY.</span> INTERVIEW BETTER.
          </p>
          <span>YOUR PRACTICE. YOUR PACE.</span>
        </div>
        <section className="st-public-section" id="how-it-works">
          <div className="st-section-intro">
            <p className="st-eyebrow">PURPOSEFUL PRACTICE</p>
            <h2>
              More than getting
              <br />
              the right answer.
            </h2>
            <p>
              The way you get there matters. Build the habits that make your
              engineering thinking visible.
            </p>
          </div>
          <div className="st-feature-grid">
            {[
              {
                n: "01",
                icon: "chat",
                title: "An interviewer that listens",
                text: "Discuss assumptions, defend a trade-off, and follow the conversation wherever your reasoning leads.",
              },
              {
                n: "02",
                icon: "code",
                title: "A workspace for the work",
                text: "Write real code, test your assumptions, and keep your problem, editor and conversation in one place.",
              },
              {
                n: "03",
                icon: "chart",
                title: "Know what to work on",
                text: "Review feedback across six dimensions. Separate tested correctness from observations about your reasoning.",
              },
            ].map((f) => (
              <article key={f.n}>
                <div>
                  <Icon name={f.icon} />
                  <span>{f.n}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="st-path-section" id="practice">
          <div>
            <p className="st-eyebrow">MAKE IT YOUR OWN</p>
            <h2>
              Different challenges.
              <br />
              <em>The same clear thinking.</em>
            </h2>
          </div>
          <div className="st-path-list">
            {[
              [
                "coding-interviews/new",
                "AI coding interviews",
                "Choose your interviewer, your topics and your pace.",
                "chat",
              ],
              [
                "practice",
                "Coding practice",
                "Build fluency through original, pattern-based problems.",
                "code",
              ],
              [
                "system-design",
                "System & low-level design",
                "Turn requirements into a design you can explain.",
                "design",
              ],
            ].map(([route, title, text, icon]) => (
              <Link key={route} to={`${ROOT}/${route}`}>
                <span className="st-icon-tile">
                  <Icon name={icon} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <Icon name="arrow" />
              </Link>
            ))}
          </div>
        </section>
        <section className="st-closing">
          <p className="st-eyebrow">THE NEXT INTERVIEW STARTS HERE</p>
          <h2>Make room for progress.</h2>
          <ButtonLink to={`${ROOT}/dashboard`}>
            Find your starting point
          </ButtonLink>
          <p>Use your existing Coding Hubs account.</p>
        </section>
      </main>
    </div>
  );
}
