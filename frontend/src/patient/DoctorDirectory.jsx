import { useEffect, useState } from "react";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";

/**
 * Doctor discovery, booking, and record sharing.
 *
 * Booking and sharing are separate actions on purpose. Requesting an
 * appointment gives a doctor your time; sharing gives them your history. The
 * backend enforces that split, and this page has to make it legible — hence
 * the explicit sharing state under each doctor rather than an inferred one.
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

  if (loading) return <p className="empty">Loading doctors…</p>;

  return (
    <section>
      <h1>Doctors</h1>
      <p className="lede">
        Request a time that suits you. Sharing your record is a separate choice —
        booking alone doesn't reveal your history.
      </p>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {doctors.length === 0 ? (
        <p className="empty">No doctors are taking appointments yet. Check back soon.</p>
      ) : (
        <ul className="stack">
          {doctors.map((doctor) => {
            const shared = consents.has(doctor.id);
            const isOpen = openDoctor?.id === doctor.id;

            return (
              <li className="card" key={doctor.id} style={{ marginBottom: 0 }}>
                <p className="eyebrow">{doctor.specialty}</p>
                <h2>{doctor.full_name}</h2>
                {doctor.bio && <p className="lede">{doctor.bio}</p>}

                <p className="row">
                  <span className={shared ? "pill pill--on" : "pill pill--off"}>
                    {shared ? "Record shared" : "Record private"}
                  </span>
                </p>

                <div className="row">
                  <Button variant="secondary" onClick={() => showTimes(doctor)}>
                    {isOpen ? "Hide times" : "See available times"}
                  </Button>
                  <Button variant="quiet" onClick={() => toggleSharing(doctor)}>
                    {shared ? "Stop sharing my record" : "Share my record"}
                  </Button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: "1rem" }}>
                    {slotsBusy ? (
                      <p className="lede">Checking availability…</p>
                    ) : slots.length === 0 ? (
                      <p className="lede">No open times in the next two weeks.</p>
                    ) : (
                      <ul className="row" style={{ listStyle: "none", padding: 0 }}>
                        {slots.slice(0, 12).map((slot) => (
                          <li key={slot.starts_at}>
                            <Button variant="secondary" onClick={() => book(slot)}>
                              <span className="readout">{formatSlot(slot.starts_at)}</span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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