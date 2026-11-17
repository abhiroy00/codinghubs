import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { useAuth } from "../lib/auth-context";
import "./login.css";

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);

  const goNext = () =>
    navigate(location.state?.from?.pathname ?? "/dashboard", { replace: true });

  async function signInWithGoogle(
    credential: string,
    linkingPassword?: string,
  ) {
    if (linkingPassword === undefined) setGoogleCredential(null);
    setError("");
    setNotice("Signing you in with Google…");
    setLoading(true);
    try {
      await loginWithGoogle(credential, linkingPassword);
      goNext();
    } catch (failure) {
      const data = isAxiosError<{
        code?: string;
        detail?: string;
        email?: string;
      }>(failure)
        ? failure.response?.data
        : undefined;
      if (data?.code === "account_link_required") {
        setGoogleCredential(credential);
        if (data.email) setUsername(data.email);
      }
      setError(
        data?.detail ||
          "Google sign-in failed. Please try again or use your password.",
      );
    } finally {
      setNotice("");
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (googleCredential) {
      await signInWithGoogle(googleCredential, password);
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await login(username, password);
      goNext();
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="login-heading">
      <div className="auth-card">
        <aside className="auth-visual" aria-hidden="true">
          <picture>
            <source type="image/webp" srcSet="/fs-assets/img/modern-virtual-classroom-studio-w640.webp 640w, /fs-assets/img/modern-virtual-classroom-studio-w1280.webp 1280w" sizes="(max-width: 900px) 100vw, 50vw" />
            <img
              src="/fs-assets/img/modern-virtual-classroom-studio.jpg"
              alt=""
              width={1280}
              height={801}
            />
          </picture>
          <span className="auth-badge">
            <i />
            LIVE COHORTS
          </span>
          <div className="auth-visual-copy">
            <p>Learn AI with people who build.</p>
            <ul>
              <li>Free 2-hour demo class</li>
              <li>Mentors from the industry</li>
              <li>Projects you can show</li>
            </ul>
          </div>
        </aside>

        <div className="auth-panel">
          <Link
            to="/"
            className="auth-close"
            aria-label="Back to the home page"
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </Link>

          <p className="auth-eyebrow">Student login</p>
          <h1 id="login-heading">Welcome back.</h1>
          <p className="auth-sub">
            Sign in to continue your learning, or use your Google account.
          </p>

          <GoogleSignIn
            onCredential={(credential) => {
              void signInWithGoogle(credential);
            }}
            disabled={loading}
          />
          <p className="auth-or">
            <span>or</span>
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span>Email or username</span>
              <div className="auth-input">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
                </svg>
                <input
                  id="username"
                  required
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-eye"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                </button>
              </div>
            </label>

            <div className="auth-row">
              <span className="auth-hint">
                Your progress stays linked to your account.
              </span>
              <Link to="/forgot-password" className="auth-link">
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="auth-message is-error" role="alert">
                {error}
              </p>
            )}
            {notice && !error && (
              <p className="auth-message" role="status">
                {notice}
              </p>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading
                ? "Logging in…"
                : googleCredential
                  ? "Link Google & log in"
                  : "Log in"}
            </button>
          </form>
          {googleCredential && (
            <button
              type="button"
              className="auth-google-retry"
              disabled={loading}
              onClick={() => {
                setGoogleCredential(null);
                setError("");
                setPassword("");
              }}
            >
              Use password login instead
            </button>
          )}

          <p className="auth-alt">
            Don’t have an account?{" "}
            <Link to="/register" state={location.state}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
