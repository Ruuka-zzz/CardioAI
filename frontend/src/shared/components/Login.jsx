import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth/AuthContext";
import Button from "./Button";
import FormInput from "./FormInput";

/** Sign in. One form for all three roles — the backend decides where you land. */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);
    try {
      const res = await login(form);
      navigate(location.state?.from ?? homeFor(res.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1>Sign in</h1>
      <p className="lede">Welcome back. Your check-in takes about a minute.</p>

      <form onSubmit={submit} noValidate>
        <FormInput
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
        />
        <FormInput
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={set("password")}
        />

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" block busy={busy} busyLabel="Signing in…">
          Sign in
        </Button>
      </form>

      <p className="lede" style={{ marginTop: "1.5rem" }}>
        New here? <Link to="/signup">Create a patient account</Link>.
      </p>
      <p className="lede">
        Doctors joining CardioAI: <Link to="/signup?doctor=1">use your activation code</Link>.
      </p>
    </section>
  );
}