import React, { useState } from 'react';
import FormInput from './FormInput';
import Button from './Button';

// Patient Sign Up component
export default function Singup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    console.log('Registering patient:', formData);
    // TODO: Redirect to /patient/onboarding upon successful registration
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', border: '1px solid #e0e0e0', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#1d3557', marginBottom: '24px' }}>Create Patient Account</h2>
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Full Name"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          placeholder="John Doe"
          required
        />
        <FormInput
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="name@example.com"
          required
        />
        <FormInput
          label="Password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Create password"
          required
        />
        <FormInput
          label="Confirm Password"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="Re-enter password"
          required
        />
        <Button type="submit" style={{ width: '100%', marginTop: '10px' }}>
          Register
        </Button>
      </form>
    </div>
  );
}