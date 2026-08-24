import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./shared/auth/AuthContext";
import VisitorLanding from "./vistor/pages/VisitorLanding";
import Login from "./shared/components/Login";
import Signup from "./shared/components/Signup";
import AppShell from "./shared/components/AppShell";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import PatientDashboard from "./patient/PatientDashboard";
import DailyCheckIn from "./patient/DailyCheckIn";
import DoctorDirectory from "./patient/DoctorDirectory";
import DoctorDashboard from "./doctor/pages/DoctorDashboard";
import AdminDashboard from "./admin/pages/AdminDashboard";

export default function App() {
  const { isSignedIn, role } = useAuth();

  const getHomePath = (userRole) => {
    if (userRole === "doctor") return "/doctor";
    if (userRole === "admin") return "/admin";
    return "/patient";
  };

  return (
    <Routes>
      {/* 1. Navbar ပါဝင်သော သီးသန့် VisitorLanding မျက်နှာပြင် */}
      <Route
        path="/"
        element={isSignedIn ? <Navigate to={getHomePath(role)} replace /> : <VisitorLanding />}
      />
      <Route
        path="/login"
        element={isSignedIn ? <Navigate to={getHomePath(role)} replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isSignedIn ? <Navigate to={getHomePath(role)} replace /> : <Signup />}
      />

      {/* 2. Dashboard တွေရောက်မှသာ AppShell (Sidebar/Navbar ပါသော အပိုင်း) ကို ပြပါမည် */}
      <Route
        path="/*"
        element={
          <AppShell>
            <Routes>
              <Route
                path="patient"
                element={
                  <ProtectedRoute allow={["patient"]}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patient/check-in"
                element={
                  <ProtectedRoute allow={["patient"]}>
                    <DailyCheckIn />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patient/doctors"
                element={
                  <ProtectedRoute allow={["patient"]}>
                    <DoctorDirectory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="doctor"
                element={
                  <ProtectedRoute allow={["doctor"]}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <ProtectedRoute allow={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}