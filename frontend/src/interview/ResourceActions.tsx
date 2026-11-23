import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
export type ResourceState = {
  resource: string;
  title?: string;
  bookmarked: boolean;
  completed: boolean;
  viewed_at?: string;
};
const views = new Map<string, ReturnType<typeof api.put<ResourceState>>>();
export function ResourceActions({ resource }: { resource: string }) {
  const { user } = useAuth();
  return (
    <ResourceActionsForUser
      key={`${user?.id ?? "guest"}:${resource}`}
      resource={resource}
    />
  );
}
function ResourceActionsForUser({ resource }: { resource: string }) {
  const { user, loading } = useAuth();
  const [state, setState] = useState<ResourceState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState(null);
    setError("");
    if (!user || loading) return;
    const identity = `${user.id}:${resource}`;
    let pending = views.get(identity);
    if (!pending) {
      pending = api.put<ResourceState>("/auth/interview-state/resource/", {
        resource,
        viewed: true,
      });
      views.set(identity, pending);
      void pending.finally(() => views.delete(identity)).catch(() => undefined);
    }
    pending
      .then((r) => {
        if (active) setState(r.data);
      })
      .catch(() => {
        if (active)
          setError(
            "Could not load your saved state. Retry to sync with your account.",
          );
      });
    return () => {
      active = false;
    };
  }, [resource, user, loading, retry]);
  async function change(key: "bookmarked" | "completed") {
    if (!state || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put<ResourceState>(
        "/auth/interview-state/resource/",
        { resource, [key]: !state[key] },
      );
      setState(data);
    } catch {
      setError(
        "Could not save this change. Your previous saved state is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  // Server HTML and the first client render are identical (the account is unknown in both), so this renders
  // nothing rather than visible "loading" text that crawlers would index as page content.
  if (loading) return null;
  if (!user)
    return (
      <p>
        <Link
          to={`/login?next=${encodeURIComponent(resource)}`}
          state={{ from: { pathname: resource } }}
        >
          Sign in to bookmark and save completion
        </Link>
        . Reading is always public.
      </p>
    );
  return (
    <div className="community-state-actions">
      {state ? (
        <>
          <button
            className="community-button"
            disabled={busy}
            aria-pressed={state.bookmarked}
            onClick={() => change("bookmarked")}
          >
            {state.bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
          <button
            className="community-button"
            disabled={busy}
            aria-pressed={state.completed}
            onClick={() => change("completed")}
          >
            {state.completed ? "Completed" : "Mark complete"}
          </button>
        </>
      ) : !error ? (
        <p role="status">Loading saved state…</p>
      ) : null}
      {error && (
        <p role="alert" className="community-error">
          {error} <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
        </p>
      )}
    </div>
  );
}
export function InterviewActivity() {
  const [data, setData] = useState<{
    count: number;
    results: ResourceState[];
  } | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    api
      .get("/auth/interview-state/", {
        params: { page, ...(filter ? { [filter]: true } : {}) },
      })
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active) setError("Could not load Interview activity.");
      });
    return () => {
      active = false;
    };
  }, [page, filter, retry]);
  return (
    <section className="community">
      <h2 id="pf-section-title">Your Interview activity</h2>
      <p>
        Bookmarks, completed resources and recently opened topics from your
        account.
      </p>
      <div className="community-filters">
        <label>
          Show
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Recent activity</option>
            <option value="bookmarked">Bookmarks</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert">
          {error} <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
        </p>
      ) : !data ? (
        <p role="status">Loading Interview activity…</p>
      ) : data.count === 0 ? (
        <p>
          No saved activity here yet.{" "}
          <Link to="/interview/">Explore Interview</Link>.
        </p>
      ) : (
        <>
          <ul className="community-link-list">
            {data.results.map((r) => (
              <li key={r.resource}>
                <Link to={r.resource}>{r.title}</Link>
                <p>
                  {r.bookmarked ? "Bookmarked · " : ""}
                  {r.completed ? "Completed · " : ""}
                  {r.viewed_at
                    ? `Opened ${new Date(r.viewed_at).toLocaleDateString("en-IN")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
          {data.count > 24 && (
            <div className="community-pager">
              <button
                disabled={page === 1}
                onClick={() => setPage((x) => x - 1)}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                disabled={page * 24 >= data.count}
                onClick={() => setPage((x) => x + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
