import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { homeFor, useAuth } from "../auth/AuthContext";
import Button from "./Button";
import FormInput from "./FormInput";

/**
 * Two paths, one page.
 *
 * Patients self-register. Doctors do not — an admin issues an activation code
 * and the doctor exchanges it for an account exactly once. Keeping both here
 * means a doctor who lands on the wrong form finds the right one immediately
 * instead of hitting a dead end.
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
    activation_code: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.email.trim() || form.password.length < 8) {
      setError("Enter your email and a password of at least 8 characters.");
      return;
    }
    if (isDoctor && !form.activation_code.trim()) {
      setError("Enter the activation code CardioAI sent you.");
      return;
    }
    if (!isDoctor && !form.full_name.trim()) {
      setError("Enter your name.");
      return;
    }

    setBusy(true);
    try {
      const res = isDoctor
        ? await activateDoctor({
            activation_code: form.activation_code.trim(),
            email: form.email.trim(),
            password: form.password,
          })
        : await signup({
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            password: form.password,
          });

      navigate(homeFor(res.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1>{isDoctor ? "Activate your doctor account" : "Create your account"}</h1>
      <p className="lede">
        {isDoctor
          ? "Enter the activation code from CardioAI, then set your sign-in details."
          : "Next you'll answer some questions about your medical history. Have your most recent test results to hand if you can."}
      </p>

      <form onSubmit={submit} noValidate>
        {isDoctor ? (
          <FormInput
            label="Activation code"
            hint="Sent to you by the CardioAI team."
            value={form.activation_code}
            onChange={set("activation_code")}
            autoComplete="off"
          />
        ) : (
          <FormInput
            label="Your name"
            value={form.full_name}
            onChange={set("full_name")}
            autoComplete="name"
          />
        )}

        <FormInput
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
        />
        <FormInput
          label="Password"
          type="password"
          hint="At least 8 characters."
          value={form.password}
          onChange={set("password")}
          autoComplete="new-password"
        />

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" block busy={busy} busyLabel="Creating your account…">
          {isDoctor ? "Activate account" : "Create account"}
        </Button>
      </form>

      <p className="lede" style={{ marginTop: "1.5rem" }}>
        Already have an account? <Link to="/login">Sign in</Link>.
      </p>
      {!isDoctor && (
        <p className="lede">
          Are you a doctor? <Link to="/signup?doctor=1">Activate with your code</Link>.
        </p>
      )}
    </section>
  );
}