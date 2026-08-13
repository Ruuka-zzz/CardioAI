import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api, session } from "../api/client";

const AuthContext = createContext(null);

/**
 * Holds who is signed in and what role they hold.
 *
 * The token lives in localStorage so a refresh doesn't sign the patient out
 * mid check-in. Role is stored alongside it purely to pick the right landing
 * route on reload — every actual permission decision is made by the backend.
 */
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => ({
    token: session.token,
    role: session.role,
  }));

  const adopt = useCallback((res) => {
    session.save(res.access_token, res.role);
    setAuth({ token: res.access_token, role: res.role });
    return res;
  }, []);

  const value = useMemo(
    () => ({
      token: auth.token,
      role: auth.role,
      isSignedIn: Boolean(auth.token),
      login: (creds) => api.login(creds).then(adopt),
      signup: (data) => api.signup(data).then(adopt),
      activateDoctor: (data) => api.activateDoctor(data).then(adopt),
      signOut: () => {
        session.clear();
        setAuth({ token: null, role: null });
      },
    }),
    [auth, adopt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Where each role lands after signing in. */
export function homeFor(role) {
  if (role === "doctor") return "/doctor";
  if (role === "admin") return "/admin";
  if (role === "patient") return "/patient";
  return "/";
}
