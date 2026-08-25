import React, { useEffect, useState } from "react";
import { api } from "../shared/api/client";
import {
  Stethoscope, Clock, Lock, Unlock, ChevronDown, ChevronUp, Check,
} from "lucide-react";

/**
 * Doctor discovery, booking, and record sharing.
 *
 * Booking and sharing are separate actions on purpose. Requesting an
 * appointment gives a doctor your time; sharing gives them your history. The
 * backend enforces that split — this page has to make it legible, which is
 * why the sharing state is shown explicitly under every doctor rather than
 * inferred from whether an appointment exists.
 *
 * This file was missing from the redesign document, so it would otherwise
 * still be carrying the old stylesheet's class names against a dark theme.
 */
export default function DoctorDirectory() {
  const [doctors, setDoctors] = useState([]);
  const [consents, setConsents] = useState(new Set());
  const [openDoctor, setOpenDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsBusy, setSlotsBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.listDoctors(), api.myConsents().catch(() => [])])
      .then(([list, granted]) => {
        if (cancelled) return;
        setDoctors(list ?? []);
        setConsents(new Set((granted ?? []).map((c) => c.doctor_id)));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const showTimes = async (doctor) => {
    if (openDoctor?.id === doctor.id) {
      setOpenDoctor(null);
      return;
    }

    setOpenDoctor(doctor);
    setSlots([]);
    setSlotsBusy(true);
    setError("");

    try {
      setSlots(await api.availability(doctor.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setSlotsBusy(false);
    }
  };

  const book = async (slot) => {
    try {
      await api.requestAppointment({
        doctor_id: openDoctor.id,
        starts_at: slot.starts_at,
      });
      setNotice(
        `Requested ${formatSlot(slot.starts_at)} with ${openDoctor.full_name}. ` +
          `Your record stays private unless you share it.`,
      );
      setSlots(await api.availability(openDoctor.id));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSharing = async (doctor) => {
    const shared = consents.has(doctor.id);

    try {
      if (shared) {
        await api.revokeConsent(doctor.id);
        setConsents((prev) => {
          const next = new Set(prev);
          next.delete(doctor.id);
          return next;
        });
        setNotice(`${doctor.full_name} can no longer see your record.`);
      } else {
        await api.grantConsent(doctor.id);
        setConsents((prev) => new Set(prev).add(doctor.id));
        setNotice(
          `${doctor.full_name} can now see your history and check-ins. ` +
            `You can stop sharing at any time.`,
        );
      }
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-400 p-8 text-xs">
        Loading doctors…
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Find a Doctor</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Request a time that suits you. Sharing your record is a separate
            choice — booking alone doesn&apos;t reveal your history.
          </p>
        </div>

        {notice && (
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-xs text-teal-300 flex gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300"
          >
            {error}
          </div>
        )}

        {doctors.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
            <Stethoscope className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-xs">
              No doctors are taking appointments yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {doctors.map((doctor) => {
              const shared = consents.has(doctor.id);
              const isOpen = openDoctor?.id === doctor.id;

              return (
                <div
                  key={doctor.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
                >
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-teal-400">
                      {doctor.specialty}
                    </p>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {doctor.full_name}
                    </h3>
                    {doctor.bio && (
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        {doctor.bio}
                      </p>
                    )}
                  </div>

                  {/* Sharing state, stated rather than implied */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                      shared
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-slate-950/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    {shared ? (
                      <Unlock className="w-4 h-4 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 shrink-0" />
                    )}
                    {shared
                      ? "This doctor can see your history and check-ins."
                      : "This doctor cannot see your record."}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => showTimes(doctor)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {isOpen ? "Hide times" : "See available times"}
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSharing(doctor)}
                      className={`px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                        shared
                          ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          : "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300"
                      }`}
                    >
                      {shared ? "Stop sharing" : "Share my record"}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="pt-2">
                      {slotsBusy ? (
                        <p className="text-xs text-slate-500">
                          Checking availability…
                        </p>
                      ) : slots.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No open times in the next two weeks.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {slots.slice(0, 12).map((slot) => (
                            <button
                              key={slot.starts_at}
                              type="button"
                              onClick={() => book(slot)}
                              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 hover:border-teal-500/50 hover:text-teal-300 transition-colors"
                            >
                              {formatSlot(slot.starts_at)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
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