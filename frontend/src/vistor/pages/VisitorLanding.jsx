import React, { useState } from 'react';

export default function VisitorLanding() {
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState([
    { sender: 'bot', text: 'Hello! I am CardioAI Assistant. How can I help you today?' }
  ]);

  const handleAsk = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setChatLog((prev) => [...prev, { sender: 'user', text: question }]);
    setQuestion('');
    setTimeout(() => {
      setChatLog((prev) => [...prev, { sender: 'bot', text: 'Thank you for asking. Please consult a clinician for direct medical advice.' }]);
    }, 600);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#090d16', color: '#ffffff', margin: 0, padding: 0, boxSizing: 'border-box', fontFamily: 'sans-serif', position: 'relative', zIndex: 1 }}>
      
      {/* Top Navbar */}
      <nav style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid #1e293b', boxSizing: 'border-box', position: 'relative', zIndex: 10 }}>
        
        {/* Logo */}
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span>Cardio<span style={{ color: '#10b981' }}>AI</span></span>
        </div>

        <div>
          <button 
            onClick={() => { window.location.href = '/login'; }}
            style={{ backgroundColor: '#10b981', color: '#090d16', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '14px' }}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ width: '100%', padding: '80px 20px', textAlign: 'center', boxSizing: 'border-box' }}>
        <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: '20px', backgroundColor: '#1e293b', border: '1px solid #10b981', color: '#34d399', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px' }}>
          ✨ Next-Gen AI Cardiovascular Intelligence
        </div>

        <h1 style={{ fontSize: '56px', fontWeight: '800', lineHeight: '1.2', marginBottom: '20px' }}>
          Intelligent Heart Health <br />
          <span style={{ color: '#10b981' }}>Monitoring & Risk Triage</span>
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '700px', margin: '0 auto 40px', lineHeight: '1.6' }}>
          Real-time symptom analysis, clinical decision support, and proactive risk assessment powered by intelligent medical reasoning.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '70px' }}>
          <button 
            onClick={() => { window.location.href = '/login'; }}
            style={{ backgroundColor: '#10b981', color: '#090d16', padding: '14px 32px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '16px' }}
          >
            Get Started →
          </button>
          <button 
            onClick={() => setChatOpen(true)} 
            style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '14px 32px', borderRadius: '12px', border: '1px solid #334155', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            🤖 Ask AI Assistant
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1100px', margin: '0 auto', textAlign: 'left', padding: '0 20px' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '30px', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ color: '#34d399', fontSize: '18px', margin: '0 0 10px 0' }}>Continuous Tracking</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>Symptom logging & longitudinal health monitoring.</p>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '30px', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ color: '#34d399', fontSize: '18px', margin: '0 0 10px 0' }}>ML Risk Analysis</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>Predictive statistical models trained on clinical vitals.</p>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '30px', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ color: '#34d399', fontSize: '18px', margin: '0 0 10px 0' }}>Knowledge Engine</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>Deterministic medical logic for immediate safety triage.</p>
          </div>
        </div>
      </div>

      {/* Chatbot Modal */}
      {chatOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', width: '90%', maxWidth: '450px', borderRadius: '20px', height: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', backgroundColor: '#090d16', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#10b981' }}>🤖 CardioAI Assistant</span>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatLog.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? '#10b981' : '#1e293b', color: msg.sender === 'user' ? '#090d16' : '#ffffff', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', maxWidth: '80%' }}>
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleAsk} style={{ padding: '12px', backgroundColor: '#090d16', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', outline: 'none', fontSize: '13px' }}
              />
              <button type="submit" style={{ backgroundColor: '#10b981', color: '#090d16', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}