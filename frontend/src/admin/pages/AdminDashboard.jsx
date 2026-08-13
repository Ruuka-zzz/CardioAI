import { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import Button from "../../shared/components/Button";
import FormInput from "../../shared/components/FormInput";

/**
 * Admin: issue doctor activation codes, manage doctor accounts, read the
 * audit log.
 *
 * No AI anywhere in this view by design — it's account administration.
 *
 * The generated code is shown once, immediately after issuing, because the
 * admin has to pass it to the doctor out of band. If it's lost, issue a new
 * one rather than trying to recover it.
 */
export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [audit, setAudit] = useState([]);
  const [form, setForm] = useState({ full_name: "", specialty: "", bio: "" });
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.adminDoctors().catch(() => []),
      api.auditLog().catch(() => []),
    ])
      .then(([list, log]) => {
        if (cancelled) return;
        setDoctors(list ?? []);
        setAudit(log ?? []);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const issue = async (event) => {
    event.preventDefault();

    if (!form.full_name.trim() || !form.specialty.trim()) {
      setError("Enter the doctor's name and specialty.");
      return;
    }

    setBusy(true);
    try {
      const created = await api.issueDoctorCode({
        full_name: form.full_name.trim(),
        specialty: form.specialty.trim(),
        bio: form.bio.trim() || null,
      });
      setIssued(created);
      setForm({ full_name: "", specialty: "", bio: "" });
      setDoctors(await api.adminDoctors());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (doctor) => {
    try {
      await api.revokeDoctor(doctor.id);
      setDoctors(await api.adminDoctors());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="empty">Loading…</p>;

  return (
    <section>
      <h1>Doctor accounts</h1>

      {issued && (
        <div className="card">
          <p className="eyebrow">Activation code · shown once</p>
          <p className="readout" style={{ fontSize: "1.375rem", letterSpacing: "0.08em" }}>
            {issued.activation_code}
          </p>
          <p style={{ marginBottom: 0 }}>
            Send this to {issued.full_name}. It can't be retrieved later — issue
            a new one if it's lost.
          </p>
        </div>
      )}

      <form onSubmit={issue} className="card" noValidate>
        <h2>Issue a new code</h2>
        <FormInput label="Doctor's name" value={form.full_name} onChange={set("full_name")} />
        <FormInput label="Specialty" value={form.specialty} onChange={set("specialty")} />
        <FormInput
          label="Short bio"
          hint="Shown on their public profile. Optional."
          value={form.bio}
          onChange={set("bio")}
        />

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" busy={busy} busyLabel="Issuing…">
          Issue activation code
        </Button>
      </form>

      <h2>Doctors on the platform</h2>
      {doctors.length === 0 ? (
        <p className="empty">No doctors yet. Issue a code to get started.</p>
      ) : (
        <ul className="stack">
          {doctors.map((doctor) => (
            <li className="card" key={doctor.id} style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{doctor.full_name}</h3>
                  <p className="lede" style={{ margin: 0 }}>
                    {doctor.specialty}
                  </p>
                </div>
                <span className={doctor.activated ? "pill pill--on" : "pill pill--off"}>
                  {doctor.activated ? "Active" : "Code unused"}
                </span>
              </div>
              <Button variant="quiet" onClick={() => revoke(doctor)}>
                Remove from platform
              </Button>
            </li>
          ))}
        </ul>
      )}

      <h2>Record access log</h2>
      {audit.length === 0 ? (
        <p className="empty">No record accesses logged yet.</p>
      ) : (
        <ul className="stack">
          {audit.slice(0, 25).map((entry) => (
            <li key={entry.id} className="readout" style={{ fontSize: "0.8125rem" }}>
              {new Date(entry.occurred_at).toLocaleString()} · {entry.actor_name ?? entry.actor_user_id}{" "}
              · {entry.action}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}