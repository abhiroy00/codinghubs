import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { COURSE_CATALOG } from "../learning/catalog";
import { courseGuestPayload } from "./progress-merge";
type RecordEntry = {
  key: string;
  slug: string;
  kind: "course" | "roadmap";
  snapshot: string;
};
export function GuestProgressImport() {
  const { user } = useAuth();
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const found: RecordEntry[] = [];
    try {
      for (const course of COURSE_CATALOG) {
        for (const [kind, key] of [
          ["course", `ch_learning_${course.slug}`],
          [
            "roadmap",
            course.slug === "generative-ai"
              ? "ch_genai_roadmap_guest_v1"
              : `ch_course_roadmap_${course.slug}_guest_v1`,
          ],
        ] as const) {
          const snapshot = localStorage.getItem(key);
          if (snapshot && snapshot !== "{}")
            found.push({ key, slug: course.slug, kind, snapshot });
        }
      }
    } catch {
      setError("Browser progress storage is unavailable.");
    }
    setRecords(found);
  }, [user]);
  async function run() {
    if (!user) return;
    const identity = localStorage.getItem("ch_auth_identity");
    setBusy(true);
    setError("");
    let imported = 0;
    try {
      for (const row of records) {
        if (identity !== localStorage.getItem("ch_auth_identity"))
          throw Error("Account changed");
        const value = JSON.parse(row.snapshot);
        if (row.kind === "course")
          await api.post(
            `/courses/learning/progress/${row.slug}/import/`,
            courseGuestPayload(value),
          );
        else await api.put(`/courses/roadmap/${row.slug}/progress/`, value);
        if (
          identity === localStorage.getItem("ch_auth_identity") &&
          localStorage.getItem(row.key) === row.snapshot
        )
          localStorage.removeItem(row.key);
        imported++;
      }
      setRecords([]);
      setMessage(
        "Guest progress imported into this account. Existing completion and best scores were preserved.",
      );
      window.dispatchEvent(new Event("genai-progress"));
    } catch {
      setRecords((r) => r.slice(imported));
      setError(
        "Some progress could not be imported. Unconfirmed records remain in this browser; retry when connected.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!records.length && !message && !error) return null;
  return (
    <section className="community community-card">
      <h3>Progress saved before sign-in</h3>
      <p>
        Import this browser’s guest study records into your current account.
        Completion lists are combined and the highest saved quiz score is kept.
        Import only progress that belongs to you.
      </p>
      <button
        className="community-button"
        disabled={busy || !records.length}
        onClick={run}
      >
        {busy ? "Importing…" : "Import guest progress"}
      </button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
