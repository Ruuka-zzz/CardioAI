import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, Home, Key, LogOut, Trash2, UserCheck } from "lucide-react";
import { api } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/AuthContext";

const inputClass = "bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");
const Title = ({ icon: Icon, title, subtitle }) => <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800"><Icon className="w-5 h-5" /></div><div><h2 className="text-sm font-bold text-slate-950">{title}</h2><p className="text-[11px] text-slate-600">{subtitle}</p></div></div>;

/** Operational dashboard backed entirely by the protected admin API. */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ full_name: "", specialty: "", bio: "" });
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [doctorList, bookingList, auditList] = await Promise.all([api.adminDoctors(), api.adminAppointments(), api.auditLog()]);
    setDoctors(doctorList ?? []); setAppointments(bookingList ?? []); setLogs(auditList ?? []);
  };
  useEffect(() => { refresh().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  const issueKey = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.specialty.trim()) return setError("Enter the doctor's name and specialty.");
    setBusy(true); setError("");
    try { setIssued(await api.issueDoctorCode({ full_name: form.full_name.trim(), specialty: form.specialty.trim(), bio: form.bio.trim() || null })); setForm({ full_name: "", specialty: "", bio: "" }); await refresh(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const revoke = async (doctor) => { if (window.confirm(`Disable ${doctor.full_name}'s account?`)) try { await api.revokeDoctor(doctor.id); await refresh(); } catch (err) { setError(err.message); } };
  const logout = () => { signOut(); navigate("/admin-login", { replace: true }); };
  if (loading) return <div className="min-h-[calc(100vh-4rem)] bg-[#9bc5bb] p-8 text-xs text-slate-700">Loading administration data…</div>;

  return <div className="min-h-[calc(100vh-4rem)] bg-[#9bc5bb] text-slate-900 p-6 md:p-8 relative overflow-hidden"><div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/25 blur-[120px] rounded-full pointer-events-none" /><div className="max-w-5xl mx-auto space-y-6 relative z-10">
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/85 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-md gap-4"><div><h1 className="text-2xl font-black text-slate-950">System Administration Panel</h1><p className="text-xs text-slate-600 mt-1">Manage clinician accounts, activation keys, and system appointments.</p></div><div className="flex gap-3"><button onClick={() => navigate("/")} className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs font-bold"><Home className="w-4 h-4 text-teal-700" />Home</button><button onClick={logout} className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs font-bold text-rose-600"><LogOut className="w-4 h-4" />Sign Out</button></div></header>
    {error && <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</p>}
    {issued?.activation_code && <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900">Activation key for <strong>{issued.full_name}</strong>: <strong className="font-mono text-teal-950">{issued.activation_code}</strong> <span className="ml-2">Save this securely—it is shown once.</span></div>}
    <section className="bg-white/85 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-md space-y-4"><Title icon={Key} title="Issue Clinician Activation Key" subtitle="Generate secure credentials for a new doctor." /><form onSubmit={issueKey} className="grid grid-cols-1 md:grid-cols-3 gap-3"><input required placeholder="Doctor's Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} /><input required placeholder="Specialty (e.g. Cardiology)" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className={inputClass} /><button disabled={busy} className="py-2.5 bg-slate-900 text-teal-300 font-bold text-xs rounded-xl disabled:opacity-50">{busy ? "Generating…" : "Generate Key"}</button><input placeholder="Short bio (optional)" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${inputClass} md:col-span-3`} /></form></section>
    <section className="bg-white/85 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-md space-y-4"><Title icon={UserCheck} title="Clinician Accounts" subtitle="Manage registered medical professionals." /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{doctors.map((doctor) => <article key={doctor.id} className="bg-white/90 border border-slate-200/80 rounded-xl p-4 flex justify-between items-start"><div className="space-y-1 min-w-0"><p className="text-xs font-bold truncate">{doctor.full_name}</p><p className="text-[11px] text-teal-800 font-semibold">{doctor.specialty}</p><span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 font-mono">{doctor.activated ? "Active" : "Key Issued"}</span></div>{doctor.activated && <button onClick={() => revoke(doctor)} title="Disable account" className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl"><Trash2 className="w-4 h-4" /></button>}</article>)}{!doctors.length && <p className="text-xs text-slate-600">No clinicians have been added yet.</p>}</div></section>
    <section className="bg-white/85 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-md space-y-4"><div className="flex items-center justify-between"><Title icon={Calendar} title="System Bookings & Appointments" subtitle="Operational view only; clinical data remains protected." /><span className="text-xs bg-teal-50 text-teal-900 border border-teal-200 px-3 py-1 rounded-full font-mono">Total: {appointments.length}</span></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{appointments.map((item) => <article key={item.id} className="bg-white/90 border border-slate-200/80 rounded-xl p-4 space-y-1.5"><div className="flex justify-between gap-2"><strong className="text-xs">Patient: {item.patient_name ?? "Unknown"}</strong><span className="text-[10px] bg-teal-50 text-teal-900 px-2 py-0.5 rounded-md border border-teal-200 font-mono">{item.status}</span></div><p className="text-[11px] text-teal-800 font-semibold">Doctor: {item.doctor_name ?? "Unknown"}</p><p className="text-[11px] text-slate-600 font-mono">{formatDate(item.starts_at)}</p></article>)}</div>{!appointments.length && <p className="text-xs text-slate-600">No appointments yet.</p>}</section>
    <section className="bg-white/85 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-md space-y-4"><Title icon={FileText} title="Record Access Audit Log" subtitle="Latest clinician access events." />{logs.slice(0, 10).map((log) => <div key={log.id} className="text-xs bg-white/80 border border-slate-200 rounded-xl p-3 flex justify-between gap-3"><span>{log.actor_name ?? log.actor_user_id} — {log.action}</span><span className="text-slate-500">{formatDate(log.occurred_at)}</span></div>)}{!logs.length && <p className="text-xs text-slate-600">No record accesses logged yet.</p>}</section>
  </div></div>;
}
