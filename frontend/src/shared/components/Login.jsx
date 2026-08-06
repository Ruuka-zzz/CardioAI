import React, { useState } from 'react';
import FormInput from './FormInput';
import Button from './Button';

// Role-based authentication login form
export default function Login() {
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [doctorCode, setDoctorCode] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Handles authentication payload depending on role
    const payload = role === 'doctor' 
      ? { email, password, doctorCode } 
      : { email, password };

    console.log(`Logging in as ${role}:`, payload);
    // TODO: Connect with Backend Auth API
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', border: '1px solid #e0e0e0', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#1d3557', marginBottom: '24px' }}>CardioAI Login</h2>

      {/* Role Selection Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['patient', 'doctor', 'admin'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: role === r ? '#e63946' : '#f1f1f1',
              color: role === r ? '#ffffff' : '#333333',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <form onSubmit={handleLogin}>
        {/* Unique identification code required specifically for doctor role */}
        {role === 'doctor' && (
          <FormInput
            label="Doctor Activation Code"
            value={doctorCode}
            onChange={(e) => setDoctorCode(e.target.value)}
            placeholder="Enter unique doctor code"
            required
          />
        )}

        <FormInput
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
        />

        <FormInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        <Button type="submit" style={{ width: '100%', marginTop: '10px' }}>
          Sign In
        </Button>
      </form>
    </div>
  );
}