import { Link } from "react-router-dom";
import { useId, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import "./public.css";
export default function NewsletterSignup({
  source = "newsletter",
}: {
  source?: string;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { data } = await api.post("/newsletter/subscribe/", {
        email: email.trim(),
        consent,
        source,
        website,
      });
      setMessage(data.detail);
      setEmail("");
      setConsent(false);
    } catch (e) {
      const code = (e as { response?: { status: number } }).response?.status;
      setError(
        code === 503
          ? "Newsletter email is not available yet. Please try again later."
          : code === 429
            ? "Too many attempts. Please try again later."
            : "Could not request your subscription. Check your email and consent, then try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="newsletter-form"
      onSubmit={submit}
      aria-describedby={`${id}-privacy`}
    >
      <label htmlFor={`${id}-email`}>Email address</label>
      <div className="newsletter-row">
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button className="community-button" disabled={busy || !consent}>
          {busy ? "Requesting…" : "Subscribe free"}
        </button>
      </div>
      <div className="newsletter-bot" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Leave this field empty</label>
        <input
          id={`${id}-website`}
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <label className="newsletter-consent">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span id={`${id}-privacy`}>
          I agree to receive coding tips, interview preparation, AI updates and
          course announcements. Confirm by email; unsubscribe anytime.{" "}
          <Link to="/policies#privacy">Privacy policy</Link>.
        </span>
      </label>
      {message && (
        <p className="community-status" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="community-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
