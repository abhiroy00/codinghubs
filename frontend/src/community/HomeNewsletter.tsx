import { Link } from "react-router-dom";
import "./public.css";
import Signup from "./NewsletterSignup";
export function HomeNewsletter() {
  return (
    <section
      className="community community-home"
      aria-labelledby="home-newsletter"
    >
      <div className="wrap">
        <div>
          <h2 id="home-newsletter">A useful note for your next step.</h2>
          <p>
            Coding tips, interview practice, AI updates and course announcements
            from Coding Hubs.
          </p>
          <Link to="/newsletter/">Read the newsletter →</Link>
        </div>
        <Signup source="homepage" />
      </div>
    </section>
  );
}
