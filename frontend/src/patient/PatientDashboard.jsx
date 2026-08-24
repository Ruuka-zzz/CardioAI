import React from "react";
import { useNavigate } from "react-router-dom";

export default function PatientDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "70vh",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "480px",
        backgroundColor: "#1e293b",
        padding: "36px",
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
        color: "#f8fafc"
      }}>
        <h2 style={{ 
          fontSize: "24px", 
          fontWeight: "700", 
          marginBottom: "12px",
          color: "#ffffff" 
        }}>
          One thing first
        </h2>
        
        <p style={{ 
          color: "#94a3b8", 
          fontSize: "15px", 
          lineHeight: "1.6", 
          marginBottom: "28px" 
        }}>
          Before your first check-in we need your medical history. It takes a few minutes and you only do it once.
        </p>

        <button
          onClick={() => navigate("/patient/onboarding")}
          style={{
            width: "100%",
            padding: "12px 20px",
            backgroundColor: "#10b981",
            color: "#0f172a",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Start my intake form
        </button>
      </div>
    </div>
  );
}