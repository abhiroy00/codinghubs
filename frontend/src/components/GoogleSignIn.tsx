import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

type GoogleAccounts = {
  id: {
    initialize: (options: {
      client_id: string;
      callback: (response: { credential?: string }) => void;
    }) => void;
    renderButton: (
      parent: HTMLElement,
      options: Record<string, unknown>,
    ) => void;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

let sdk: Promise<void> | undefined;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (sdk) return sdk;
  sdk = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      sdk = undefined;
      reject(new Error("Google sign-in could not load. Please try again."));
    };
    const timer = setTimeout(fail, 10_000);
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (window.google?.accounts?.id) resolve();
      else fail();
    };
    document.head.appendChild(script);
  });
  return sdk;
}

/** The official Google button, with clear loading, retry and unavailable states. */
export function GoogleSignIn({
  onCredential,
  disabled = false,
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const target = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<
    "loading" | "ready" | "unavailable" | "error"
  >("loading");
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const controller = new AbortController();
    let resize: ResizeObserver | undefined;
    setStatus("loading");
    async function start() {
      try {
        const { data } = await api.get<{ client_id: string }>("/auth/google/", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!data.client_id) {
          setStatus("unavailable");
          return;
        }
        await loadGoogle();
        if (controller.signal.aborted || !target.current) return;
        const google = window.google!.accounts.id;
        google.initialize({
          client_id: data.client_id,
          callback: (response) => {
            if (controller.signal.aborted) return;
            if (response.credential) callback.current(response.credential);
            else setStatus("error");
          },
        });
        let width = 0;
        const render = () => {
          const element = target.current;
          if (!element || controller.signal.aborted) return;
          const next = Math.min(
            348,
            Math.floor(element.getBoundingClientRect().width),
          );
          if (next < 200 || next === width) return;
          width = next;
          element.replaceChildren();
          google.renderButton(element, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
            width,
          });
        };
        render();
        if ("ResizeObserver" in window) {
          resize = new ResizeObserver(render);
          resize.observe(target.current);
        }
        setStatus("ready");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    void start();
    return () => {
      controller.abort();
      resize?.disconnect();
    };
  }, [attempt]);

  return (
    <div className="auth-google-section">
      <div
        className={`auth-google${status === "ready" ? "" : " is-loading"}`}
        ref={target}
        inert={disabled || status !== "ready"}
        aria-label="Google sign-in"
      />
      {status === "loading" && (
        <p className="auth-google-status" role="status">
          Loading Google sign-in…
        </p>
      )}
      {status === "unavailable" && (
        <>
          <button type="button" className="auth-google-placeholder" disabled>
            Continue with Google
          </button>
          <p className="auth-google-status" role="status">
            Google sign-in is temporarily unavailable. You can use email and
            password.
          </p>
        </>
      )}
      {status === "error" && (
        <p className="auth-google-status" role="alert">
          Google sign-in could not load. Check your connection and try again.
        </p>
      )}
      {(status === "error" || status === "unavailable") && (
        <button
          type="button"
          className="auth-google-retry"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Try Google again
        </button>
      )}
    </div>
  );
}
