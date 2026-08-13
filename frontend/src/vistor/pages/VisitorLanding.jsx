import { Link } from "react-router-dom";
import VisitorChatbot from "../components/VisitorChatbot";

/**
 * Public landing page.
 *
 * The hero is the product's actual daily loop rendered as a three-beat
 * sequence, because what CardioAI does is hard to convey in a sentence and
 * obvious in a diagram: you answer, it reasons, it tells you why.
 */
export default function VisitorLanding() {
  return (
    <>
      <section>
        <p className="eyebrow">Daily heart monitoring</p>
        <h1>Know how your heart is doing, every day.</h1>
        <p className="lede">
          Answer a few questions twice a day. CardioAI compares them against
          your baseline and tells you plainly what to do — and why.
        </p>

        <div className="row" style={{ marginBottom: "2rem" }}>
          <Link className="btn btn--primary" to="/signup">
            Create an account
          </Link>
          <Link className="btn btn--secondary" to="/login">
            Sign in
          </Link>
        </div>

        <ol className="stack" style={{ marginBottom: "2rem" }}>
          <Beat
            n="1"
            title="You answer"
            body="Five questions about how you feel, plus whether you took your medication. About a minute."
          />
          <Beat
            n="2"
            title="Rules run, not guesswork"
            body="Your answers are checked against clinical triage rules and the baseline risk from your intake."
          />
          <Beat
            n="3"
            title="You see the reasoning"
            body="Good, fair or bad — with the exact rules that produced it, so you can judge it for yourself."
          />
        </ol>
      </section>

      <VisitorChatbot />

      <section>
        <p className="disclaimer">
          CardioAI supports monitoring and education. It is not a diagnostic
          tool and does not replace professional medical advice. If you are
          having a medical emergency, contact your local emergency service
          immediately.
        </p>
      </section>
    </>
  );
}

function Beat({ n, title, body }) {
  return (
    <li className="card" style={{ marginBottom: 0 }}>
      <p className="eyebrow">{n}</p>
      <h2>{title}</h2>
      <p style={{ marginBottom: 0 }}>{body}</p>
    </li>
  );
}