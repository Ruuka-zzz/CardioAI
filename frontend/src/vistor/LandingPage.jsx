import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HeartPulse, ShieldAlert, Cpu, Bot, Send, Sparkles, X } from 'lucide-react';
import { api } from '../../shared/api/client';

export default function VisitorLanding() {
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState([
    { sender: 'bot', text: 'Hello! I am CardioAI Assistant. How can I help you today?' }
  ]);
  const [asking, setAsking] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const userQ = question;
    setQuestion('');
    setChatLog((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAsking(true);

    try {
      const res = await api.ask(userQ);
      setChatLog((prev) => [...prev, { sender: 'bot', text: res?.answer || res?.detail || 'Thank you for asking. Please consult a clinician for direct medical advice.' }]);
    } catch (err) {
      setChatLog((prev) => [...prev, { sender: 'bot', text: err.message || 'Error reaching the chatbot.' }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col justify-between items-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Next-Gen AI Cardiovascular Intelligence
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-100 leading-tight">
          Intelligent Heart Health <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Monitoring & Risk Triage
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Real-time symptom analysis, clinical decision support, and proactive risk assessment powered by intelligent medical reasoning.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            to="/login"
            className="flex items-center gap-2 px-7 py-4 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-2xl shadow-xl hover:from-emerald-400 transition-all"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-7 py-4 bg-slate-900 text-slate-200 font-semibold rounded-2xl border border-slate-800 hover:border-slate-700 transition-all shadow-lg"
          >
            <Bot className="w-4 h-4 text-emerald-400" /> Ask AI Assistant
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-12 max-w-3xl mx-auto">
          {[
            { icon: HeartPulse, title: 'Continuous Tracking', desc: 'Symptom logging & longitudinal health monitoring.' },
            { icon: Cpu, title: 'ML Risk Analysis', desc: 'Predictive statistical models trained on clinical vitals.' },
            { icon: ShieldAlert, title: 'Knowledge Engine', desc: 'Deterministic medical logic for immediate safety triage.' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">CardioAI Assistant</h4>
                  <p className="text-[10px] text-emerald-400">Online • Visitor Guide</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/50">
              {chatLog.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-500 text-slate-950 font-medium'
                      : 'bg-slate-800 border border-slate-700/60 text-slate-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAsk} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Ask about cardiovascular health..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={asking}
                className="p-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}