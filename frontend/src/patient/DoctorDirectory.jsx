import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock3, MapPin, Stethoscope, X } from "lucide-react";
import { api } from "../shared/api/client";

/** Card-style directory UI backed by the patient booking and consent APIs. */
export default function DoctorDirectory() {
  const [doctors, setDoctors] = useState([]);
  const [consents, setConsents] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [slots, setSlots] = useState([]);
  const [chosenSlot, setChosenSlot] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [list, granted] = await Promise.all([api.listDoctors(), api.myConsents().catch(() => [])]);
    setDoctors(list ?? []);
    setConsents(new Set((granted ?? []).map((item) => item.doctor_id)));
  }, []);
  useEffect(() => { load().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [load]);

  const openBooking = async (doctor) => {
    setSelected(doctor); setSlots([]); setChosenSlot(""); setReason(""); setError(""); setNotice(""); setBusy(true);
    try { setSlots(await api.availability(doctor.id)); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const closeBooking = () => { setSelected(null); setSlots([]); setChosenSlot(""); setReason(""); };
  const book = async (event) => {
    event.preventDefault();
    if (!chosenSlot) return setError("Choose an available appointment time.");
    setBusy(true);
    try {
      await api.requestAppointment({ doctor_id: selected.id, starts_at: chosenSlot, reason: reason.trim() || null });
      setNotice(`Your appointment with ${selected.full_name} is confirmed.`); closeBooking();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const toggleConsent = async (doctor) => {
    const shared = consents.has(doctor.id); setError("");
    try {
      if (shared) { await api.revokeConsent(doctor.id); setConsents((old) => { const next = new Set(old); next.delete(doctor.id); return next; }); setNotice(`Stopped sharing your record with ${doctor.full_name}.`); }
      else { await api.grantConsent(doctor.id); setConsents((old) => new Set(old).add(doctor.id)); setNotice(`${doctor.full_name} can now view your record.`); }
    } catch (err) { setError(err.message); }
  };

  return <div className="doctor-directory-page min-h-[calc(100vh-4rem)] bg-[#9bc5bb] p-4 md:p-6 relative overflow-hidden text-slate-900">
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-white/25 blur-[120px] pointer-events-none" />
    <main className="max-w-5xl mx-auto py-4 md:py-6 space-y-6 relative z-10">
      <div className="text-center space-y-1.5"><h1 className="text-3xl md:text-4xl font-black text-slate-950">Cardiologist Directory &amp; Booking</h1><p className="text-xs md:text-sm text-slate-700">Select a specialist and schedule your consultation session.</p></div>
      {notice && <p className="max-w-2xl mx-auto rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs font-semibold text-teal-900">{notice}</p>}
      {error && <p role="alert" className="max-w-2xl mx-auto rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
      {loading ? <p className="text-center text-sm text-slate-700">Loading doctors…</p> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} shared={consents.has(doctor.id)} onBook={openBooking} onShare={toggleConsent} />)}{!doctors.length && <p className="md:col-span-3 text-center text-sm text-slate-700">No active doctors are available right now.</p>}</div>}
    </main>
    {selected && <BookingModal doctor={selected} slots={slots} chosenSlot={chosenSlot} setChosenSlot={setChosenSlot} reason={reason} setReason={setReason} busy={busy} onClose={closeBooking} onSubmit={book} />}
  </div>;
}

function DoctorCard({ doctor, shared, onBook, onShare }) {
  return <article className="bg-white/90 p-5 rounded-2xl shadow-md border border-white/80 backdrop-blur-md flex flex-col justify-between gap-5 hover:shadow-lg transition-shadow"><div className="space-y-3"><div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800 shadow-inner"><Stethoscope className="w-5 h-5" /></div><div><h2 className="text-sm font-bold text-slate-950">{doctor.full_name}</h2><p className="mt-1 text-[11px] font-bold text-teal-800">{doctor.specialty}</p>{doctor.staff_id && <p className="text-[10px] text-slate-500 font-mono">{doctor.staff_id}</p>}</div>{doctor.bio && <p className="text-[11px] text-slate-600 leading-relaxed">{doctor.bio}</p>}{doctor.hospital && <p className="text-[11px] text-slate-700 flex gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-700" />{doctor.hospital}{doctor.address ? ` · ${doctor.address}` : ""}</p>}</div><div className="space-y-2"><p className="text-[10px] font-medium text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/60 flex gap-1.5"><CalendarDays className="w-3.5 h-3.5 shrink-0" />{doctor.working_days?.length ? doctor.working_days.join(" · ") : "Schedule not published yet"}</p>{doctor.next_available && <p className="text-[10px] text-teal-800 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />Next: {formatSlot(doctor.next_available)}</p>}<button onClick={() => onBook(doctor)} className="w-full py-2.5 rounded-xl bg-[#528d80] hover:bg-[#43756a] text-white text-xs font-bold shadow-sm">Book Appointment</button><button onClick={() => onShare(doctor)} className="w-full text-[11px] font-semibold text-teal-800 hover:underline">{shared ? "Stop sharing my record" : "Share my record"}</button></div></article>;
}

function BookingModal({ doctor, slots, chosenSlot, setChosenSlot, reason, setReason, busy, onClose, onSubmit }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-labelledby="booking-title"><div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-2xl border border-teal-200 space-y-4"><div className="flex justify-between items-start border-b border-slate-200 pb-3"><div><h2 id="booking-title" className="text-sm font-black text-slate-950">Book Appointment with {doctor.full_name}</h2><p className="text-[11px] text-teal-800 font-semibold">{doctor.specialty}{doctor.hospital ? ` · ${doctor.hospital}` : ""}</p></div><button onClick={onClose} aria-label="Close booking" className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button></div><form onSubmit={onSubmit} className="space-y-4"><label className="block text-[11px] font-bold text-slate-700">Available date &amp; time<select required value={chosenSlot} onChange={(event) => setChosenSlot(event.target.value)} disabled={busy || !slots.length} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"><option value="">{busy ? "Loading available times…" : slots.length ? "Choose a time" : "No times are currently available"}</option>{slots.map((slot) => <option key={slot.starts_at} value={slot.starts_at}>{formatSlot(slot.starts_at)}</option>)}</select></label><label className="block text-[11px] font-bold text-slate-700">Symptoms / notes (optional)<textarea rows="3" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Briefly describe your reason for the appointment…" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" /></label><div className="flex gap-2.5"><button type="submit" disabled={busy || !slots.length} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-teal-300 text-xs font-bold disabled:opacity-50">{busy ? "Saving…" : "Confirm Booking"}</button><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">Cancel</button></div></form></div></div>;
}

function formatSlot(value) { return new Date(value).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
