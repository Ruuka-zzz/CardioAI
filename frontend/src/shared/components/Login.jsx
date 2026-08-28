import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await login({
        email: form.email.trim(),
        password: form.password,
      });
      navigate(location.state?.from ?? homeFor(result.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100dvh-5rem)] items-center justify-center bg-[#9bc5bb] p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2.5 text-xl font-black tracking-tight text-slate-950 no-underline">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-teal-300 shadow-sm"><Pulse /></span>
          CardioAI
        </Link>
        <div className="rounded-3xl border border-white bg-white/95 p-8 text-slate-900 shadow-xl backdrop-blur-md">
          <Link to="/" className="text-xs font-bold text-teal-800 hover:text-teal-950">← Back to Home</Link>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Sign in</h1>
          <p className="mb-6 text-xs font-medium text-slate-700">Welcome back. Your check-in takes about a minute.</p>
          {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700" role="alert">{error}</p>}
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} autoComplete="email" />
            <Field label="Password" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} autoComplete="current-password" />
            <button type="submit" disabled={busy} className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#528d80] py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#43756a] disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-700">
            <p>New here? <Link to="/signup" className="font-bold text-teal-800 hover:underline">Create a patient account.</Link></p>
            <p className="text-[11px] text-slate-600">Doctors joining CardioAI: <Link to="/signup?doctor=1" className="font-bold text-teal-800 hover:underline">use your activation code.</Link></p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, type, value, onChange, autoComplete }) {
  return <label className="block text-xs font-bold text-slate-900">{label}<input type={type} required value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="mt-1 block w-full rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600" /></label>;
}

function Pulse() {
  return <svg width="20" height="12" viewBox="0 0 26 16" aria-hidden="true"><polyline points="0,8 7,8 10,2 13,14 16,8 26,8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
