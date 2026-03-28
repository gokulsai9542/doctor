import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ClipboardList, DollarSign,
  Building2, ShieldCheck, LogOut, Stethoscope,
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink to={to} className={({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
     ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
  }>
    <Icon size={18} />
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-slate-900 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Stethoscope size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">MedAnnotate</p>
            <p className="text-slate-500 text-xs mt-0.5 capitalize">{user?.role} Portal</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

        {user?.role === 'doctor' && <>
          <NavItem to="/tasks"    icon={ClipboardList} label="Tasks" />
          <NavItem to="/earnings" icon={DollarSign}    label="Earnings" />
        </>}

        {user?.role === 'provider' && (
          <NavItem to="/provider" icon={Building2} label="Provider Panel" />
        )}

        {user?.role === 'admin' && <>
          <NavItem to="/admin"    icon={ShieldCheck}   label="Admin Panel" />
          <NavItem to="/earnings" icon={DollarSign}    label="Payments" />
        </>}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-all">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
