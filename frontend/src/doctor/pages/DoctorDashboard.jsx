import React from 'react';

// Doctor profile management and patient list view (consent-gated)[cite: 1]
export default function DoctorDashboard() {
  // Mock patients list
  const patients = [
    { id: 'P-101', name: 'Alice Smith', condition: 'Good', consentApproved: true },
    { id: 'P-102', name: 'Bob Jones', condition: 'Fair', consentApproved: false },
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1d3557' }}>Doctor Portal</h1>

      <h3>Connected Patients</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f1f1', textAlign: 'left' }}>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Patient ID</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Name</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Medical Record Access</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id}>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.id}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.name}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.condition}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                {p.consentApproved ? (
                  <button style={{ padding: '6px 12px', backgroundColor: '#457b9d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    View Record
                  </button>
                ) : (
                  <span style={{ color: '#888', fontSize: '0.9rem' }}>Access Restricted (No Patient Consent)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}