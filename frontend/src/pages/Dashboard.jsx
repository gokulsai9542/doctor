import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, XCircle, DollarSign, Plus, ArrowRight, Upload, Images, CreditCard } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const modalityIcon = { xray: '🦴', mri: '🧠', ct: '🫁' };
const statusBadge  = {
  approved:  <span className="badge-approved">Approved</span>,
  submitted: <span className="badge-pending">Pending</span>,
  rejected:  <span className="badge-rejected">Rejected</span>,
};
const payStatusBadge = {
  paid:       <span className="badge-paid">Paid</span>,
  pending:    <span className="badge-pending">Pending</span>,
  failed:     <span className="badge-rejected">Failed</span>,
  processing: <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">Processing</span>,
};

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`card flex items-center gap-4 border-l-4 ${color}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Provider Dashboard ────────────────────────────────────────────────────────
function ProviderDashboard({ profile }) {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState({ images: 0, pending: 0, assigned: 0, completed: 0, totalSpent: 0, pendingPayments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/images/mine'),
      api.get('/payments/provider'),
    ]).then(([img, pay]) => {
      const images   = img.data;
      const payments = pay.data.payments;
      setStats({
        images:          images.length,
        pending:         images.filter(i => i.status === 'pending').length,
        assigned:        images.filter(i => i.status === 'assigned').length,
        completed:       images.filter(i => i.status === 'completed').length,
        totalSpent:      pay.data.totalSpent,
        pendingPayments: payments.filter(p => p.status === 'pending').length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const cards = [
    { icon: Images,     label: 'Total Uploaded',    value: stats.images,          color: 'border-blue-500',    bg: 'bg-blue-500' },
    { icon: Clock,      label: 'Awaiting Doctor',   value: stats.pending,         color: 'border-amber-500',   bg: 'bg-amber-500' },
    { icon: ClipboardCheck, label: 'In Progress',   value: stats.assigned,        color: 'border-purple-500',  bg: 'bg-purple-500' },
    { icon: ClipboardCheck, label: 'Completed',     value: stats.completed,       color: 'border-emerald-500', bg: 'bg-emerald-500' },
    { icon: CreditCard, label: 'Total Spent',       value: `₹${stats.totalSpent}`, color: 'border-green-500',   bg: 'bg-green-500' },
    { icon: XCircle,    label: 'Pending Payments',  value: stats.pendingPayments, color: 'border-red-500',     bg: 'bg-red-500' },
  ];

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {loading
          ? Array(6).fill(0).map((_, i) => <div key={i} className="card animate-pulse h-24" />)
          : cards.map(c => <StatCard key={c.label} {...c} />)
        }
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/provider')}
            className="btn-primary flex items-center gap-2 py-2.5 px-5">
            <Upload size={16} /> Upload New Image
          </button>
          <button onClick={() => navigate('/provider')}
            className="flex items-center gap-2 py-2.5 px-5 rounded-lg border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 text-sm font-medium transition-all">
            <CreditCard size={16} /> Pay Doctors
          </button>
          <button onClick={() => navigate('/provider')}
            className="flex items-center gap-2 py-2.5 px-5 rounded-lg border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 text-sm font-medium transition-all">
            <Images size={16} /> View My Images
          </button>
        </div>
      </div>
    </>
  );
}

// ── Doctor Dashboard ──────────────────────────────────────────────────────────
function DoctorDashboard({ profile }) {
  const navigate = useNavigate();
  const [annotations, setAnnotations] = useState([]);
  const [earnings,    setEarnings]    = useState({ totalEarnings: 0, payments: [] });
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/annotations/mine'),
      api.get('/payments/mine'),
    ]).then(([a, e]) => {
      setAnnotations(a.data);
      setEarnings(e.data);
    }).finally(() => setLoading(false));
  }, []);

  const stats  = {
    total:    annotations.length,
    approved: annotations.filter(a => a.status === 'approved').length,
    pending:  annotations.filter(a => a.status === 'submitted').length,
    rejected: annotations.filter(a => a.status === 'rejected').length,
  };
  const recent = [...annotations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="card animate-pulse h-24" />) : (
          <>
            <StatCard icon={ClipboardCheck} label="Total Tasks"    value={stats.total}    color="border-blue-500"    bg="bg-blue-500" />
            <StatCard icon={ClipboardCheck} label="Approved"       value={stats.approved} color="border-emerald-500" bg="bg-emerald-500" />
            <StatCard icon={Clock}          label="Pending Review" value={stats.pending}  color="border-amber-500"   bg="bg-amber-500" />
            <StatCard icon={XCircle}        label="Rejected"       value={stats.rejected} color="border-red-500"     bg="bg-red-500" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Annotations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Recent Annotations</h3>
            <button onClick={() => navigate('/tasks')}
              className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
              <Plus size={13} /> New Task
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🖼️</div>
              <p className="text-slate-500 text-sm">No annotations yet.</p>
              <button onClick={() => navigate('/tasks')} className="btn-primary mt-3 text-sm py-1.5 px-4">Start a Task</button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(a => (
                <div key={a._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                    {modalityIcon[a.image?.modality] || '🩻'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{a.image?.modality?.toUpperCase() || 'Image'}</p>
                    <p className="text-xs text-slate-400">{a.labels?.length} label(s) · {new Date(a.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  {statusBadge[a.status]}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Payment History</h3>
            <button onClick={() => navigate('/earnings')}
              className="flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline">
              View All <ArrowRight size={13} />
            </button>
          </div>
          {earnings.payments.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">💳</div>
              <p className="text-slate-500 text-sm">No payments yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {earnings.payments.slice(0, 5).map(p => (
                <div key={p._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign size={18} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">₹{p.amount}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {p.provider?.name || 'Provider'} · {new Date(p.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  {payStatusBadge[p.status]}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!loading && stats.total > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Annotation Progress</h3>
          <div className="flex gap-6 mb-3 flex-wrap">
            {[{ label: 'Approved', value: stats.approved, color: 'bg-emerald-500' },
              { label: 'Pending',  value: stats.pending,  color: 'bg-amber-500' },
              { label: 'Rejected', value: stats.rejected, color: 'bg-red-500' }].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                <span className="text-slate-600">{s.label}:</span>
                <span className="font-semibold">{s.value}</span>
                <span className="text-slate-400">({Math.round((s.value / stats.total) * 100)}%)</span>
              </div>
            ))}
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            {[{ value: stats.approved, color: 'bg-emerald-500' },
              { value: stats.pending,  color: 'bg-amber-500' },
              { value: stats.rejected, color: 'bg-red-500' }].map((s, i) =>
              s.value > 0 ? (
                <div key={i} className={`${s.color} transition-all duration-700`}
                  style={{ width: `${(s.value / stats.total) * 100}%` }} />
              ) : null
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }  = useAuth();
  const [profile, setProfile] = useState(null);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setProfile(data);
      if (data.role === 'doctor') setEarnings(data.earnings || 0);
    });
  }, []);

  return (
    <Layout title="Dashboard">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm mb-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h2 className="text-2xl font-bold">
              Welcome back, {user?.role === 'doctor' ? 'Dr. ' : ''}{profile?.name || user?.name} 👋
            </h2>
            <p className="text-blue-200 text-sm mt-1">{profile?.email}</p>
          </div>
          {user?.role === 'doctor' && (
            <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-4 text-center">
              <p className="text-3xl font-bold">₹{earnings}</p>
              <p className="text-blue-200 text-sm mt-1">Total Earned</p>
            </div>
          )}
          {user?.role === 'provider' && (
            <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-4 text-center">
              <p className="text-blue-200 text-sm">Image Provider</p>
              <p className="text-white font-semibold mt-1">Upload & manage medical images</p>
            </div>
          )}
        </div>
      </div>

      {/* Role-specific content */}
      {user?.role === 'provider' && <ProviderDashboard profile={profile} />}
      {user?.role === 'doctor'   && <DoctorDashboard   profile={profile} />}
      {user?.role === 'admin'    && (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">🛡️</div>
          <p className="font-semibold text-slate-600 text-lg">Admin Dashboard</p>
          <p className="text-sm mt-1">Use the Admin Panel to review annotations and manage the platform.</p>
        </div>
      )}
    </Layout>
  );
}
