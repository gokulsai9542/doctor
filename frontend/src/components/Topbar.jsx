import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Topbar({ title = '' }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-slate-800 font-semibold text-lg">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="bg-slate-800 rounded-lg p-1">
          <NotificationBell />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-700 leading-none">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
