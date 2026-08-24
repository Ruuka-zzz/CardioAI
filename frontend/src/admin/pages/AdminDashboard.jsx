import React, { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import { Shield, Key, FileText, Check } from 'lucide-react';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [email, setEmail] = useState('');
  const [issuedCode, setIssuedCode] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const auditLogs = await api.auditLog();
        setLogs(auditLogs || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const handleIssueCode = async (e) => {
    e.preventDefault();
    try {
      const res = await api.issueDoctorCode({ email });
      setIssuedCode(res?.code || 'SUCCESS');
      setEmail('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">System Administration</h2>
          <p className="text-xs text-slate-400 mt-1">Provider activation, access control & security audit logging</p>
        </div>

        {/* Issue Code Block */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Issue Clinician Activation Key</h3>
          </div>
          <form onSubmit={handleIssueCode} className="flex gap-3">
            <input
              type="email"
              placeholder="Doctor's Professional Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <button type="submit" className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl hover:from-emerald-400 hover:to-teal-300 transition-all">
              Generate Key
            </button>
          </form>

          {issuedCode && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
              <span className="text-xs text-slate-300">Activation Code Generated:</span>
              <span className="font-mono text-emerald-400 font-bold text-sm tracking-wider">{issuedCode}</span>
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">System Security Audit Log</h3>
          </div>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-xs">No recorded system audit logs.</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                  <span className="font-semibold text-slate-300">{log.action || 'Access Event'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{log.timestamp || 'Recorded'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}