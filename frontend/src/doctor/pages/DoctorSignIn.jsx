import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";

export default function DoctorSignIn() {
  const { login, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ staff_id: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.staff_id.trim() || !form.email.trim() || !form.password) {
      setError("Enter your staff ID, email address, and password.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await login({ ...form, staff_id: form.staff_id.trim().toUpperCase(), email: form.email.trim() });
      if (result.role !== "doctor") {
        signOut();
        setError("These details do not belong to a doctor account.");
        return;
      }
      navigate("/doctor", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return <section className="flex min-h-[calc(100dvh-5rem)] items-center justify-center bg-[#9bc5bb] p-4"><div className="w-full max-w-md rounded-3xl border border-white bg-white/90 p-8 shadow-xl backdrop-blur-md"><h1 className="text-center text-2xl font-black text-slate-950">Doctor Portal Sign In</h1><p className="mb-6 text-center text-xs text-slate-600">Use the staff ID and email assigned to your CardioAI account.</p>{error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-700" role="alert">{error}</p>}<form onSubmit={submit} className="space-y-4" noValidate><Field label="Staff ID" value={form.staff_id} onChange={(value) => setForm((current) => ({ ...current, staff_id: value }))} placeholder="CA-DOC-0001" /><Field label="Email Address" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="doctor@cardioai.com" /><Field label="Password" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} /><button type="submit" disabled={busy} className="w-full rounded-xl bg-[#528d80] py-3 text-xs font-bold text-white shadow-md hover:bg-[#43756a] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Signing in…" : "Sign In as Doctor"}</button></form><div className="mt-6 text-center"><Link to="/" className="text-xs font-semibold text-slate-600 hover:text-slate-900">← Back to Home</Link></div></div></section>;
}

function Field({ label, type = "text", value, onChange, placeholder }) { return <label className="block text-xs font-bold text-slate-700">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-600" /></label>; }