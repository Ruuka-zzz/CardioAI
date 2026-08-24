import React, { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import { Users, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pts, appts] = await Promise.all([
          api.doctorPatients(),
          api.doctorAppointments()
        ]);
        setPatients(pts || []);
        setAppointments(appts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAppointmentAction = async (id, status) => {
    try {
      await api.respondToAppointment(id, status);
      setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center text-slate-500 text-xs">Loading Clinical Data...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Clinical Workstation</h2>
          <p className="text-xs text-slate-400 mt-1">Patient monitoring and appointment dispatch management</p>
        </div>

        {/* Patients Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Active Assigned Patients</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-4">Patient ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Monitoring Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {patients.length === 0 ? (
                  <tr><td colSpan="3" className="p-6 text-center text-slate-500">No active patients currently assigned.</td></tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="p-4 font-mono font-bold text-emerald-400">{p.id}</td>
                      <td className="p-4 text-slate-200 font-semibold">{p.name || 'Patient'}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                          Continuous Tracking
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Consultation Requests</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.length === 0 ? (
              <p className="text-slate-500 text-xs col-span-2">No pending consultation requests.</p>
            ) : (
              appointments.map((appt) => (
                <div key={appt.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Request #{appt.id}</span>
                    <h4 className="text-xs font-bold text-slate-200 mt-1">Status: <span className="text-emerald-400 uppercase">{appt.status}</span></h4>
                  </div>
                  {appt.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAppointmentAction(appt.id, 'confirmed')} className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAppointmentAction(appt.id, 'rejected')} className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl font-bold text-xs">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}