import { useCallback, useEffect, useState } from "react";
import { api, dateLabel, errorText } from "./api";
import type { Job, Run } from "./types";
import { Badge, JsonDetail } from "./ui";

export function useData<T>(
  path: string,
  initial: T,
  revision: string | number = "",
) {
  const [data, setData] = useState<T>(initial),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version, revision]);
  return { data, error, loading, reload };
}
export function LoadError({ error }: { error: string }) {
  return error ? (
    <p className="notice error" role="alert" style={{ marginBottom: 15 }}>
      {error}
    </p>
  ) : null;
}
export function Jobs({
  jobs,
  siteId,
  run,
}: {
  jobs: Job[];
  siteId: string;
  run: Run;
}) {
  return (
    <div>
      {jobs.slice(0, 8).map((job) => (
        <article className="action-row" key={job.id}>
          <div className="grow">
            <div className="row wrap">
              <h3 style={{ margin: 0, textTransform: "capitalize" }}>
                {job.kind}
              </h3>
              <Badge value={job.status} />
              <span className="muted">{dateLabel(job.created_at, true)}</span>
            </div>
            {Object.keys(job.progress).length > 0 && (
              <p className="muted" style={{ margin: "8px 0" }}>
                {Object.entries(job.progress)
                  .filter(([key]) =>
                    [
                      "agent",
                      "checked",
                      "completed",
                      "total",
                      "limit",
                    ].includes(key),
                  )
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" · ")}
              </p>
            )}
            {job.error && (
              <p className="notice error" style={{ marginTop: 9 }}>
                {job.error}
              </p>
            )}
            {Object.keys(job.result).length > 0 && (
              <JsonDetail value={job.result} label="Inspect job result" />
            )}
          </div>
          <div className="row wrap">
            {["queued", "running"].includes(job.status) && (
              <button
                className="button secondary"
                onClick={() => {
                  void run(
                    () =>
                      api(`/sites/${siteId}/jobs/${job.id}/control`, {
                        method: "POST",
                        body: { operation: "pause" },
                      }),
                    "Pause requested; the current bounded request may finish",
                  );
                }}
              >
                Pause
              </button>
            )}
            {["paused", "failed", "blocked"].includes(job.status) && (
              <button
                className="button secondary"
                onClick={() => {
                  void run(
                    () =>
                      api(`/sites/${siteId}/jobs/${job.id}/control`, {
                        method: "POST",
                        body: { operation: "resume" },
                      }),
                    "Job queued from its retained checkpoint",
                  );
                }}
              >
                Resume
              </button>
            )}
            {!["completed", "cancelled"].includes(job.status) && (
              <button
                className="button danger"
                onClick={() => {
                  void run(
                    () =>
                      api(`/sites/${siteId}/jobs/${job.id}/control`, {
                        method: "POST",
                        body: { operation: "cancel" },
                      }),
                    "Cancellation requested; retained history is preserved",
                  );
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
