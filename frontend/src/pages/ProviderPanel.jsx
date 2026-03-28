import { useEffect, useState } from 'react';
import { Upload, Images, CreditCard, RefreshCw, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Layout from '../components/Layout';
import PaymentModal from '../components/PaymentModal';

const statusBadge = {
  pending:    <span className="badge-pending">Pending</span>,
  processing: <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">Processing</span>,
  paid:       <span className="badge-approved">Paid</span>,
  failed:     <span className="badge-rejected">Failed</span>,
};
const imgStatusStyle = {
  completed: 'bg-emerald-100 text-emerald-700',
  assigned:  'bg-blue-100 text-blue-700',
  pending:   'bg-amber-100 text-amber-700',
};

export default function ProviderPanel() {
  const [activeTab,       setActiveTab]       = useState('upload');
  const [images,          setImages]          = useState([]);
  const [payments,        setPayments]        = useState([]);
  const [doctors,         setDoctors]         = useState([]);
  const [totalSpent,      setTotalSpent]      = useState(0);
  const [uploadForm,      setUploadForm]      = useState({ modality: 'xray', providerNote: '', file: null, doctorId: '' });
  const [uploading,       setUploading]       = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [retrying,        setRetrying]        = useState(null);
  const [assigning,       setAssigning]       = useState(null);

  const fetchAll = () => {
    api.get('/images/mine').then(({ data }) => setImages(data)).catch(() => {});
    api.get('/payments/provider').then(({ data }) => { setPayments(data.payments); setTotalSpent(data.totalSpent); }).catch(() => {});
  };

  useEffect(() => {
    fetchAll();
    api.get('/auth/doctors').then(({ data }) => setDoctors(data)).catch(() => {});
  }, []);

  const selectedDoctor = doctors.find(d => d._id === uploadForm.doctorId);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.doctorId) return toast.error('Please select a doctor.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', uploadForm.file);
      fd.append('modality', uploadForm.modality);
      fd.append('providerNote', uploadForm.providerNote);
      fd.append('assignedTo', uploadForm.doctorId);
      await api.post('/images/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Image uploaded and assigned to doctor!');
      setUploadForm({ modality: 'xray', providerNote: '', file: null, doctorId: '' });
      fetchAll();
      setActiveTab('images');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAssignDoctor = async (imageId, doctorId) => {
    setAssigning(imageId);
    try {
      await api.patch(`/images/assign-doctor/${imageId}`, { doctorId });
      toast.success('Doctor assigned!');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(null);
    }
  };

  const handleRetry = async (paymentId) => {
    setRetrying(paymentId);
    try {
      const { data } = await api.post(`/payments/retry/${paymentId}`);
      toast.success(`${data.message} | TXN: ${data.transactionId}`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Retry failed');
      fetchAll();
    } finally {
      setRetrying(null);
    }
  };

  const pendingCount = payments.filter(p => p.status === 'pending').length;

  const tabs = [
    { id: 'upload',   icon: Upload,     label: 'Upload Images' },
    { id: 'images',   icon: Images,     label: 'My Images' },
    { id: 'payments', icon: CreditCard, label: 'Pay Doctors', badge: pendingCount },
  ];

  return (
    <Layout title="Provider Panel">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Images Uploaded',       value: images.length,      color: 'border-blue-500',    bg: 'bg-blue-500',    icon: Images },
          { label: 'Total Paid to Doctors',  value: `₹${totalSpent}`,   color: 'border-emerald-500', bg: 'bg-emerald-500', icon: CreditCard },
          { label: 'Pending Payments',       value: pendingCount,       color: 'border-amber-500',   bg: 'bg-amber-500',   icon: RefreshCw },
        ].map(c => (
          <div key={c.label} className={`card flex items-center gap-4 border-l-4 ${c.color}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
              <c.icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{c.value}</p>
              <p className="text-sm text-slate-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={15} />{t.label}
            {t.badge > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="card max-w-lg">
          <h3 className="font-semibold text-slate-800 mb-5">Upload Medical Image</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Image Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Image Type</label>
              <select value={uploadForm.modality} onChange={e => setUploadForm({ ...uploadForm, modality: e.target.value })} className="input">
                <option value="xray">🦴 X-Ray</option>
                <option value="mri">🧠 MRI</option>
                <option value="ct">🫁 CT Scan</option>
              </select>
            </div>

            {/* Select Doctor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Doctor</label>
              {doctors.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No doctors available yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {doctors.map(d => (
                    <button key={d._id} type="button"
                      onClick={() => setUploadForm(prev => ({ ...prev, doctorId: d._id }))}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 text-sm transition-all
                        ${uploadForm.doctorId === d._id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="text-left">
                        <p className="font-medium text-slate-800">Dr. {d.name}</p>
                        <p className="text-xs text-slate-400">{d.specialization || 'General'}</p>
                      </div>
                      <span className="text-emerald-600 font-bold text-sm">₹{d.payoutRate ?? 5}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedDoctor && (
                <p className="text-xs text-blue-600 mt-1.5">
                  ✓ Selected: Dr. {selectedDoctor.name} — Fee: ₹{selectedDoctor.payoutRate ?? 5}
                </p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Note for Doctor</label>
              <input placeholder="e.g. Focus on lower left lobe" value={uploadForm.providerNote}
                onChange={e => setUploadForm({ ...uploadForm, providerNote: e.target.value })} className="input" />
            </div>

            {/* File */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select File</label>
              <input type="file" accept="image/*" onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" required />
            </div>

            <button type="submit" disabled={uploading || !uploadForm.doctorId} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />Uploading...</> : <><Upload size={15} />Upload & Assign</>}
            </button>
          </form>
        </div>
      )}

      {/* My Images Tab */}
      {activeTab === 'images' && (
        <div>
          {images.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <div className="text-5xl mb-4">🖼️</div>
              <p className="font-medium">No images uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {images.map(img => (
                <div key={img._id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                  <img src={img.url} alt="medical" className="w-full h-44 object-cover" />
                  <div className="p-4">
                    <p className="font-semibold text-slate-800 mb-1">{img.modality.toUpperCase()}</p>
                    {img.providerNote && <p className="text-xs text-slate-500 mb-2">{img.providerNote}</p>}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${imgStatusStyle[img.status]}`}>
                      {img.status}
                    </span>
                    {img.assignedTo ? (
                      <p className="text-xs text-slate-500 mt-2">👨‍⚕️ Dr. {img.assignedTo.name}</p>
                    ) : (
                      /* Re-assign doctor if still pending */
                      <div className="mt-2">
                        <select className="input text-xs py-1"
                          onChange={e => e.target.value && handleAssignDoctor(img._id, e.target.value)}
                          defaultValue="">
                          <option value="" disabled>Assign a doctor...</option>
                          {doctors.map(d => (
                            <option key={d._id} value={d._id}>Dr. {d.name} — ₹{d.payoutRate ?? 5}</option>
                          ))}
                        </select>
                        {assigning === img._id && <p className="text-xs text-blue-500 mt-1">Assigning...</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pay Doctors Tab */}
      {activeTab === 'payments' && (
        <div className="card p-0 overflow-hidden">
          {payments.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <div className="text-5xl mb-4">💳</div>
              <p className="font-medium">No payments yet</p>
              <p className="text-sm mt-1">Payments appear after admin approves annotations</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Doctor', 'Amount', 'Transaction ID', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800">{p.doctor?.name}</p>
                      <p className="text-xs text-slate-400">{p.doctor?.specialization}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-800">₹{p.amount}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{p.transactionId || '—'}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {p.paidAt ? new Date(p.paidAt).toLocaleString('en-IN') : new Date(p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-4">{statusBadge[p.status]}</td>
                    <td className="px-5 py-4">
                      {p.status === 'pending' && (
                        <button onClick={() => setSelectedPayment(p)} className="btn-primary text-xs py-1.5 px-3">💸 Pay Now</button>
                      )}
                      {p.status === 'failed' && (
                        <button onClick={() => handleRetry(p._id)} disabled={retrying === p._id}
                          className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1">
                          <RefreshCw size={12} className={retrying === p._id ? 'spinner' : ''} /> Retry
                        </button>
                      )}
                      {p.status === 'paid' && <span className="text-emerald-600 text-sm font-semibold">✓ Done</span>}
                      {p.status === 'processing' && <span className="text-blue-500 text-sm">⏳</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onSuccess={() => { setSelectedPayment(null); fetchAll(); }}
        />
      )}
    </Layout>
  );
}
