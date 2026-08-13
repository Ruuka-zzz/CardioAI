import { useEffect, useState } from "react";
import { TRIAGE_RULE_LABELS } from "@shared/enums";
import { api } from "../../shared/api/client";
import Button from "../../shared/components/Button";
import StatusBand from "../../shared/components/StatusBand";

/**
 * Doctor view: connected patients, appointment requests, and — only where the
 * patient has granted it — the medical record.
 *
 * A 403 on the record fetch is not an error state to apologise for. It's the
 * consent gate working, and the copy says so plainly rather than showing a
 * generic failure that looks like a bug.
 */
export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [record, setRecord] = useState(null);
  const [recordState, setRecordState] = useState("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.doctorPatients().catch(() => []),
      api.doctorAppointments().catch(() => []),
    ])
      .then(([list, appts]) => {
        if (cancelled) return;
        setPatients(list ?? []);
        setAppointments(appts ?? []);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const openRecord = async (patient) => {
    setRecordState("loading");
    setRecord(null);
    try {
      setRecord(await api.patientRecord(patient.id));
      setRecordState("open");
    } catch (err) {
      setRecordState(err.status === 403 ? "not-shared" : "error");
      setError(err.message);
    }
  };

  const respond = async (appointment, status) => {
    try {
      await api.respondToAppointment(appointment.id, status);
      setAppointments(await api.doctorAppointments());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="empty">Loading your patients…</p>;

  return (
    <section>
      <h1>Your patients</h1>

      {error && recordState !== "not-shared" && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {appointments.length > 0 && (
        <>
          <h2>Appointment requests</h2>
          <ul className="stack">
            {appointments
              .filter((a) => a.status === "requested")
              .map((appointment) => (
                <li className="card" key={appointment.id} style={{ marginBottom: 0 }}>
                  <p className="readout" style={{ marginBottom: "0.5rem" }}>
                    {formatSlot(appointment.starts_at)}
                  </p>
                  <p>{appointment.patient_name ?? "Patient"}</p>
                  {appointment.reason && <p className="lede">{appointment.reason}</p>}
                  <div className="row">
                    <Button onClick={() => respond(appointment, "confirmed")}>
                      Confirm
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => respond(appointment, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        </>
      )}

      <h2>Connected patients</h2>
      {patients.length === 0 ? (
        <p className="empty">
          No patients have connected with you yet. They'll appear here once they
          book an appointment.
        </p>
      ) : (
        <ul className="stack">
          {patients.map((patient) => (
            <li className="card" key={patient.id} style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{patient.full_name}</h3>
                <span className={patient.record_shared ? "pill pill--on" : "pill pill--off"}>
                  {patient.record_shared ? "Record shared" : "Record private"}
                </span>
              </div>
              <div className="row" style={{ marginTop: "0.75rem" }}>
                <Button
                  variant="secondary"
                  onClick={() => openRecord(patient)}
                  disabled={!patient.record_shared}
                >
                  Open record
                </Button>
              </div>
              {!patient.record_shared && (
                <p className="lede" style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
                  This patient hasn't shared their history with you.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {recordState === "loading" && <p className="empty">Opening record…</p>}

      {recordState === "not-shared" && (
        <div className="card card--sunk">
          <h2>Record not shared</h2>
          <p style={{ marginBottom: 0 }}>
            This patient hasn't given you access to their medical record. Only
            they can grant it, from their doctors page.
          </p>
        </div>
      )}

      {recordState === "open" && record && (
        <div className="card">
          <p className="eyebrow">Medical record · access logged</p>
          <h2>{record.full_name}</h2>
          <p className="lede">
            Baseline risk: <span className="readout">{record.baseline_risk ?? "not set"}</span>
          </p>

          {(record.recent_checkins ?? []).length > 0 && (
            <>
              <h3>Recent check-ins</h3>
              <ul className="stack">
                {record.recent_checkins.map((c, i) => (
                  <li key={`${c.date}-${c.slot}-${i}`}>
                    <StatusBand
                      status={c.status}
                      score={c.score ?? 0}
                      label={`${c.date} · ${c.slot}`}
                    />
                    {(c.fired_rules ?? []).length > 0 && (
                      <ol className="trail">
                        {c.fired_rules.map((rule) => (
                          <li key={rule}>{TRIAGE_RULE_LABELS[rule] ?? rule}</li>
                        ))}
                      </ol>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <Button variant="quiet" onClick={() => setRecordState("idle")}>
            Close record
          </Button>
        </div>
      )}
    </section>
  );
}

function formatSlot(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}