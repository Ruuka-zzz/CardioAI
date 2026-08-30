import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BASELINE_NOTE,
  DISCLAIMER,
  NYHA_DESCRIPTION,
  TRIAGE_RULE_LABELS,
} from "@shared/enums";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";
import StatusBand from "../shared/components/StatusBand";

/**
 * Everything the patient has told us, read back — plus who can see it.
 *
 * Four tabs rather than one long page, because these answer different
 * questions and are looked up at different moments:
 *
 *   Check-ins     "how have I been this week?"
 *   Baseline      "what did I say when I signed up?"
 *   My doctors    "who can see my history, and can I stop that?"
 *   Appointments  "when am I next seeing someone?"
 *
 * THE CONSENT CONTROL LIVES HERE
 * A patient who shared their record from the booking flow may never return to
 * that page. Consent they can grant but not find again is not really under
 * their control, so "who can see my record" and the button to revoke it sit
 * together, on the page they visit to look at their own data.
 */

const TABS = [
  { key: "checkins", label: "Check-ins" },
  { key: "baseline", label: "Baseline" },
  { key: "doctors", label: "My doctors" },
  { key: "appointments", label: "Appointments" },
];

export default function PatientRecords() {
  const [tab, setTab] = useState("checkins");
  const [checkins, setCheckins] = useState([]);
  const [baseline, setBaseline] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Each request fails independently. A patient who hasn't completed their
    // baseline still has appointments worth showing, so one 409 must not
    // blank the whole page.
    const [c, b, d, a] = await Promise.all([
      api.checkInHistory().catch(() => []),
      api.myBaseline().catch(() => null),
      api.myDoctors().catch(() => []),
      api.myAppointments({ includePast: true }).catch(() => []),
    ]);
    setCheckins(c ?? []);
    setBaseline(b);
    setDoctors(d ?? []);
    setAppointments(a ?? []);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  const stopSharing = async (doctor) => {
    try {
      await api.revokeConsent(doctor.id);
      setNotice(`${doctor.full_name} can no longer see your record.`);
      await load();
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const share = async (doctor) => {
    try {
      await api.grantConsent(doctor.id);
      setNotice(`${doctor.full_name} can now see your history and check-ins.`);
      await load();
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const cancel = async (appointment) => {
    try {
      await api.cancelAppointment(appointment.id);
      setNotice("Appointment cancelled.");
      await load();
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="empty">Loading your records…</p>;

  return (
    <section>
      <h1>My records</h1>

      <div className="row" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={entry.key === tab ? "btn btn--primary" : "btn btn--secondary"}
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {notice && <p className="notice" style={{ marginTop: "1rem" }}>{notice}</p>}
      {error && (
        <p className="alert" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        {tab === "checkins" && <CheckIns rows={checkins} />}
        {tab === "baseline" && <Baseline data={baseline} />}
        {tab === "doctors" && (
          <Doctors rows={doctors} onShare={share} onStop={stopSharing} />
        )}
        {tab === "appointments" && (
          <Appointments rows={appointments} onCancel={cancel} />
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ check-ins */

function CheckIns({ rows }) {
  if (rows.length === 0) {
    return (
      <p className="empty">
        No check-ins yet. <Link to="/patient/check-in">Log your first one</Link>.
      </p>
    );
  }

  return (
    <>
      <ul className="stack">
        {rows.map((row) => (
          <li className="card" key={row.checkin_id} style={{ marginBottom: 0 }}>
            <p className="eyebrow">{formatDay(row.created_at)}</p>
            <StatusBand status={row.status} score={row.score} label="Condition" />
            <p>{row.recommendation}</p>

            {row.nyha_class && (
              <p className="lede" style={{ fontSize: "0.875rem" }}>
                {NYHA_DESCRIPTION[row.nyha_class]?.label}
              </p>
            )}

            {(row.fired_rules ?? []).length > 0 && (
              <ol className="trail">
                {row.fired_rules.map((rule) => (
                  <li key={rule}>{TRIAGE_RULE_LABELS[rule] ?? rule}</li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
      <p className="disclaimer" style={{ marginTop: "1.5rem" }}>{DISCLAIMER}</p>
    </>
  );
}

/* ------------------------------------------------------------- baseline */

function Baseline({ data }) {
  if (!data) {
    return (
      <p className="empty">
        You haven't completed your baseline yet.{" "}
        <Link to="/patient/onboarding">Start it now</Link>.
      </p>
    );
  }

  const canChange = data.risk_factors.filter((f) => f.startsWith("Can change:"));
  const cannot = data.risk_factors.filter((f) => f.startsWith("Cannot change:"));

  return (
    <>
      <div className="card">
        <p className="eyebrow">
          Completed {data.completed_at ? formatDay(data.completed_at) : ""}
        </p>
        <p
          className="band__value"
          style={{ color: `var(--${bandClass(data.risk_level)})` }}
        >
          {data.risk_level}
        </p>
        {data.bmi && <p className="band__score">BMI {data.bmi}</p>}
      </div>

      {canChange.length > 0 && (
        <div className="card">
          <p className="eyebrow">Things you can change</p>
          <ul className="trail">
            {canChange.map((f) => (
              <li key={f}>{f.replace("Can change: ", "")}</li>
            ))}
          </ul>
        </div>
      )}

      {cannot.length > 0 && (
        <div className="card card--sunk">
          <p className="eyebrow">Things you can't change</p>
          <ul className="trail">
            {cannot.map((f) => (
              <li key={f}>{f.replace("Cannot change: ", "")}</li>
            ))}
          </ul>
        </div>
      )}

      <Facts title="About you" data={data.personal} />
      <Facts title="Medical history" data={data.medical_history} />
      <Facts title="Family history" data={data.family_history} />
      <Facts title="Daily life" data={data.lifestyle} />
      <Facts title="Medication" data={data.medication} />

      <p className="disclaimer">{BASELINE_NOTE}</p>
      <p className="disclaimer">{data.disclaimer ?? DISCLAIMER}</p>
    </>
  );
}

/* -------------------------------------------------------------- doctors */

function Doctors({ rows, onShare, onStop }) {
  if (rows.length === 0) {
    return (
      <p className="empty">
        You haven't seen any doctors yet.{" "}
        <Link to="/patient/doctors">Find one</Link>.
      </p>
    );
  }

  return (
    <ul className="stack">
      {rows.map((doctor) => (
        <li className="card" key={doctor.id} style={{ marginBottom: 0 }}>
          <p className="eyebrow">{doctor.specialty}</p>
          <h2 style={{ marginBottom: "0.25rem" }}>{doctor.full_name}</h2>

          {doctor.qualifications && (
            <p className="lede" style={{ margin: "0 0 0.25rem" }}>
              {doctor.qualifications}
            </p>
          )}
          {doctor.hospital && (
            <p style={{ margin: "0 0 0.25rem", fontWeight: 500 }}>
              {doctor.hospital}
            </p>
          )}
          {doctor.address && (
            <p className="lede" style={{ margin: "0 0 0.75rem", fontSize: "0.9375rem" }}>
              {doctor.address}
            </p>
          )}

          {doctor.working_days?.length > 0 && (
            <p className="row" style={{ gap: "0.375rem", margin: "0 0 0.75rem" }}>
              {doctor.working_days.map((w) => (
                <span className="pill" key={w}>{w}</span>
              ))}
            </p>
          )}

          {doctor.next_appointment && (
            <p className="lede" style={{ fontSize: "0.875rem" }}>
              Next appointment{" "}
              <span className="readout">{formatFull(doctor.next_appointment)}</span>
            </p>
          )}

          {/* Consent is stated in plain words, not implied by an icon. A
              patient should never have to work out whether their history is
              visible. */}
          <p className="row" style={{ marginBottom: "0.75rem" }}>
            <span className={doctor.record_shared ? "pill pill--on" : "pill pill--off"}>
              {doctor.record_shared ? "Can see your record" : "Cannot see your record"}
            </span>
          </p>

          {doctor.record_shared ? (
            <Button variant="danger" onClick={() => onStop(doctor)}>
              Stop sharing my record
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onShare(doctor)}>
              Share my record
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------- appointments */

function Appointments({ rows, onCancel }) {
  if (rows.length === 0) {
    return (
      <p className="empty">
        No appointments. <Link to="/patient/doctors">Book one</Link>.
      </p>
    );
  }

  const now = Date.now();
  const upcoming = rows.filter(
    (a) => a.status === "confirmed" && new Date(a.starts_at) >= now,
  );
  const past = rows.filter((a) => !upcoming.includes(a));

  return (
    <>
      {upcoming.length > 0 && (
        <>
          <h2>Coming up</h2>
          <ul className="stack">
            {upcoming.map((a) => (
              <li className="card" key={a.id} style={{ marginBottom: 0 }}>
                <p className="readout" style={{ fontSize: "1.125rem", marginBottom: "0.25rem" }}>
                  {formatFull(a.starts_at)}
                </p>
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>{a.doctor_name}</strong>
                </p>
                {a.hospital && <p className="lede">{a.hospital}</p>}
                {a.reason && (
                  <p className="lede" style={{ fontSize: "0.9375rem" }}>
                    Reason: {a.reason}
                  </p>
                )}

                {a.can_cancel ? (
                  <Button variant="danger" onClick={() => onCancel(a)}>
                    Cancel
                  </Button>
                ) : (
                  // Disabled with the reason rather than hidden — a missing
                  // button reads as a bug, an explained one reads as a rule.
                  <p className="lede" style={{ fontSize: "0.875rem", marginBottom: 0 }}>
                    Too late to cancel online. Contact the clinic directly.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 style={{ marginTop: "1.5rem" }}>Earlier</h2>
          <ul className="stack">
            {past.map((a) => (
              <li className="card" key={a.id} style={{ marginBottom: 0 }}>
                <div className="row row--between">
                  <span className="readout" style={{ fontSize: "0.9375rem" }}>
                    {formatFull(a.starts_at)}
                  </span>
                  <span className={a.status === "cancelled" ? "pill pill--off" : "pill"}>
                    {a.status}
                  </span>
                </div>
                <p className="lede" style={{ margin: "0.25rem 0 0" }}>
                  {a.doctor_name}
                  {a.cancelled_by && ` — cancelled by the ${a.cancelled_by}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ bits */

function Facts({ title, data }) {
  if (!data) return null;

  return (
    <div className="card">
      <p className="eyebrow">{title}</p>
      <dl style={{ margin: 0 }}>
        {Object.entries(data).map(([key, value]) => (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "0.75rem",
              padding: "0.5rem 0",
              borderTop: "1px solid var(--line)",
            }}
          >
            <dt className="lede" style={{ fontSize: "0.9375rem" }}>
              {humanise(key)}
            </dt>
            <dd className="readout" style={{ margin: 0, fontSize: "0.9375rem" }}>
              {display(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function humanise(key) {
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function display(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === "") return "—";
  if (value === "unknown") return "Don't know";
  return String(value);
}

function bandClass(level) {
  if (level === "high") return "bad";
  if (level === "medium") return "fair";
  return "good";
}

function formatDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFull(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
