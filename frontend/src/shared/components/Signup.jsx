import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SEX } from "@shared/enums";
import { homeFor, useAuth } from "../auth/AuthContext";

/**
 * Patient self-registration and the admin-issued doctor activation flow.
 *
 * WHY DATE OF BIRTH AND SEX ARE COLLECTED HERE
 * They are demographics, not clinical findings, which is why they sit on the
 * account rather than in the medical record — a doctor reading tomorrow's
 * appointment list can see who is coming without needing consent to read
 * anyone's history.
 *
 * They are also required before the baseline can be calculated, because age
 * is a model feature. Asking at signup rather than later stops a patient
 * reaching the end of a thirty-question form and being sent back.
 *
 * Date of birth rather than age: an age recorded once is wrong from the next
 * birthday onwards, and this app is meant to be used for years.
 */
export default function Signup() {
  const [params] = useSearchParams();
  const isDoctor = params.get("doctor") === "1";
  const { signup, activateDoctor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    date_of_birth: "",
    sex: "",
    activation_code: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
    setError("");
  };

  const pick = (field) => (value) => {
    setForm({ ...form, [field]: value });
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.email.trim() || form.password.length < 8)
      return setError("Enter your email and a password of at least 8 characters.");

    if (isDoctor && !form.activation_code.trim())
      return setError("Enter the activation code CardioAI sent you.");

    if (!isDoctor) {
      if (!form.full_name.trim()) return setError("Enter your name.");
      if (!form.date_of_birth)
        return setError("Enter your date of birth — it's needed to work out your risk.");
      if (!form.sex)
        return setError("Choose an option so we can calculate your risk correctly.");

      // A future date of birth is a typo, not a person. Caught here so a
      // negative age never reaches the model, where it would produce a
      // confident and meaningless answer.
      const born = new Date(form.date_of_birth);
      const now = new Date();
      if (born > now) return setError("That date is in the future. Check the year.");
      if (now.getFullYear() - born.getFullYear() > 120)
        return setError("Check the year on your date of birth.");
    }

    setBusy(true);
    try {
      const result = isDoctor
        ? await activateDoctor({
            activation_code: form.activation_code.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          })
        : await signup({
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            date_of_birth: form.date_of_birth,
            sex: form.sex,
          });
      navigate(homeFor(result.role), { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setBusy(false);
    }
  };

  const label = isDoctor ? "Activate your doctor account" : "Create a patient account";

  return <div className="signup-page min-h-[calc(100vh-4rem)] bg-[#9bc5bb] text-slate-900 flex p-4 md:p-6 relative overflow-hidden">
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/25 blur-[120px] rounded-full pointer-events-none" />
    <div className="max-w-md w-full mx-auto flex flex-col justify-center py-6 relative z-10">
      <div className="flex items-center gap-2.5 mb-6 px-1"><div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-teal-300"><svg className="w-5 h-5 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg></div><span className="text-xl font-black text-slate-950 tracking-tight">CardioAI</span></div>
      <section className="bg-white w-full p-8 rounded-3xl shadow-xl border border-white/80 backdrop-blur-md">
        <Link to="/" className="text-xs font-bold text-[#528d80] hover:underline flex items-center gap-1 mb-6">← Back to Home</Link>
        <h1 className="text-2xl font-extrabold text-slate-950 mb-1">{label}</h1>
        <p className="text-slate-600 text-xs mb-6 leading-relaxed">{isDoctor ? "Enter the activation code from CardioAI, then set your sign-in details." : "Next you'll answer some questions about your health. Have a recent blood pressure reading to hand if you can."}</p>
        {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4 font-medium">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          {isDoctor ? (
            <Field label="Activation code" value={form.activation_code} onChange={update("activation_code")} placeholder="e.g. ABCD-2345" autoComplete="off" />
          ) : (
            <>
              <Field label="Your name" value={form.full_name} onChange={update("full_name")} placeholder="e.g. John" autoComplete="name" />
              <Field
                label="Date of birth"
                type="date"
                value={form.date_of_birth}
                onChange={update("date_of_birth")}
                autoComplete="bday"
                max={new Date().toISOString().slice(0, 10)}
                hint="Used to work out your age, which affects your risk."
              />
              {/* Sex, not gender identity. This feeds a clinical risk model
                  trained on recorded sex; labelling it otherwise would
                  misrepresent what the number means. */}
              <Choice
                label="Sex"
                hint="Recorded sex, used for the risk calculation."
                options={SEX}
                value={form.sex}
                onChange={pick("sex")}
              />
            </>
          )}
          <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="example@gmail.com" autoComplete="email" />
          <Field label="Password (at least 8 characters)" type="password" value={form.password} onChange={update("password")} placeholder="••••••••" autoComplete="new-password" minLength={8} />
          <button type="submit" disabled={busy} className="w-full py-3 mt-3 rounded-xl bg-[#528d80] hover:bg-[#43756a] text-white font-bold text-sm transition-all shadow-md disabled:opacity-50">{busy ? (isDoctor ? "Activating…" : "Creating account…") : (isDoctor ? "Activate account" : "Create account")}</button>
        </form>
        <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-600 space-y-2"><p>Already have an account? <Link to="/login" className="font-bold text-[#528d80] hover:underline">Sign in.</Link></p>{!isDoctor && <p className="text-slate-500">Doctors joining CardioAI: <Link to="/signup?doctor=1" className="text-slate-700 font-medium hover:underline">use your activation code.</Link></p>}{isDoctor && <p className="text-slate-500">Registering as a patient? <Link to="/signup" className="text-slate-700 font-medium hover:underline">Create a patient account.</Link></p>}</div>
      </section>
      <footer className="w-full pt-6 text-center text-[11px] text-slate-800">© 2026 CardioAI Platform. All rights reserved.</footer>
    </div>
  </div>;
}

function Field({ label, type = "text", hint, ...props }) {
  return <label className="block text-xs font-bold text-slate-900">
    {label}
    {hint && <span className="block font-medium text-slate-500 mt-0.5">{hint}</span>}
    <input type={type} required className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#528d80]" {...props} />
  </label>;
}

/**
 * Segmented picker matching the Field styling.
 *
 * A radio group rather than a <select>: with only two options a dropdown
 * hides both behind a tap, and this is a required field the patient must not
 * skip past.
 */
function Choice({ label, hint, options, value, onChange }) {
  return <fieldset className="block">
    <legend className="text-xs font-bold text-slate-900">{label}</legend>
    {hint && <span className="block text-xs font-medium text-slate-500 mt-0.5">{hint}</span>}
    <div className="mt-1.5 grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((option) => (
        <label key={option.value} className="relative cursor-pointer">
          <input
            type="radio"
            name={label}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <span className={`block text-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            value === option.value
              ? "bg-[#528d80] border-[#528d80] text-white"
              : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
          }`}>
            {option.label}
          </span>
        </label>
      ))}
    </div>
  </fieldset>;
}
