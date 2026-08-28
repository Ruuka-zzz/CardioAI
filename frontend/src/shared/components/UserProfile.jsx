import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

export default function UserProfile() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [tab, setTab] = useState("checkins");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.me(), api.checkInHistory().catch(() => []), api.myAppointments().catch(() => [])])
      .then(([user, records, bookings]) => { if (active) { setProfile(user); setCheckins(records ?? []); setAppointments(bookings ?? []); } })
      .catch((requestError) => active && setError(requestError.message));
    return () => { active = false; };
  }, []);

  if (error) return <p className="alert" role="alert">{error}</p>;
  if (!profile) return <p className="empty">Loading your profile…</p>;

  return <section className="min-h-[calc(100dvh-5rem)] bg-[#9bc5bb] p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6"><div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl"><div><h1 className="text-2xl font-black text-slate-950">{profile.full_name || "CardioAI user"}</h1><p className="text-sm text-slate-600">{profile.email}</p><span className="mt-2 inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">{profile.role}</span></div><button type="button" onClick={signOut} className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700">Sign out</button></div><div className="flex gap-3 border-b border-slate-900/10 pb-3"><Tab active={tab === "checkins"} onClick={() => setTab("checkins")}>Daily Check-ins</Tab><Tab active={tab === "appointments"} onClick={() => setTab("appointments")}>Doctor Bookings</Tab></div><div className="min-h-[300px] rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl">{tab === "checkins" ? <Checkins records={checkins} /> : <Appointments records={appointments} />}</div></div></section>;
}

function Tab({ active, children, onClick }) { return <button type="button" onClick={onClick} className={`rounded-xl px-5 py-2.5 text-xs font-bold ${active ? "bg-slate-900 text-teal-300" : "bg-white/60 text-slate-700 hover:bg-white"}`}>{children}</button>; }
function Checkins({ records }) { return <div className="space-y-3"><h2 className="text-lg font-black text-slate-950">Daily Check-in History</h2>{records.length === 0 ? <p className="text-sm text-slate-600">No completed check-ins yet. <Link to="/patient/check-in">Start one now.</Link></p> : records.map((record) => <article key={record.checkin_id} className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-sm"><div><p className="font-bold text-slate-900">{formatDate(record.created_at)}</p><p className="m-0 text-slate-600">{record.recommendation}</p></div><span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">{record.status}</span></article>)}</div>; }
function Appointments({ records }) { return <div className="space-y-3"><h2 className="text-lg font-black text-slate-950">My Doctor Bookings</h2>{records.length === 0 ? <p className="text-sm text-slate-600">No upcoming appointments. <Link to="/patient/doctors">Find a doctor.</Link></p> : records.map((record) => <article key={record.id} className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-sm"><div><p className="font-bold text-slate-950">{record.doctor_name || "Doctor"}</p><p className="m-0 text-slate-600">{formatDate(record.starts_at)}{record.hospital ? ` · ${record.hospital}` : ""}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">{record.status}</span></article>)}</div>; }
function formatDate(value) { return value ? new Date(value).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""; }