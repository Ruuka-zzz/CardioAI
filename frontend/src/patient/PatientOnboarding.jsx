import React, { useState } from 'react';

// Collects initial structured data (forms/MCQs) to pass to Machine Learning Service[cite: 1]
export default function PatientOnboarding() {
  const [formData, setFormData] = useState({
    age: '',
    chestPainType: '0',
    restingBP: '',
    cholesterol: '',
    fastingBS: '0',
    familyHistory: 'no',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting onboarding data to ML service:', formData);
    // TODO: POST data to ML model endpoint to generate baseline cardiovascular risk[cite: 1]
  };

  return (
    <div style={{ maxWidth: '550px', margin: '40px auto', padding: '24px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#1d3557' }}>Patient Medical Intake Form</h2>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
        Please complete this form to calculate your baseline cardiovascular risk assessment.[cite: 1]
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold' }}>Age:</label>
          <input
            type="number"
            required
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '4px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Structured MCQ for Chest Pain Type */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold' }}>Chest Pain Type (MCQ):</label>
          <select
            value={formData.chestPainType}
            onChange={(e) => setFormData({ ...formData, chestPainType: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option value="0">Typical Angina</option>
            <option value="1">Atypical Angina</option>
            <option value="2">Non-anginal Pain</option>
            <option value="3">Asymptomatic</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold' }}>Resting Blood Pressure (mm Hg):</label>
          <input
            type="number"
            value={formData.restingBP}
            onChange={(e) => setFormData({ ...formData, restingBP: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '4px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold' }}>Cholesterol Level (mg/dl):</label>
          <input
            type="number"
            value={formData.cholesterol}
            onChange={(e) => setFormData({ ...formData, cholesterol: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '4px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold' }}>Family History of Heart Disease?</label>
          <select
            value={formData.familyHistory}
            onChange={(e) => setFormData({ ...formData, familyHistory: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <button
          type="submit"
          style={{ width: '100%', padding: '12px', backgroundColor: '#e63946', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Submit Intake Data
        </button>
      </form>
    </div>
  );
}