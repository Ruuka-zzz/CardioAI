import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/**
 * Keeps the wrong role out of a route.
 *
 * This is a routing convenience, NOT a security control. The backend checks
 * the role on every request and is the only thing standing between a doctor
 * and a record they have no consent for. Never move an authorisation decision
 * up here — a determined user can edit localStorage in ten seconds.
 */
export default function ProtectedRoute({ allow, children }) {
  const { isSignedIn, role } = useAuth();
  const location = useLocation();

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to={homeFor(role)} replace />;
  }

  return children;
}

function homeFor(role) {
  if (role === "doctor") return "/doctor";
  if (role === "admin") return "/admin";
  if (role === "patient") return "/patient";
  return "/";
}