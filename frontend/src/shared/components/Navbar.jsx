import { Calendar, CheckSquare, ClipboardList, HeartPulse, Home, Mail } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/patient/onboarding", label: "Patient Baseline", icon: ClipboardList },
  { path: "/patient/check-in", label: "Daily Check-in", icon: CheckSquare },
  { path: "/patient/doctors", label: "Doctor Booking", icon: Calendar },
  { path: "/contact", label: "Contact us", icon: Mail },
];

export default function Navbar() {
  const { pathname } = useLocation();
  return <header className="w-full border-b border-slate-200 bg-[#e2ece9]/80 backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
      <Link to="/" className="flex shrink-0 items-center gap-2.5 no-underline"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-teal-300"><HeartPulse className="h-5 w-5" /></span><span className="text-xl font-black tracking-tight text-slate-950">CardioAI</span></Link>
      <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm lg:flex">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => <Link key={path} to={path} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold no-underline transition-colors ${pathname === path ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><Icon className="h-4 w-4" />{label}</Link>)}
      </nav>
      <div className="flex shrink-0 items-center gap-2"><Link to="/login" className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white no-underline hover:bg-slate-800">Sign In</Link><Link to="/signup" className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white no-underline hover:bg-teal-700">Sign Up</Link></div>
    </div>
  </header>;
}