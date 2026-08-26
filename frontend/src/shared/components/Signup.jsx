import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (auth?.signup) {
       
        await auth.signup({ 
          full_name: name, 
          email: email, 
          password: password 
        });
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create account");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f172a",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "#1e293b",
        padding: "32px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        color: "#f8fafc"
      }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>Create your account</h2>
        <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px", lineHeight: "1.4" }}>
          Next you'll answer some questions about your medical history. Have your most recent test results to hand if you can.
        </p>

        {error && (
          <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", color: "#cbd5e1", marginBottom: "6px" }}>
              Your name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters."
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
            Create account
          </button>
        </form>

        <div style={{ marginTop: "24px", fontSize: "14px", color: "#94a3b8" }}>
          <p style={{ marginBottom: "8px" }}>
            Already have an account? <Link to="/login" style={{ color: "#2dd4bf" }}>Sign in.</Link>
          </p>
          <p>
            Are you a doctor? <span style={{ color: "#2dd4bf", cursor: "pointer" }}>Activate with your code.</span>
          </p>
        </div>
      </div>
    </div>
  );
}