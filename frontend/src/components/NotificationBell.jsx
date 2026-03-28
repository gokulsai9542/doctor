import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const TYPE_ICON = {
  image_uploaded:        '🖼️',
  annotation_submitted:  '📋',
  annotation_approved:   '✅',
  annotation_rejected:   '❌',
  payment_created:       '💳',
  payment_paid:          '🎉',
  payment_failed:        '⚠️',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [open,          setOpen]          = useState(false);
  const dropdownRef = useRef(null);
  const navigate    = useNavigate();

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } catch {}
  };

  // Poll every 15 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(prev => !prev);
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = async (n) => {
    if (!n.read) {
      await api.patch(`/notifications/${n._id}/read`);
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button onClick={handleOpen}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-slate-800 text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button key={n._id} onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3
                    ${!n.read ? 'bg-blue-50/50' : ''}`}>
                  <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
