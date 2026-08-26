<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import { Shield, Key, FileText, Check } from 'lucide-react';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [email, setEmail] = useState('');
  const [issuedCode, setIssuedCode] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const auditLogs = await api.auditLog();
        setLogs(auditLogs || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const handleIssueCode = async (e) => {
    e.preventDefault();
=======
import React, { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { Key, FileText, UserX, ShieldCheck, Clock } from "lucide-react";

/**
 * System administration: issue clinician activation keys, manage doctor
 * accounts, review the record-access audit log.
 *
 * CONTRACT NOTES — each of these broke in the previous version:
 *   - POST /api/admin/doctors takes { full_name, specialty, bio }, NOT an
 *     email. The doctor supplies their own email when redeeming the code.
 *   - The response field is `activation_code`, not `code`.
 *   - Audit entries carry `occurred_at`, not `timestamp`.
 *
 * The generated code is shown once, because the admin passes it to the doctor
 * out of band. GET /admin/doctors withholds codes for already-activated
 * doctors — a spent code on screen is pure risk.
 */
export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [logs, setLogs] = useState([]);
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
      .then(([doctorList, auditLogs]) => {
        if (cancelled) return;
        setDoctors(doctorList ?? []);
        setLogs(auditLogs ?? []);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleIssue = async (e) => {
    e.preventDefault();

    if (!form.full_name.trim() || !form.specialty.trim()) {
      setError("Enter the doctor's name and specialty.");
      return;
    }

    setBusy(true);
>>>>>>> 9abc73342c9995dd65581221420f3071c323c673
    try {
      const res = await api.issueDoctorCode({ email });
      setIssuedCode(res?.code || 'SUCCESS');
      setEmail('');
    } catch (err) {
      alert(err.message);
    }
  };

<<<<<<< HEAD
=======
  const handleRevoke = async (doctor) => {
    try {
      await api.revokeDoctor(doctor.id);
      setDoctors(await api.adminDoctors());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-400 p-8 text-xs">
        Loading administration data…
      </div>
    );
  }

>>>>>>> 9abc73342c9995dd65581221420f3071c323c673
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">System Administration</h2>
<<<<<<< HEAD
          <p className="text-xs text-slate-400 mt-1">Provider activation, access control & security audit logging</p>
        </div>

        {/* Issue Code Block */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Issue Clinician Activation Key</h3>
          </div>
          <form onSubmit={handleIssueCode} className="flex gap-3">
            <input
              type="email"
              placeholder="Doctor's Professional Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <button type="submit" className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl hover:from-emerald-400 hover:to-teal-300 transition-all">
              Generate Key
            </button>
          </form>

          {issuedCode && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
              <span className="text-xs text-slate-300">Activation Code Generated:</span>
              <span className="font-mono text-emerald-400 font-bold text-sm tracking-wider">{issuedCode}</span>
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">System Security Audit Log</h3>
          </div>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-xs">No recorded system audit logs.</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                  <span className="font-semibold text-slate-300">{log.action || 'Access Event'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{log.timestamp || 'Recorded'}</span>
                </div>
=======
          <p className="text-xs text-slate-400 mt-1">
            Provider activation, access control &amp; security audit logging
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300"
          >
            {error}
          </div>
        )}

        {issued?.activation_code && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              Activation code · shown once
            </p>
            <p className="font-mono text-2xl font-bold text-emerald-300 tracking-widest">
              {issued.activation_code}
            </p>
            <p className="text-xs text-slate-300">
              Send this to {issued.full_name}. It can&apos;t be retrieved later —
              issue a new one if it&apos;s lost.
            </p>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Issue Clinician Activation Key
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            The doctor supplies their own email when redeeming the code, so none
            is needed here.
          </p>

          <form onSubmit={handleIssue} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Doctor's full name"
                value={form.full_name}
                onChange={set("full_name")}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              <input
                type="text"
                placeholder="Specialty"
                value={form.specialty}
                onChange={set("specialty")}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <input
              type="text"
              placeholder="Short bio (optional) — shown on their public profile"
              value={form.bio}
              onChange={set("bio")}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />

            <button
              type="submit"
              disabled={busy}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl hover:from-emerald-400 hover:to-teal-300 transition-all disabled:opacity-50"
            >
              {busy ? "Generating…" : "Generate Key"}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Clinician Accounts</h3>
          </div>

          {doctors.length === 0 ? (
            <p className="text-slate-500 text-xs">
              No clinicians yet. Issue a key to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {doctor.full_name}
                    </p>
                    <p className="text-[11px] text-slate-500">{doctor.specialty}</p>
                    {!doctor.activated && doctor.activation_code && (
                      <p className="text-[11px] font-mono text-amber-400 mt-1 tracking-wider">
                        {doctor.activation_code}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={
                        doctor.activated
                          ? "text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400"
                          : "text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-500"
                      }
                    >
                      {doctor.activated ? "Active" : "Code unused"}
                    </span>

                    {doctor.activated && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(doctor)}
                        title="Remove from platform"
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">
              Record Access Audit Log
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Every time a clinician opens a patient record, it is recorded here.
          </p>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-xs">
                No record accesses logged yet.
              </p>
            ) : (
              logs.slice(0, 25).map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs flex justify-between items-center gap-4"
                >
                  <span className="font-semibold text-slate-300 truncate">
                    {log.actor_name ?? log.actor_user_id} — {log.action}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime(log.occurred_at)}
                  </span>
                </div>
>>>>>>> 9abc73342c9995dd65581221420f3071c323c673
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}