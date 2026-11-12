import { useEffect, useState, type FormEvent } from "react";
import { adminApi } from "./api";

type Problem = {
  id: number;
  slug: string;
  title: string;
  kind: string;
  difficulty: string;
  topics: string[];
  companies: string[];
  description: string;
  constraints: string;
  examples: unknown[];
  starters: Record<string, string>;
  tests: unknown[];
  hints: string[];
  editorial: string;
  complexity: string;
  provenance: string;
  published: boolean;
  version: number;
};
const EMPTY: Omit<Problem, "id" | "version"> = {
  slug: "",
  title: "",
  kind: "coding",
  difficulty: "easy",
  topics: ["Arrays"],
  companies: [],
  description: "",
  constraints: "",
  examples: [],
  starters: { python: "", javascript: "" },
  tests: [],
  hints: [],
  editorial: "",
  complexity: "",
  provenance:
    "Independently authored for Coding Hubs; original educational content.",
  published: false,
};
const DIMENSIONS = [
  "understanding",
  "approach",
  "implementation",
  "testing",
  "complexity",
  "communication",
];
function failure(err: unknown) {
  const data = (err as { response?: { data?: unknown } }).response?.data;
  return data
    ? JSON.stringify(data)
    : "The request failed. Check your connection and retry.";
}
export function StudioAdmin() {
  const [problems, setProblems] = useState<Problem[]>([]),
    [selected, setSelected] = useState<Problem | null>(null),
    [editing, setEditing] = useState(false),
    [stats, setStats] = useState<Record<string, number>>({}),
    [weights, setWeights] = useState<Record<string, number>>({}),
    [policies, setPolicies] = useState("{}"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  async function load() {
    try {
      const [p, s, w] = await Promise.all([
        adminApi.get("/studio/problems/"),
        adminApi.get("/studio/overview/"),
        adminApi.get("/studio/settings/"),
      ]);
      setProblems(p.data);
      setStats(s.data);
      setWeights(w.data.weights);
      setPolicies(JSON.stringify(w.data.persona_policies, null, 2));
      setError("");
    } catch (err) {
      setError(failure(err));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);
    try {
      const data: Record<string, unknown> = {};
      for (const key of [
        "slug",
        "title",
        "kind",
        "difficulty",
        "description",
        "constraints",
        "editorial",
        "complexity",
        "provenance",
      ])
        data[key] = form.get(key);
      for (const key of [
        "topics",
        "companies",
        "examples",
        "starters",
        "tests",
        "hints",
      ])
        data[key] = JSON.parse(String(form.get(key)));
      data.published = form.get("published") === "on";
      if (selected)
        await adminApi.patch(`/studio/problems/${selected.id}/`, data);
      else await adminApi.post("/studio/problems/", data);
      setEditing(false);
      setSuccess(
        "Problem saved. Existing sessions retain their original version.",
      );
      await load();
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "Check the JSON fields for valid JSON."
          : failure(err),
      );
    } finally {
      setBusy(false);
    }
  }
  const value = selected || EMPTY;
  return (
    <>
      <div className="ad-page-head">
        <div>
          <h1>Interview Studio</h1>
          <p>Original question bank, scoring configuration and actual usage.</p>
        </div>
        <button
          className="ad-btn ad-btn-primary"
          onClick={() => {
            setSelected(null);
            setEditing(true);
          }}
        >
          Create problem
        </button>
      </div>
      {error && (
        <p className="ad-error" role="alert">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 14, margin: "20px 0" }}
      >
        {Object.entries(stats).map(([k, v]) => (
          <div
            className="ad-card"
            style={{ padding: 16, minWidth: 130 }}
            key={k}
          >
            <small>{k.replaceAll("_", " ")}</small>
            <h2>{v}</h2>
          </div>
        ))}
      </div>
      {editing ? (
        <form
          key={selected?.id || "new"}
          onSubmit={save}
          className="ad-card"
          style={{ padding: 24, display: "grid", gap: 18 }}
        >
          <h2>
            {selected
              ? `Edit ${selected.title} · v${selected.version}`
              : "New original problem"}
          </h2>
          {[
            "slug",
            "title",
            "kind",
            "difficulty",
            "description",
            "constraints",
            "editorial",
            "complexity",
            "provenance",
          ].map((key) => (
            <label key={key} style={{ display: "grid", gap: 6 }}>
              {key}
              {key === "kind" ? (
                <select name={key} defaultValue={value.kind}>
                  {["coding", "system-design", "low-level-design"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              ) : key === "difficulty" ? (
                <select name={key} defaultValue={value.difficulty}>
                  {["easy", "medium", "hard"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              ) : (
                <textarea
                  name={key}
                  defaultValue={String(value[key as keyof typeof value])}
                  rows={key === "description" || key === "editorial" ? 5 : 2}
                  required={[
                    "slug",
                    "title",
                    "description",
                    "provenance",
                  ].includes(key)}
                />
              )}
            </label>
          ))}
          {[
            "topics",
            "companies",
            "examples",
            "starters",
            "tests",
            "hints",
          ].map((key) => (
            <label key={key} style={{ display: "grid", gap: 6 }}>
              {key} (JSON)
              <textarea
                name={key}
                defaultValue={JSON.stringify(
                  value[key as keyof typeof value],
                  null,
                  2,
                )}
                rows={key === "tests" ? 9 : 4}
                spellCheck={false}
              />
              {key === "tests" && (
                <small>
                  Each test:{" "}
                  {JSON.stringify({
                    stdin: '{"readings":[1,2],"width":1}',
                    expected: "1",
                    hidden: true,
                  })}
                  . Hidden cases stay server-side.
                </small>
              )}
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              name="published"
              defaultChecked={value.published}
            />{" "}
            Published (uncheck to archive)
          </label>
          <div>
            <button className="ad-btn ad-btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save problem"}
            </button>{" "}
            <button
              type="button"
              className="ad-btn"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="ad-card" style={{ padding: 24 }}>
          <label>
            Search question bank{" "}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Problem title"
            />
          </label>
          <div style={{ overflowX: "auto", marginTop: 20 }}>
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Kind</th>
                  <th>Difficulty</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {problems
                  .filter((p) =>
                    p.title.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>{p.kind}</td>
                      <td>{p.difficulty}</td>
                      <td>{p.version}</td>
                      <td>{p.published ? "Published" : "Archived"}</td>
                      <td>
                        <button
                          className="ad-btn"
                          onClick={() => {
                            setSelected(p);
                            setEditing(true);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <form
        className="ad-card"
        style={{ padding: 24, marginTop: 24 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await adminApi.patch("/studio/settings/", {
              weights,
              persona_policies: JSON.parse(policies),
            });
            setSuccess(
              "Scoring settings saved. Existing reports retain their original weights.",
            );
          } catch (err) {
            setError(failure(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Evaluation weights</h2>
        <p>Score = Σ(weight × rating ÷ 4). All six weights must total 100.</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
            gap: 18,
            margin: "20px 0",
          }}
        >
          {DIMENSIONS.map((k) => (
            <label key={k} style={{ display: "grid", gap: 7 }}>
              {k}
              <input
                type="number"
                min={0}
                max={100}
                value={weights[k] ?? 0}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
        </div>
        <label style={{ display: "grid", gap: 8 }}>
          Persona hint limits (JSON)
          <textarea
            value={policies}
            onChange={(e) => setPolicies(e.target.value)}
            rows={5}
          />
          <small>
            Example:{" "}
            {JSON.stringify({
              strict: { max_hints: 0 },
              balanced: { max_hints: 2 },
              coaching: { max_hints: 5 },
            })}
            . Limits cannot exceed each persona’s server policy.
          </small>
        </label>
        <button
          className="ad-btn ad-btn-primary"
          disabled={
            busy || Object.values(weights).reduce((a, b) => a + b, 0) !== 100
          }
          style={{ marginTop: 20 }}
        >
          Save scoring settings
        </button>
      </form>
      <p style={{ marginTop: 20 }}>
        Provider credentials and runtime images are managed through server
        environment settings. API keys are never exposed in this panel.
      </p>
    </>
  );
}
