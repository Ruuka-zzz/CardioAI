import { useCallback, useEffect, useState } from "react";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";

/**
 * Find a doctor and book — three steps, one decision each.
 *
 *   1. CHOOSE   who, with the things that actually decide it: specialty,
 *               hospital, address, which days they work
 *   2. TIME     pick a day, then a time on that day
 *   3. REVIEW   see doctor / place / date / time, write the reason, confirm
 *
 * WHY A REVIEW STEP
 * A confirmed booking cannot be cancelled inside the notice window, so the
 * click that creates it is close to irreversible. Reading back who, where and
 * when before that click is the cheapest possible way to stop someone turning
 * up at the wrong hospital on the wrong day.
 *
 * WHY TIMES ARE GROUPED BY DAY
 * The old version rendered every slot for the next fortnight as one run of
 * buttons. Forty times in a row is not a choice a person can make. Days first,
 * then times within the chosen day.
 *
 * SHARING IS STILL SEPARATE
 * Booking gives a doctor your time. Sharing gives them your history. Two
 * decisions, two controls, and the card says which is which — the backend
 * enforces the same split.
 */

const STEP = { CHOOSE: "choose", TIME: "time", REVIEW: "review", DONE: "done" };

export default function DoctorDirectory() {
  const [doctors, setDoctors] = useState([]);
  const [consents, setConsents] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(STEP.CHOOSE);
  const [doctor, setDoctor] = useState(null);
  const [slotsByDay, setSlotsByDay] = useState([]);
  const [openDay, setOpenDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [booked, setBooked] = useState(null);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [list, granted] = await Promise.all([
      api.listDoctors(),
      api.myConsents().catch(() => []),
    ]);
    setDoctors(list ?? []);
    setConsents(new Set((granted ?? []).map((c) => c.doctor_id)));
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  // ---------- step 1 -> 2 ----------

  const openTimes = async (chosen) => {
    setDoctor(chosen);
    setSlot(null);
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const slots = await api.availability(chosen.id);
      const grouped = groupByDay(slots ?? []);
      setSlotsByDay(grouped);
      setOpenDay(grouped[0]?.key ?? null);
      setStep(STEP.TIME);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- step 3: confirm ----------

  const confirm = async () => {
    setBusy(true);
    try {
      const appointment = await api.requestAppointment({
        doctor_id: doctor.id,
        starts_at: slot.starts_at,
        reason: reason.trim() || null,
      });
      setBooked(appointment);
      setStep(STEP.DONE);
      setError("");
    } catch (err) {
      // A refusal here is a rule firing — slot taken, already booked
      // elsewhere, too soon. The backend's wording is specific and useful, so
      // show it verbatim rather than replacing it with something generic.
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startOver = async () => {
    setStep(STEP.CHOOSE);
    setDoctor(null);
    setSlot(null);
    setReason("");
    setBooked(null);
    setError("");
    await load().catch(() => {});
  };

  const toggleSharing = async (target) => {
    const shared = consents.has(target.id);
    try {
      if (shared) {
        await api.revokeConsent(target.id);
        setConsents((prev) => {
          const next = new Set(prev);
          next.delete(target.id);
          return next;
        });
        setNotice(`${target.full_name} can no longer see your record.`);
      } else {
        await api.grantConsent(target.id);
        setConsents((prev) => new Set(prev).add(target.id));
        setNotice(
          `${target.full_name} can now see your history and check-ins. ` +
            `You can stop sharing at any time.`,
        );
      }
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="empty">Loading doctors…</p>;

  // ================================================================ DONE

  if (step === STEP.DONE && booked) {
    return (
      <section>
        <p className="eyebrow">Confirmed</p>
        <h1>You're booked</h1>

        <div className="card">
          <p className="readout" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            {formatFull(booked.starts_at)}
          </p>
          <p style={{ marginBottom: "0.25rem" }}>
            <strong>{booked.doctor_name ?? doctor.full_name}</strong>
          </p>
          {(booked.hospital ?? doctor.hospital) && (
            <p className="lede" style={{ marginBottom: 0 }}>
              {booked.hospital ?? doctor.hospital}
              {doctor.address && <><br />{doctor.address}</>}
            </p>
          )}
          {booked.reason && (
            <p className="lede" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
              Reason: {booked.reason}
            </p>
          )}
        </div>

        <p className="lede">
          No waiting for approval — this appointment is confirmed. You can
          cancel it up to 2 hours beforehand from your appointments page.
        </p>

        {!consents.has(doctor.id) && (
          <div className="card card--sunk">
            <p className="eyebrow">Optional</p>
            <p>
              {doctor.full_name} can't see your medical history. Sharing it
              means they arrive at the consultation already knowing your
              baseline and recent check-ins.
            </p>
            <Button variant="secondary" onClick={() => toggleSharing(doctor)}>
              Share my record with {doctor.full_name}
            </Button>
          </div>
        )}

        <Button block onClick={startOver}>
          Back to doctors
        </Button>
      </section>
    );
  }

  // ============================================================== REVIEW

  if (step === STEP.REVIEW && doctor && slot) {
    return (
      <section>
        <p className="eyebrow">Step 3 of 3 · Check and confirm</p>
        <h1>Is this right?</h1>
        <p className="lede">
          Once confirmed, this can only be cancelled up to 2 hours beforehand.
        </p>

        <div className="card">
          <dl style={{ margin: 0 }}>
            <Row label="Doctor" value={doctor.full_name} />
            <Row label="Specialty" value={doctor.specialty} />
            {doctor.hospital && <Row label="Place" value={doctor.hospital} />}
            {doctor.address && <Row label="Address" value={doctor.address} />}
            <Row label="Date" value={formatDay(slot.starts_at)} mono />
            <Row
              label="Time"
              value={`${formatTime(slot.starts_at)} – ${formatTime(slot.ends_at)}`}
              mono
            />
          </dl>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="reason">
            Why are you coming?
          </label>
          <span className="field__hint">
            A sentence is enough. Your doctor reads this before the
            consultation, so it's the fastest way to be understood — but you
            can leave it blank.
          </span>
          <textarea
            id="reason"
            className="field__control"
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. My breathlessness has been worse for about a week, especially at night."
            style={{ resize: "vertical", minHeight: "6rem" }}
          />
        </div>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <div className="row">
          <Button block busy={busy} busyLabel="Booking…" onClick={confirm}>
            Confirm appointment
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setStep(STEP.TIME);
              setError("");
            }}
          >
            Change the time
          </Button>
        </div>
      </section>
    );
  }

  // ================================================================ TIME

  if (step === STEP.TIME && doctor) {
    const day = slotsByDay.find((d) => d.key === openDay) ?? slotsByDay[0];

    return (
      <section>
        <p className="eyebrow">Step 2 of 3 · Pick a time</p>
        <h1>{doctor.full_name}</h1>
        <p className="lede">
          {doctor.specialty}
          {doctor.hospital && ` · ${doctor.hospital}`}
        </p>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {slotsByDay.length === 0 ? (
          <p className="empty">
            No open times in the next two weeks. Try another doctor.
          </p>
        ) : (
          <>
            {/* Days first. Forty times in one list is not a choice anyone
                can make; a day is. */}
            <div className="row" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
              {slotsByDay.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={
                    entry.key === day?.key
                      ? "btn btn--primary"
                      : "btn btn--secondary"
                  }
                  onClick={() => setOpenDay(entry.key)}
                  style={{ flexDirection: "column", gap: 0, minWidth: "5.5rem" }}
                >
                  <span style={{ fontSize: "0.75rem" }}>{entry.weekday}</span>
                  <span className="readout" style={{ fontSize: "1.125rem" }}>
                    {entry.dayNumber}
                  </span>
                  <span style={{ fontSize: "0.6875rem", opacity: 0.8 }}>
                    {entry.slots.length} free
                  </span>
                </button>
              ))}
            </div>

            {day && (
              <div className="card" style={{ marginTop: "1rem" }}>
                <p className="eyebrow">{day.label}</p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(6rem, 1fr))",
                    gap: "0.5rem",
                  }}
                >
                  {day.slots.map((option) => (
                    <button
                      key={option.starts_at}
                      type="button"
                      className={
                        slot?.starts_at === option.starts_at
                          ? "btn btn--primary"
                          : "btn btn--secondary"
                      }
                      onClick={() => setSlot(option)}
                    >
                      <span className="readout">{formatTime(option.starts_at)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="row">
          <Button block disabled={!slot} onClick={() => setStep(STEP.REVIEW)}>
            {slot ? `Continue with ${formatTime(slot.starts_at)}` : "Pick a time"}
          </Button>
          <Button variant="quiet" onClick={startOver}>
            Choose a different doctor
          </Button>
        </div>
      </section>
    );
  }

  // ============================================================== CHOOSE

  return (
    <section>
      <p className="eyebrow">Step 1 of 3 · Choose a doctor</p>
      <h1>Find a doctor</h1>
      <p className="lede">
        Pick a time that suits you. Sharing your medical record is a separate
        choice — booking alone doesn't reveal your history.
      </p>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {doctors.length === 0 ? (
        <p className="empty">No doctors are taking appointments yet.</p>
      ) : (
        <ul className="stack">
          {doctors.map((d) => {
            const shared = consents.has(d.id);
            return (
              <li className="card" key={d.id} style={{ marginBottom: 0 }}>
                <p className="eyebrow">{d.specialty}</p>
                <h2 style={{ marginBottom: "0.25rem" }}>{d.full_name}</h2>

                {d.hospital && (
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 500 }}>
                    {d.hospital}
                  </p>
                )}
                {d.address && (
                  <p className="lede" style={{ margin: "0 0 0.75rem", fontSize: "0.9375rem" }}>
                    {d.address}
                  </p>
                )}
                {d.bio && <p className="lede">{d.bio}</p>}

                {d.working_days?.length > 0 && (
                  <p className="row" style={{ gap: "0.375rem", margin: "0 0 0.75rem" }}>
                    {d.working_days.map((w) => (
                      <span className="pill" key={w}>
                        {w}
                      </span>
                    ))}
                  </p>
                )}

                {d.next_available && (
                  <p className="lede" style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                    Next available{" "}
                    <span className="readout">{formatFull(d.next_available)}</span>
                  </p>
                )}

                <p className="row" style={{ marginBottom: "0.75rem" }}>
                  <span className={shared ? "pill pill--on" : "pill pill--off"}>
                    {shared ? "Record shared" : "Record private"}
                  </span>
                </p>

                <div className="row">
                  <Button onClick={() => openTimes(d)} busy={busy && doctor?.id === d.id}>
                    See available times
                  </Button>
                  <Button variant="quiet" onClick={() => toggleSharing(d)}>
                    {shared ? "Stop sharing my record" : "Share my record"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- bits */

function Row({ label, value, mono = false }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "7rem 1fr",
        gap: "0.75rem",
        padding: "0.5rem 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <dt className="lede" style={{ fontSize: "0.875rem" }}>
        {label}
      </dt>
      <dd className={mono ? "readout" : undefined} style={{ margin: 0 }}>
        {value}
      </dd>
    </div>
  );
}

/** Group a flat slot list into days, so the UI can ask for a day first. */
function groupByDay(slots) {
  const days = new Map();

  for (const slot of slots) {
    const when = new Date(slot.starts_at);
    const key = when.toISOString().slice(0, 10);

    if (!days.has(key)) {
      days.set(key, {
        key,
        weekday: when.toLocaleDateString(undefined, { weekday: "short" }),
        dayNumber: when.getDate(),
        label: when.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        slots: [],
      });
    }
    days.get(key).slots.push(slot);
  }

  return [...days.values()];
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
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
