import React, { useState } from 'react';

// Admin dashboard for managing doctor activation codes and platform oversight[cite: 1]
export default function AdminDashboard() {
  const [doctorEmail, setDoctorEmail] = useState('');
  const [issuedCodes, setIssuedCodes] = useState([
    { email: 'dr.smith@cardioai.com', code: 'DOC-8832', status: 'Active' },
  ]);

  const handleIssueCode = (e) => {
    e.preventDefault();
    if (!doctorEmail) return;

    const newCode = `DOC-${Math.floor(1000 + Math.random() * 9000)}`;
    setIssuedCodes([...issuedCodes, { email: doctorEmail, code: newCode, status: 'Pending Activation' }]);
    setDoctorEmail('');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1d3557' }}>Admin Panel</h1>

      {/* Issue Doctor Code Form */}
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>Issue Doctor Activation Code</h3>
        <form onSubmit={handleIssueCode} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="email"
            placeholder="Doctor's Email"
            value={doctorEmail}
            onChange={(e) => setDoctorEmail(e.target.value)}
            required
            style={{ flex: 1, padding: '8px' }}
          />
          <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#e63946', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Generate Code
          </button>
        </form>
      </div>

      {/* Managed Doctors Table */}
      <h3>Issued Doctor Codes</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f1f1', textAlign: 'left' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Doctor Email</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Unique Code</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {issuedCodes.map((item, idx) => (
            <tr key={idx}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.email}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}><code>{item.code}</code></td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}