import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import Button from "../../shared/components/Button";
import FormInput from "../../shared/components/FormInput";

/**
 * The doctor's own schedule: set working hours, see what's booked.
 *
 * Two halves that feed each other. Working hours are recurring weekly rules;
 * the calendar is what those rules produce once bookings are subtracted. Both
 * live on one page because editing hours without seeing the consequence is
 * how doctors end up double-booked or empty.
 *
 * The calendar comes from a single endpoint that merges free slots with
 * appointments. Fetching them separately would let the UI show a slot as free
 * and booked at once whenever one response is stale.
 */

const WEEKDAYS = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

const EMPTY_HOURS = { weekday: "0", start_time: "09:00", end_time: "12:00" };

export default function DoctorSchedule() {
  const [hours, setHours] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [form, setForm] = useState(EMPTY_HOURS);
  const [openDay, setOpenDay] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [hoursData, calendarData] = await Promise.all([
        api.myWorkingHours(),
        api.myCalendar(),
      ]);
      setHours(hoursData ?? []);
      setCalendar(calendarData ?? []);
      setOpenDay((current) => current ?? calendarData?.[0]?.date ?? null);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const addHours = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.addWorkingHours({
        weekday: Number(form.weekday),
        start_time: `${form.start_time}:00`,
        end_time: `${form.end_time}:00`,
      });
      setForm(EMPTY_HOURS);
      setNotice("Working hours added. Patients can book these times now.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeHours = async (slot) => {
    try {
      const result = await api.removeWorkingHours(slot.id);
      setNotice(
        result.appointments_still_booked > 0
          ? `Removed. ${result.appointments_still_booked} appointment(s) already ` +
            `booked in those hours were kept — decline them individually if you ` +
            `can't attend.`
          : "Working hours removed.",
      );
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const respond = async (appointmentId, status) => {
    try {
      await api.respondToAppointment(appointmentId, status);
      setNotice(status === "confirmed" ? "Appointment confirmed." : "Appointment declined.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="empty">Loading your schedule…</p>;

  const day = calendar.find((d) => d.date === openDay) ?? calendar[0];
  const pending = calendar
    .flatMap((d) => d.slots)
    .filter((s) => s.status === "requested");

  return (
    <section>
      <h1>Your schedule</h1>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {/* Requests first — they're the only thing here needing a decision. */}
      {pending.length > 0 && (
        <div className="card">
          <p className="eyebrow">Needs your response</p>
          <h2>{pending.length} appointment request{pending.length > 1 ? "s" : ""}</h2>
          <ul className="stack">
            {pending.map((slot) => (
              <li key={slot.appointment_id}>
                <p className="readout" style={{ marginBottom: "0.25rem" }}>
                  {formatWhen(slot.starts_at)}
                </p>
                <p style={{ marginBottom: "0.5rem" }}>
                  {slot.patient_name ?? "Patient"}
                  {slot.reason && ` — ${slot.reason}`}
                </p>
                <div className="row">
                  <Button onClick={() => respond(slot.appointment_id, "confirmed")}>
                    Confirm
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => respond(slot.appointment_id, "declined")}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Next two weeks</h2>

      {calendar.length === 0 ? (
        <p className="empty">
          No working hours set yet. Add some below and your calendar will fill in.
        </p>
      ) : (
        <>
          {/* Day strip. Booked count is shown on the strip itself so a busy
              day is visible without opening it. */}
          <div className="row" style={{ marginBottom: "1rem", overflowX: "auto" }}>
            {calendar.map((entry) => (
              <button
                key={entry.date}
                type="button"
                className={
                  entry.date === day?.date ? "btn btn--primary" : "btn btn--secondary"
                }
                onClick={() => setOpenDay(entry.date)}
                style={{ flexDirection: "column", gap: 0, minWidth: "5rem" }}
              >
                <span style={{ fontSize: "0.75rem" }}>
                  {entry.weekday_name.slice(0, 3)}
                </span>
                <span className="readout" style={{ fontSize: "1.125rem" }}>
                  {entry.date.slice(8, 10)}
                </span>
                <span style={{ fontSize: "0.6875rem", opacity: 0.8 }}>
                  {entry.booked_count > 0 ? `${entry.booked_count} booked` : "free"}
                </span>
              </button>
            ))}
          </div>

          {day && (
            <div className="card">
              <p className="eyebrow">
                {day.weekday_name} {day.date}
              </p>
              <ul className="stack">
                {day.slots.map((slot) => (
                  <li key={slot.starts_at}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="readout">{formatTime(slot.starts_at)}</span>
                      <span className={pillClass(slot.status)}>{slot.status}</span>
                    </div>

                    {slot.status !== "free" && (
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.9375rem" }}>
                        {slot.patient_name ?? "Patient"}
                        {!slot.record_shared && (
                          <span className="lede"> — record not shared</span>
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <h2>Your working hours</h2>
      <p className="lede">
        Set the times you see patients. These repeat every week, and patients
        can only book inside them.
      </p>

      {hours.length > 0 && (
        <ul className="stack" style={{ marginBottom: "1.5rem" }}>
          {hours.map((slot) => (
            <li className="card" key={slot.id} style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span>
                  <strong>{slot.weekday_name}</strong>{" "}
                  <span className="readout">
                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </span>
                </span>
                <Button variant="quiet" onClick={() => removeHours(slot)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addHours} className="card" noValidate>
        <h3>Add hours</h3>
        <FormInput
          label="Day"
          options={WEEKDAYS}
          value={form.weekday}
          onChange={set("weekday")}
        />
        <FormInput
          label="From"
          type="time"
          value={form.start_time}
          onChange={set("start_time")}
        />
        <FormInput
          label="To"
          type="time"
          value={form.end_time}
          onChange={set("end_time")}
        />
        <Button type="submit" busy={busy} busyLabel="Adding…">
          Add these hours
        </Button>
      </form>
    </section>
  );
}

function pillClass(status) {
  if (status === "confirmed") return "pill pill--on";
  if (status === "requested") return "pill";
  return "pill pill--off";
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}