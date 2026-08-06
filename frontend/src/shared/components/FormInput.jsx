import React from 'react';

// Reusable input component for forms
export default function FormInput({ label, type = 'text', value, onChange, placeholder, required = false }) {
  return (
    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1d3557' }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          padding: '10px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '1rem',
          outline: 'none',
        }}
      />
    </div>
  );
}