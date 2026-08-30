/**
 * Single place where the frontend talks to the backend.
 *
 * Requests go to /api and Vite proxies them to the backend in dev (see
 * vite.config.js), so no CORS setup is needed locally and the base URL only
 * has to change in one place for production.
 *
 * Errors are re-thrown as plain Errors carrying the backend's `detail`
 * string. Components display that message directly rather than writing their
 * own — the server knows why it refused, the component doesn't.
 */

const TOKEN_KEY = "cardioai.token";

export const session = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get role() {
    return localStorage.getItem(`${TOKEN_KEY}.role`);
  },
  save(token, role) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(`${TOKEN_KEY}.role`, role);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(`${TOKEN_KEY}.role`);
  },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorMessage(detail, fallback) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(({ loc, msg }) => `${loc?.slice(1).join(" ") ?? "Request"}: ${msg}`)
      .join(" ");
  }
  return fallback;
}

async function request(path, { method = "GET", body, authed = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authed && session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  }

  if (res.status === 401) {
    session.clear();
    throw new ApiError("Your session expired. Sign in again.", 401);
  }

  const payload = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      errorMessage(payload?.detail, `Something went wrong (${res.status}).`),
      res.status,
    );
  }
  return payload;
}

export const api = {
  // ---- auth ----
  signup: (data) => request("/auth/signup", { method: "POST", body: data, authed: false }),
  login: (data) => request("/auth/login", { method: "POST", body: data, authed: false }),
  activateDoctor: (data) =>
    request("/auth/doctors/activate", { method: "POST", body: data, authed: false }),
  me: () => request("/auth/me"),

  // ---- patient: onboarding + daily check-in ----
  submitIntake: (data) => request("/patients/me/intake", { method: "POST", body: data }),
  submitCheckIn: (data) => request("/patients/me/checkins", { method: "POST", body: data }),
  checkInHistory: () => request("/patients/me/checkins"),
  latestReport: () => request("/patients/me/checkins/latest"),
  reminders: () => request("/patients/me/reminders"),

  // ---- doctors, booking, consent ----
  listDoctors: () => request("/doctors"),
  availability: (doctorId) => request(`/doctors/${doctorId}/availability`),
  myAppointments: () => request("/appointments"),
  requestAppointment: (data) => request("/appointments", { method: "POST", body: data }),
  myConsents: () => request("/consents"),
  grantConsent: (doctorId) =>
    request("/consents", { method: "POST", body: { doctor_id: doctorId } }),
  revokeConsent: (doctorId) => request(`/consents/${doctorId}`, { method: "DELETE" }),

  // ---- doctor ----
  doctorPatients: () => request("/doctor/patients"),
  patientRecord: (patientId) => request(`/doctor/patients/${patientId}/record`),
  doctorAppointments: () => request("/doctor/appointments"),
  respondToAppointment: (id, status) =>
    request(`/doctor/appointments/${id}`, { method: "PATCH", body: { status } }),

  // ---- admin ----
  adminDoctors: () => request("/admin/doctors"),
  issueDoctorCode: (data) => request("/admin/doctors", { method: "POST", body: data }),
  revokeDoctor: (doctorId) => request(`/admin/doctors/${doctorId}`, { method: "DELETE" }),
  adminAppointments: () => request("/admin/appointments"),
  auditLog: () => request("/admin/audit-log"),

  // ---- visitor chatbot (no auth) ----
  ask: (question) => request("/chat", { method: "POST", body: { question }, authed: false }),

  savePushSubscription: (subscription) =>
    request("/patients/me/push-subscription", { method: "POST", body: subscription }),
  deletePushSubscription: () =>
    request("/patients/me/push-subscription", { method: "DELETE" }),

    // ---- doctor schedule ----
  myWorkingHours: () => request("/doctor/availability"),
  addWorkingHours: (data) =>
    request("/doctor/availability", { method: "POST", body: data }),
  removeWorkingHours: (id) =>
    request(`/doctor/availability/${id}`, { method: "DELETE" }),
  myCalendar: () => request("/doctor/calendar"),

  myBaseline: () => request("/patients/me/baseline"),
  myDoctors: () => request("/patients/me/doctors"),
  myAppointments: ({ includePast = false } = {}) =>
    request(`/appointments?include_past=${includePast}`),
  cancelAppointment: (id) =>
    request(`/appointments/${id}/cancel`, { method: "POST", body: {} }),

};
