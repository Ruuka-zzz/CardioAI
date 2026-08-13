import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DISCLAIMER, TRIAGE_RULE_LABELS } from "@shared/enums";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";
import StatusBand from "../shared/components/StatusBand";

/**
 * Patient home. Answers one question: how am I today, and what should I do.
 *
 * Three states, in priority order:
 *   1. Onboarding not done  -> nothing but the intake prompt
 *   2. No check-in yet today -> the check-in prompt leads
 *   3. Checked in            -> today's status leads, history below
 *
 * A 409 from the check-in history means onboarding is incomplete; the backend
 * already knows that, so we route on its answer rather than tracking a
 * separate flag here that could drift.
 */
export default function PatientDashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.checkInHistory(),
      api.reminders().catch(() => []),
    ])
      .then(([rows, due]) => {
        if (cancelled) return;
        setHistory(rows ?? []);
        setReminders(due ?? []);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 409) {
          setState("needs-onboarding");
        } else {
          setError(err.message);
          setState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <p className="empty">Loading your check-ins…</p>;
  }

  if (state === "needs-onboarding") {
    return (
      <section>
        <h1>One thing first</h1>
        <p className="lede">
          Before your first check-in we need your medical history. It takes a
          few minutes and you only do it once.
        </p>
        <Button block onClick={() => navigate("/patient/onboarding")}>
          Start my intake form
        </Button>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section>
        <h1>Couldn't load your check-ins</h1>
        <p className="alert" role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </section>
    );
  }

  const [latest, ...earlier] = history;
  const checkedInToday = latest && isToday(latest.created_at);

  return (
    <section>
      <h1>Today</h1>

      {reminders.length > 0 && (
        <div className="card card--sunk">
          <p className="eyebrow">Reminders</p>
          <ul className="stack">
            {reminders.map((r) => (
              <li key={r.id}>{r.body}</li>
            ))}
          </ul>
        </div>
      )}

      {checkedInToday ? (
        <div className="card">
          <StatusBand status={latest.status} score={latest.score} />
          <p>{latest.recommendation}</p>
          {(latest.fired_rules ?? []).length > 0 && (
            <ol className="trail">
              {latest.fired_rules.map((rule) => (
                <li key={rule}>{TRIAGE_RULE_LABELS[rule] ?? rule}</li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <div className="card">
          <h2>You haven't checked in yet</h2>
          <p className="lede">
            Logging how you feel takes about a minute and keeps your condition
            report current.
          </p>
          <Button block onClick={() => navigate("/patient/check-in")}>
            Start today's check-in
          </Button>
        </div>
      )}

      {earlier.length > 0 && (
        <>
          <h2>Recent check-ins</h2>
          <ul className="stack">
            {earlier.slice(0, 7).map((row) => (
              <li key={row.checkin_id} className="card" style={{ marginBottom: 0 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className={`pill pill--${row.status === "good" ? "on" : "off"}`}>
                    {row.status}
                  </span>
                  <span className="readout" style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                    {formatDay(row.created_at)} · {row.score}
                  </span>
                </div>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.9375rem" }}>
                  {row.recommendation}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {history.length === 0 && (
        <p className="empty">
          Your check-in history will build up here. <Link to="/patient/check-in">Start now</Link>.
        </p>
      )}

      <p className="disclaimer" style={{ marginTop: "2rem" }}>
        {DISCLAIMER}
      </p>
    </section>
  );
}

function isToday(iso) {
  if (!iso) return false;
  const then = new Date(iso);
  const now = new Date();
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  );
}

function formatDay(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}