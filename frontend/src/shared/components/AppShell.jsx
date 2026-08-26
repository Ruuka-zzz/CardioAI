import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV_BY_ROLE = {
  patient: [
    { to: "/", label: "🏠 Home" },
    { to: "/patient/onboarding", label: "📊 Today" },   
    { to: "/patient/check-in", label: "🌙 Check in" },
    { to: "/patient/doctors", label: "👨‍⚕️ Doctors" },
  ],
  doctor: [
    { to: "/", label: "🏠 Home" },
    { to: "/doctor", label: "📊 Patients" },
  ],
  admin: [
    { to: "/", label: "🏠 Home" },
    { to: "/admin", label: "📊 Doctors" },
  ],
};

export default function AppShell({ children }) {
  const { role, isSignedIn, signOut } = useAuth();
  const location = useLocation(); // Get current route location
  
  const links = NAV_BY_ROLE[role] ?? [
    { to: "/", label: "🏠 Home" },
  ];

  return (
    <div style={styles.shellLayout}>
      {/* Left Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.topSection}>
          <NavLink 
            to="/" 
            style={{
              ...styles.wordmark,
              ...(location.pathname === "/" ? styles.navLinkActive : {}),
              borderRadius: "8px",
              padding: "6px 8px"
            }}
          >
            <Pulse />
            <span>CardioAI</span>
          </NavLink>

          <nav style={styles.sidebarNav} aria-label="Main">
            <ul style={styles.navList}>
              {links.map((link) => {
                // Manually check if the link is active
                const isActive = link.to === "/" 
                  ? location.pathname === "/" 
                  : location.pathname.startsWith(link.to);

                return (
                  <li key={link.to} style={styles.navItem}>
                    <NavLink
                      to={link.to}
                      style={{
                        ...styles.navLink,
                        ...(isActive ? styles.navLinkActive : {}),
                      }}
                    >
                      {link.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Bottom Section (Sign out button) */}
        {isSignedIn && (
          <div style={styles.sidebarFooter}>
            <button type="button" onClick={signOut} style={styles.signOutBtn}>
              🚪 Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Right Main Content Area */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          {children}
        </div>
      </main>
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

const styles = {
  shellLayout: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
  },
  sidebar: {
    width: "240px",
    backgroundColor: "#1e293b",
    borderRight: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "24px 16px",
    boxSizing: "border-box",
    flexShrink: 0,
    height: "100vh",
  },
  topSection: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  wordmark: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "18px",
    fontWeight: "700",
    color: "#ffffff",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  sidebarNav: {
    width: "100%",
  },
  navList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  navItem: {
    margin: 0,
  },
  navLink: {
    display: "block",
    padding: "10px 14px",
    borderRadius: "8px",
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  navLinkActive: {
    backgroundColor: "#0369a1",
    color: "#ffffff",
  },
  sidebarFooter: {
    borderTop: "1px solid #334155",
    paddingTop: "16px",
  },
  signOutBtn: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "transparent",
    border: "1px solid #ef4444",
    color: "#f87171",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "left",
  },
  mainContent: {
    flex: 1,
    height: "100vh",
    overflowY: "auto",
    backgroundColor: "#0f172a",
    display: "flex",
    justifyContent: "center",
    padding: "32px",
    boxSizing: "border-box",
  },
  contentWrapper: {
    width: "100%",
    maxWidth: "600px",
    margin: "auto 0",
  },
};