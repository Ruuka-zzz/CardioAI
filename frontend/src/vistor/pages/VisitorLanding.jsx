import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../shared/components/Navbar";
import VisitorChatbot from "../components/VisitorChatbot";

export default function VisitorLanding() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#9bc5bb] text-slate-900 font-sans flex flex-col justify-between p-4 md:p-6 selection:bg-teal-600 selection:text-white relative overflow-hidden">
      
      {/* Background Decorative Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-white/25 blur-[120px] rounded-full pointer-events-none" />

      <Navbar />

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto flex flex-col items-center justify-center text-center py-6 relative z-10">
        
        {/* ÃƒÂ¡Ã¢â€šÂ¬Ã‚ÂÃƒÂ¡Ã¢â€šÂ¬Ã‚Â±ÃƒÂ¡Ã¢â€šÂ¬Ã‚Â«ÃƒÂ¡Ã¢â€šÂ¬Ã¢â‚¬Å¾ÃƒÂ¡Ã¢â€šÂ¬Ã‚ÂºÃƒÂ¡Ã¢â€šÂ¬Ã‚Â¸ÃƒÂ¡Ã¢â€šÂ¬Ã¢â‚¬Â¦ÃƒÂ¡Ã¢â€šÂ¬Ã¢â‚¬Â°ÃƒÂ¡Ã¢â€šÂ¬Ã‚Âº */}
        <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.15] mb-4 mt-2">
          Intelligent Heart Health <br />
          <span className="text-slate-700">
            Monitoring & Risk Triage
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-slate-800 max-w-xl text-xs md:text-sm leading-relaxed mb-6 font-medium">
          Real-time symptom analysis, clinical decision support, and proactive risk assessment powered by intelligent medical reasoning.
        </p>

        {/* Chat Assistant Trigger Button */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-800 animate-ping" />
            Learn the secrets of keeping your heart strong and youthful
          </span>

          <button 
            onClick={() => setIsChatOpen(true)}
            className="px-6 py-3 rounded-2xl bg-[#528d80] hover:bg-[#43756a] text-white font-bold text-xs md:text-sm transition-all shadow-lg shadow-teal-900/15 flex items-center gap-2.5 transform hover:scale-105 border border-white/30 cursor-pointer"
          >
            <span>Chat with AI Assistant</span>
          </button>
        </div>

        {/* Feature Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* Card 1 */}
          <div className="p-4 rounded-3xl bg-white/95 border border-white shadow-md backdrop-blur-md">
            <div className="w-7 h-7 rounded-xl bg-[#528d80] text-white flex items-center justify-center font-bold text-xs mb-2 shadow-sm">01</div>
            <h3 className="text-xs md:text-sm font-bold text-slate-950 mb-1">Continuous Tracking</h3>
            <p className="text-[11px] text-slate-700">Symptom logging & longitudinal health monitoring.</p>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-3xl bg-[#f4f7f5]/95 border border-white shadow-md backdrop-blur-md">
            <div className="w-7 h-7 rounded-xl bg-[#528d80] text-white flex items-center justify-center font-bold text-xs mb-2 shadow-sm">02</div>
            <h3 className="text-xs md:text-sm font-bold text-slate-950 mb-1">ML Risk Analysis</h3>
            <p className="text-[11px] text-slate-700">Predictive statistical models trained on clinical vitals.</p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-3xl bg-[#eaf2ef]/95 border border-white shadow-md backdrop-blur-md">
            <div className="w-7 h-7 rounded-xl bg-[#528d80] text-white flex items-center justify-center font-bold text-xs mb-2 shadow-sm">03</div>
            <h3 className="text-xs md:text-sm font-bold text-slate-950 mb-1">Knowledge Engine</h3>
            <p className="text-[11px] text-slate-700">Deterministic medical logic for immediate safety triage.</p>
          </div>
        </div>

        {/* Doctor & Admin Access */}
        <div className="mt-6 flex items-center justify-center gap-6 bg-white/90 px-6 py-2.5 rounded-2xl border border-white backdrop-blur-md shadow-md">
          <Link to="/doctor-login" className="text-xs font-bold text-slate-900 hover:text-black flex items-center gap-1.5 transition-colors">
            Doctor Access
          </Link>
          <div className="w-px h-4 bg-slate-300" />
          <Link to="/admin-login" className="text-xs font-bold text-slate-900 hover:text-black flex items-center gap-1.5 transition-colors">
            Admin Access
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full py-3 text-center text-[11px] text-slate-800 border-t border-slate-900/10 relative z-10">
        Ãƒâ€šÃ‚Â© 2026 CardioAI Platform. All rights reserved.
      </footer>

      {/* Chatbot Modal / Component */}
      {isChatOpen && <VisitorChatbot onClose={() => setIsChatOpen(false)} />}

    </div>
  );
}