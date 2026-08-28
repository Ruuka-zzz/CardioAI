import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth } from "./shared/auth/AuthContext";
import AppShell from "./shared/components/AppShell";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import Login from "./shared/components/Login";
import Signup from "./shared/components/Signup";
import ContactUs from "./shared/components/ContactUs";
import UserProfile from "./shared/components/UserProfile";

import VisitorLanding from "./vistor/pages/VisitorLanding";
import PatientDashboard from "./patient/PatientDashboard";
import PatientOnboarding from "./patient/PatientOnboarding";
import DailyCheckIn from "./patient/DailyCheckIn";
import DoctorDirectory from "./patient/DoctorDirectory";
import DoctorDashboard from "./doctor/pages/DoctorDashboard";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminLogin from "./admin/pages/AdminLogin";

import DoctorSchedule from "./doctor/pages/DoctorSchedule";
import DoctorSignIn from "./doctor/pages/DoctorSignIn";

export default function App() {
  const { isSignedIn, role } = useAuth();

  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={isSignedIn ? <Navigate to={homeFor(role)} replace /> : <VisitorLanding />}
        />
        <Route
          path="/login"
          element={isSignedIn ? <Navigate to={homeFor(role)} replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={isSignedIn ? <Navigate to={homeFor(role)} replace /> : <Signup />}
        />
        <Route
          path="/admin-login"
          element={isSignedIn ? <Navigate to={homeFor(role)} replace /> : <AdminLogin />}
        />

        <Route path="/contact" element={<ContactUs />} />
        <Route
          path="/profile"
          element={<ProtectedRoute allow={["patient"]}><UserProfile /></ProtectedRoute>}
        />

        <Route
          path="/patient"
          element={
            <ProtectedRoute allow={["patient"]}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/onboarding"
          element={
            <ProtectedRoute allow={["patient"]}>
              <PatientOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/check-in"
          element={
            <ProtectedRoute allow={["patient"]}>
              <DailyCheckIn />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/doctors"
          element={
            <ProtectedRoute allow={["patient"]}>
              <DoctorDirectory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor-login"
          element={isSignedIn ? <Navigate to={homeFor(role)} replace /> : <DoctorSignIn />}
        />
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allow={["doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
 <Route
          path="/doctor/schedule"
          element={
            <ProtectedRoute allow={["doctor"]}>
              <DoctorSchedule />
            </ProtectedRoute>
          }
        />

         </Routes>

             
    </AppShell>
  );
}

function NotFound() {
  return (
    <section className="empty">
      <h1>Page not found</h1>
      <p>
        That page doesn't exist. <a href="/">Go to the start</a>.
      </p>
    </section>
  );
}
