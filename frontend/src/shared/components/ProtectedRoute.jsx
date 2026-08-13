import { Navigate, useLocation } from "react-router-dom";
import { homeFor, useAuth } from "../auth/AuthContext";

/**
 * Keeps the wrong role out of a route.
 *
 * This is a routing convenience, not a security control — the backend checks
 * the role on every request and is the only thing standing between a doctor
 * and a record they have no consent for. Never move an authorisation decision
 * up here.
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