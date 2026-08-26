import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (auth?.login) {
        // Authenticate user with credentials
        await auth.login({ email, password });
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to sign in");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f172a",
      padding: "20px"
    }}>
      {/* CardioAI Logo with Pulse Icon */}
      <div style={{ marginBottom: "20px", width: "100%", maxWidth: "400px" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#ffffff", fontSize: "20px", fontWeight: "700" }}>
          <Pulse />
          <span>CardioAI</span>
        </Link>
      </div>

      <div style={{
        width: "100%",
        maxWidth: "400px",
        backgroundColor: "#1e293b",
        padding: "32px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        color: "#f8fafc"
      }}>
        {/* Back to Home Navigation Link */}
        <div style={{ marginBottom: "16px" }}>
          <Link to="/" style={{ color: "#38bdf8", textDecoration: "none", fontSize: "14px" }}>
            ← Back to Home
          </Link>
        </div>

        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>Sign in</h2>
        <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px" }}>
          Welcome back. Your check-in takes about a minute.
        </p>

        {error && (
          <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", color: "#cbd5e1", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #334155",
                backgroundColor: "#0f172a",
                color: "#fff",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "14px", color: "#cbd5e1", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #334155",
                backgroundColor: "#0f172a",
                color: "#fff",
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#10b981",
              color: "#090d16",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Sign in
          </button>
        </form>

        <div style={{ marginTop: "24px", fontSize: "14px", color: "#94a3b8" }}>
          <p style={{ marginBottom: "8px" }}>
            New here? <Link to="/signup" style={{ color: "#2dd4bf" }}>Create a patient account.</Link>
          </p>
          <p>
            Doctors joining CardioAI: use your activation code.
          </p>
        </div>
      </div>
    </div>
  );
}

// Pulse Icon Component
function Pulse() {
  return (
    <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
      <polyline
        points="0,8 7,8 10,2 13,14 16,8 26,8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}