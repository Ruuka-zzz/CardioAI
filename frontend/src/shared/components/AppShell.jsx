import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV_BY_ROLE = {
    patient: [
    { to: "/patient", label: "Today", end: true },
    { to: "/patient/check-in", label: "Check in" },
    { to: "/patient/records", label: "Records" },
    { to: "/patient/doctors", label: "Doctors" },
  ],
  doctor: [{ to: "/doctor", label: "Patients", end: true },
    { to: "/doctor/schedule", label: "Schedule" }
  ],
  admin: [{ to: "/admin", label: "Doctors", end: true }],
};

/**
 * Frame around every signed-in page.
 *
 * Navigation sits at the bottom rather than the top: this is a phone-first
 * product used twice a day, often one-handed, sometimes by people whose grip
 * isn't steady.
 */
export default function AppShell({ children }) {
  const { role, isSignedIn, signOut } = useAuth();
  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  const isFullWidth = ["/", "/contact", "/profile", "/login", "/doctor-login"].includes(pathname);
  const links = NAV_BY_ROLE[role] ?? [];

  return (
    <div className="shell">
      {!isLanding && <header className="shell__bar">
        <div className="shell__bar-inner">
          <Link to="/" className="wordmark">
            <Pulse />
            CardioAI
          </Link>
          {isSignedIn && (
            <button type="button" className="btn btn--quiet" onClick={signOut}>
              Sign out
            </button>
          )}
        </div>
      </header>}

      <main className={isFullWidth ? "shell__main shell__main--full" : "shell__main"}>{children}</main>

      {isSignedIn && links.length > 1 && (
        <nav className="shell__nav" aria-label="Main">
          <ul>
            {links.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

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