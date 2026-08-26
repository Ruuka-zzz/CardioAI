<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import { Users, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

=======
import React, { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { TRIAGE_RULE_LABELS } from "@shared/enums";
import {
  Users, Calendar, CheckCircle, XCircle, Lock, Unlock, Activity, X,
} from "lucide-react";

/**
 * Clinician view: connected patients, appointment requests, and — only where
 * the patient has granted it — the medical record.
 *
 * CONTRACT NOTES — each of these broke in the previous version:
 *   - Appointment status is "requested", not "pending". Checking for
 *     "pending" meant the confirm/decline buttons never rendered.
 *   - The decline value is "declined", not "rejected". The enum rejects
 *     anything else with a 422.
 *
 * A 403 on the record fetch is NOT an error to apologise for. It is the
 * consent gate working, and the copy says so plainly — a generic failure
 * message there reads like a bug and invites someone to "fix" it.
 */
>>>>>>> 9abc73342c9995dd65581221420f3071c323c673
export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
<<<<<<< HEAD
    async function fetchData() {
      try {
        const [pts, appts] = await Promise.all([
          api.doctorPatients(),
          api.doctorAppointments()
        ]);
        setPatients(pts || []);
        setAppointments(appts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAppointmentAction = async (id, status) => {
=======
    let cancelled = false;

    Promise.all([
      api.doctorPatients().catch(() => []),
      api.doctorAppointments().catch(() => []),
    ])
      .then(([patientList, appointmentList]) => {
        if (cancelled) return;
        setPatients(patientList ?? []);
        setAppointments(appointmentList ?? []);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const respond = async (id, status) => {
    try {
      await api.respondToAppointment(id, status);
      setAppointments(await api.doctorAppointments());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const openRecord = async (patient) => {
    setRecordState("loading");
    setRecord(null);
>>>>>>> 9abc73342c9995dd65581221420f3071c323c673
    try {
      await api.respondToAppointment(id, status);
      setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
<<<<<<< HEAD
    return <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center text-slate-500 text-xs">Loading Clinical Data...</div>;
  }
=======
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-400 p-8 text-xs">
        Loading your patients…
      </div>
    );
  }

  const pending = appointments.filter((a) => a.status === "requested");
>>>>>>> 9abc73342c9995dd65581221420f3071c323c673

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
<<<<<<< HEAD
          <h2 className="text-2xl font-bold text-white">Clinical Workstation</h2>
          <p className="text-xs text-slate-400 mt-1">Patient monitoring and appointment dispatch management</p>
        </div>

        {/* Patients Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Active Assigned Patients</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-4">Patient ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Monitoring Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {patients.length === 0 ? (
                  <tr><td colSpan="3" className="p-6 text-center text-slate-500">No active patients currently assigned.</td></tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="p-4 font-mono font-bold text-emerald-400">{p.id}</td>
                      <td className="p-4 text-slate-200 font-semibold">{p.name || 'Patient'}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                          Continuous Tracking
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Consultation Requests</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.length === 0 ? (
              <p className="text-slate-500 text-xs col-span-2">No pending consultation requests.</p>
            ) : (
              appointments.map((appt) => (
                <div key={appt.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Request #{appt.id}</span>
                    <h4 className="text-xs font-bold text-slate-200 mt-1">Status: <span className="text-emerald-400 uppercase">{appt.status}</span></h4>
                  </div>
                  {appt.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAppointmentAction(appt.id, 'confirmed')} className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAppointmentAction(appt.id, 'rejected')} className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl font-bold text-xs">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
=======
          <h2 className="text-2xl font-bold text-white">Clinical Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">
            Connected patients, appointment requests &amp; consent-gated records
          </p>
        </div>

        {error && recordState !== "not-shared" && (
          <div
            role="alert"
            className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300"
          >
            {error}
          </div>
        )}

        {/* Appointment requests */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">
              Appointment Requests
            </h3>
            {pending.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400">
                {pending.length}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <p className="text-slate-500 text-xs">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((appt) => (
                <div
                  key={appt.id}
                  className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                      {formatSlot(appt.starts_at)}
                    </p>
                    <h4 className="text-sm font-semibold text-slate-200 mt-1">
                      {appt.patient_name ?? "Patient"}
                    </h4>
                    {appt.reason && (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {appt.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => respond(appt.id, "confirmed")}
                      title="Confirm"
                      className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(appt.id, "declined")}
                      title="Decline"
                      className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patients */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Connected Patients</h3>
          </div>

          {patients.length === 0 ? (
            <p className="text-slate-500 text-xs">
              No patients have connected with you yet. They appear here once they
              book an appointment.
            </p>
          ) : (
            <div className="space-y-2">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {patient.full_name}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      {patient.record_shared ? (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          Record shared with you
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Record private
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openRecord(patient)}
                    disabled={!patient.record_shared}
                    className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    Open record
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {recordState === "loading" && (
          <p className="text-slate-500 text-xs">Opening record…</p>
        )}

        {/* The consent gate, explained rather than apologised for */}
        {recordState === "not-shared" && (
          <div className="bg-slate-900 border border-dashed border-slate-700 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-slate-500" />
              <h3 className="text-base font-bold text-white">Record not shared</h3>
            </div>
            <p className="text-xs text-slate-400">
              This patient hasn&apos;t given you access to their medical record.
              Only they can grant it, from their doctors page — and they can
              withdraw it at any time.
            </p>
          </div>
        )}

        {recordState === "open" && record && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                  Medical record · this access has been logged
                </p>
                <h3 className="text-lg font-bold text-white mt-1">
                  {record.full_name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Baseline risk:{" "}
                  <span className="font-mono text-slate-200">
                    {record.baseline_risk ?? "not set"}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecordState("idle")}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(record.recent_checkins ?? []).length === 0 ? (
              <p className="text-slate-500 text-xs">No check-ins recorded yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Recent check-ins
                  </h4>
                </div>

                {record.recent_checkins.map((entry, i) => (
                  <div
                    key={`${entry.date}-${entry.slot}-${i}`}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyle(entry.status)}`}
                      >
                        {entry.status ?? "—"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {entry.date} · {entry.slot} · {entry.score ?? "—"}
                      </span>
                    </div>

                    {(entry.fired_rules ?? []).length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {entry.fired_rules.map((rule) => (
                          <li
                            key={rule}
                            className="text-[11px] text-slate-400 flex gap-2"
                          >
                            <span className="text-slate-600">·</span>
                            {TRIAGE_RULE_LABELS[rule] ?? rule}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function statusStyle(status) {
  if (status === "good") return "bg-emerald-500/10 text-emerald-400";
  if (status === "fair") return "bg-amber-500/10 text-amber-400";
  if (status === "bad") return "bg-rose-500/10 text-rose-400";
  return "bg-slate-800 text-slate-500";
}

function formatSlot(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
>>>>>>> 9abc73342c9995dd65581221420f3071c323c673
}