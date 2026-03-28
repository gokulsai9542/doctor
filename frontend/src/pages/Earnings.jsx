import { useEffect, useState } from 'react';
import { TrendingUp, CreditCard, Clock, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const statusBadge = {
  paid:       <span className="badge-paid">Paid</span>,
  pending:    <span className="badge-pending">Pending</span>,
  failed:     <span className="badge-rejected">Failed</span>,
  processing: <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">Processing</span>,
};

export default function Earnings() {
  const [data,       setData]       = useState({ payments: [], totalEarnings: 0 });
  const [loading,    setLoading]    = useState(true);
  const [payoutRate, setPayoutRate] = useState('');
  const [saving,     setSaving]     = useState(false);
  const { user }                    = useAuth();

  useEffect(() => {
    api.get('/payments/mine').then(({ data }) => setData(data)).finally(() => setLoading(false));
    api.get('/auth/me').then(({ data }) => setPayoutRate(data.payoutRate ?? 5));
  }, []);

  const handleSaveRate = async () => {
    if (!payoutRate || payoutRate < 1) return toast.error('Enter a valid amount.');
    setSaving(true);
    try {
      await api.patch('/auth/payout-rate', { payoutRate: Number(payoutRate) });
      toast.success('Your fee updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update fee.');
    } finally {
      setSaving(false);
    }
  };

  const paid    = data.payments.filter(p => p.status === 'paid');
  const pending = data.payments.filter(p => p.status === 'pending');

  return (
    <Layout title="Earnings">
      {/* Set Payout Rate */}
      <div className="card max-w-sm mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <IndianRupee size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Your Annotation Fee</p>
            <p className="text-xs text-slate-400">Providers will see this rate before assigning you</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input type="number" min="1" value={payoutRate}
            onChange={e => setPayoutRate(e.target.value)}
            className="input w-28" placeholder="₹ amount" />
          <button onClick={handleSaveRate} disabled={saving} className="btn-primary px-4 text-sm">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: TrendingUp, label: 'Total Earned',       value: `₹${data.totalEarnings}`,                                  color: 'border-emerald-500', bg: 'bg-emerald-500' },
          { icon: CreditCard, label: 'Paid Transactions',  value: paid.length,                                                color: 'border-blue-500',    bg: 'bg-blue-500' },
          { icon: Clock,      label: 'Pending Amount',     value: `₹${pending.reduce((s, p) => s + p.amount, 0)}`,           color: 'border-amber-500',   bg: 'bg-amber-500' },
        ].map(c => (
          <div key={c.label} className={`card flex items-center gap-4 border-l-4 ${c.color}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
              <c.icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{loading ? '—' : c.value}</p>
              <p className="text-sm text-slate-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Date', 'Amount', 'Provider', 'Transaction ID', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : data.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">
                    <div className="text-4xl mb-3">💳</div>
                    <p className="font-medium">No transactions yet</p>
                    <p className="text-sm mt-1">Payments appear after your annotations are approved</p>
                  </td>
                </tr>
              ) : (
                data.payments.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">₹{p.amount}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.provider?.organization || p.provider?.name || '—'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.transactionId || '—'}</td>
                    <td className="px-6 py-4">{statusBadge[p.status]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
