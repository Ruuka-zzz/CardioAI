import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Key } from "lucide-react";
import { useAuth } from "../../shared/auth/AuthContext";

/** Dedicated entry point for administrators; authentication remains server-side. */
export default function AdminLogin() {
  const { login, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await login(form);
      if (result.role !== "admin") {
        signOut();
        setError("This account does not have administrator access.");
        return;
      }
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#e2ece9] flex items-center justify-center p-6 text-slate-800">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mx-auto flex items-center justify-center text-emerald-600 shadow-sm"><Key className="w-6 h-6" /></div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-wide">Admin Sign In</h1>
          <p className="text-xs text-slate-500">Enter your credentials to access the system administration panel.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-bold text-slate-700">Admin Email
            <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-inner" />
          </label>
          <label className="block text-xs font-bold text-slate-700">Password
            <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-inner" />
          </label>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-50">{busy ? "Signing in…" : "Sign In to Dashboard"}</button>
        </form>
        <div className="text-center pt-2"><Link to="/" className="text-xs text-slate-500 hover:text-emerald-700">&larr; Back to Home</Link></div>
      </div>
    </div>
  );
}
