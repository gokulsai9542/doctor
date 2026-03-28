import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Upload, CheckCircle, XCircle, RefreshCw, UserPlus, Eye, X, ZoomIn } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Layout from '../components/Layout';
import BlockchainBadge from '../components/BlockchainBadge';

const statusBadge = {
  approved:  <span className="badge-approved">Approved</span>,
  submitted: <span className="badge-pending">Pending</span>,
  rejected:  <span className="badge-rejected">Rejected</span>,
};

export default function AdminPanel() {
  const [annotations, setAnnotations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('annotations');
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState('all');
  const [notes,       setNotes]       = useState({});
  const [reviewing,   setReviewing]   = useState(null);
  const [uploadForm,  setUploadForm]  = useState({ modality: 'xray', providerNote: '', file: null });
  const [uploading,   setUploading]   = useState(false);
  const [doctorForm,  setDoctorForm]  = useState({ name: '', email: '', password: '', specialization: '', phone: '' });
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [viewAnnotation, setViewAnnotation] = useState(null); // annotation being previewed
  const [qualityStats,   setQualityStats]   = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    api.get('/annotations')
      .then(({ data }) => setAnnotations(data))
      .finally(() => setLoading(false));
  }, []);

  // Draw annotations on canvas when modal opens
  const drawAnnotations = useCallback((annotation) => {
    const canvas = canvasRef.current;
    if (!canvas || !annotation) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = annotation.image?.url;
    img.onload = () => {
      canvas.width  = img.naturalWidth  || 720;
      canvas.height = img.naturalHeight || 520;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      annotation.labels?.forEach(label => {
        if (label.type === 'bbox') {
          const [x, y, w, h] = label.coordinates;
          // Box
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth   = Math.max(2, canvas.width / 300);
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = 'rgba(59,130,246,0.10)';
          ctx.fillRect(x, y, w, h);
          // Label tag
          ctx.fillStyle = '#3b82f6';
          const fontSize = Math.max(12, canvas.width / 55);
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          const textW = ctx.measureText(label.category).width + 12;
          ctx.fillRect(x, y - fontSize - 6, textW, fontSize + 6);
          ctx.fillStyle = '#fff';
          ctx.fillText(label.category, x + 6, y - 5);
        } else if (label.type === 'polygon') {
          // Freehand pen strokes stored as flat [x1,y1,x2,y2,...]
          const pts = label.coordinates;
          if (pts.length < 4) return;
          ctx.beginPath();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth   = Math.max(2, canvas.width / 300);
          ctx.lineJoin    = 'round';
          ctx.lineCap     = 'round';
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.stroke();
          // Label at start
          ctx.fillStyle = '#f59e0b';
          const fontSize = Math.max(11, canvas.width / 60);
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          ctx.fillText(label.category, pts[0] + 4, pts[1] - 4);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (viewAnnotation) drawAnnotations(viewAnnotation);
  }, [viewAnnotation, drawAnnotations]);

  const review = async (id, status) => {
    setReviewing(id + status);
    try {
      await api.patch(`/annotations/review/${id}`, { status, adminNote: notes[id] || '' });
      setAnnotations(prev => prev.map(a => a._id === id ? { ...a, status } : a));
      toast.success(`Annotation ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setNotes(prev => ({ ...prev, [id]: '' }));
    } catch {
      toast.error('Review failed. Try again.');
    } finally {
      setReviewing(null);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setCreatingDoc(true);
    try {
      await api.post('/auth/create-doctor', doctorForm);
      toast.success(`Doctor account created for ${doctorForm.name}!`);
      setDoctorForm({ name: '', email: '', password: '', specialization: '', phone: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create doctor.');
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', uploadForm.file);
      fd.append('modality', uploadForm.modality);
      fd.append('providerNote', uploadForm.providerNote);
      await api.post('/images/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Image uploaded successfully!');
      setUploadForm({ modality: 'xray', providerNote: '', file: null });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filtered = annotations.filter(a => {
    const matchSearch = a.doctor?.name?.toLowerCase().includes(search.toLowerCase()) ||
                        a.doctor?.email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || a.status === filter;
    return matchSearch && matchFilter;
  });

  const tabs = [
    { id: 'annotations', label: 'Review Annotations' },
    { id: 'upload',      label: 'Upload Images' },
    { id: 'doctors',     label: 'Create Doctor' },
    { id: 'quality',     label: '📊 Quality Dashboard' },
  ];

  const fetchQualityStats = async () => {
    setQualityLoading(true);
    try {
      const { data } = await api.get('/annotations/quality-stats');
      setQualityStats(data);
    } catch { toast.error('Failed to load quality stats.'); }
    finally { setQualityLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'quality' && !qualityStats) fetchQualityStats();
  }, [activeTab]);

  return (
    <Layout title="Admin Panel">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="card max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Upload Medical Image</h3>
              <p className="text-xs text-slate-400">JPG/PNG, max 5MB</p>
            </div>
          </div>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Image Type</label>
              <select value={uploadForm.modality} onChange={e => setUploadForm({ ...uploadForm, modality: e.target.value })}
                className="input">
                <option value="xray">🦴 X-Ray</option>
                <option value="mri">🧠 MRI</option>
                <option value="ct">🫁 CT Scan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Note for Doctor</label>
              <input placeholder="e.g. Focus on lower left lobe" value={uploadForm.providerNote}
                onChange={e => setUploadForm({ ...uploadForm, providerNote: e.target.value })}
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select File</label>
              <input type="file" accept="image/*"
                onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" required />
            </div>
            <button type="submit" disabled={uploading} className="btn-primary flex items-center gap-2">
              {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />Uploading...</> : <><Upload size={16} />Upload Image</>}
            </button>
          </form>
        </div>
      )}

      {/* Annotations Tab */}
      {activeTab === 'annotations' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search by doctor name or email..." value={search}
                onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
            </div>
            <div className="flex gap-2">
              {['all', 'submitted', 'approved', 'rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
                    ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'}`}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Image', 'Doctor', 'Labels', 'Confidence', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array(6).fill(0).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <div className="text-4xl mb-3">📋</div>
                      <p className="font-medium">No annotations found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filter</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(a => (
                    <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <img src={a.image?.url} alt="task"
                          className="w-14 h-10 object-cover rounded-lg border border-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setViewAnnotation(a)} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">{a.doctor?.name}</p>
                        <p className="text-xs text-slate-400">{a.doctor?.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">{a.labels?.length} label(s)</span>
                        {a.difficulty && (
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium
                            ${a.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                              a.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'}`}>
                            {a.difficulty}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {a.confidenceScore !== null && a.confidenceScore !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                a.confidenceScore >= 0.6 ? 'bg-emerald-500' :
                                a.confidenceScore >= 0.3 ? 'bg-amber-500' : 'bg-red-500'
                              }`} style={{ width: `${a.confidenceScore * 100}%` }} />
                            </div>
                            <span className="text-xs text-slate-600">{Math.round(a.confidenceScore * 100)}%</span>
                            {a.flagged && <span title="Low confidence" className="text-red-500 text-xs">⚠️</span>}
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4">{statusBadge[a.status]}</td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        <div>{new Date(a.createdAt).toLocaleDateString('en-IN')}</div>
                        <BlockchainBadge txHash={a.blockchainTxHash} onChain={a.onChain} compact />
                      </td>
                      <td className="px-5 py-4">
                        {a.status === 'submitted' ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setViewAnnotation(a)}
                              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                              <Eye size={13} /> View
                            </button>
                            <input placeholder="Note..." value={notes[a._id] || ''}
                              onChange={e => setNotes(prev => ({ ...prev, [a._id]: e.target.value }))}
                              className="input text-xs py-1.5 w-28" />
                            <button onClick={() => review(a._id, 'approved')}
                              disabled={reviewing === a._id + 'approved'}
                              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                              {reviewing === a._id + 'approved'
                                ? <RefreshCw size={12} className="spinner" />
                                : <CheckCircle size={13} />} Approve
                            </button>
                            <button onClick={() => review(a._id, 'rejected')}
                              disabled={reviewing === a._id + 'rejected'}
                              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                              {reviewing === a._id + 'rejected'
                                ? <RefreshCw size={12} className="spinner" />
                                : <XCircle size={13} />} Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setViewAnnotation(a)}
                              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                              <Eye size={13} /> View
                            </button>
                            <span className="text-xs text-slate-400 italic">Reviewed</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Create Doctor Tab */}
      {activeTab === 'doctors' && (
        <div className="card max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <UserPlus size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Create Doctor Account</h3>
              <p className="text-xs text-slate-400">Only admins can create doctor accounts</p>
            </div>
          </div>
          <form onSubmit={handleCreateDoctor} className="space-y-4">
            {[{ label: 'Full Name', key: 'name', placeholder: 'Dr. John Smith' },
              { label: 'Email',    key: 'email', placeholder: 'doctor@hospital.com', type: 'email' },
              { label: 'Password', key: 'password', placeholder: 'Min. 6 characters', type: 'password' },
              { label: 'Specialization', key: 'specialization', placeholder: 'e.g. Radiologist' },
              { label: 'Phone', key: 'phone', placeholder: '+91 9999999999' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                <input type={f.type || 'text'} placeholder={f.placeholder}
                  value={doctorForm[f.key]}
                  onChange={e => setDoctorForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  required={['name','email','password'].includes(f.key)}
                  className="input w-full" />
              </div>
            ))}
            <button type="submit" disabled={creatingDoc} className="btn-primary flex items-center gap-2">
              {creatingDoc
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />Creating...</>
                : <><UserPlus size={15} />Create Doctor</>}
            </button>
          </form>
        </div>
      )}

      {/* Quality Dashboard Tab */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Dataset Quality Dashboard</h3>
            <button onClick={fetchQualityStats} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {qualityLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <div key={i} className="card animate-pulse h-24" />)}
            </div>
          ) : qualityStats ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Annotations', value: qualityStats.total,          color: 'border-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700' },
                  { label: 'Rejection Rate',    value: `${qualityStats.rejectionRate}%`, color: 'border-red-500', bg: 'bg-red-50',  text: 'text-red-700' },
                  { label: 'Avg Confidence',    value: qualityStats.avgConfidenceScore !== null ? `${Math.round(qualityStats.avgConfidenceScore * 100)}%` : 'N/A', color: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                  { label: 'Flagged',           value: qualityStats.flagged,         color: 'border-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700' },
                ].map(c => (
                  <div key={c.label} className={`card border-l-4 ${c.color} ${c.bg}`}>
                    <p className={`text-2xl font-bold ${c.text}`}>{c.value}</p>
                    <p className="text-sm text-slate-500 mt-1">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Difficulty Breakdown */}
              <div className="card">
                <h4 className="font-semibold text-slate-800 mb-4">Difficulty Breakdown</h4>
                <div className="flex gap-6">
                  {Object.entries(qualityStats.difficulty || {}).map(([d, count]) => (
                    <div key={d} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        d === 'easy' ? 'bg-emerald-500' : d === 'hard' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      <span className="text-sm capitalize text-slate-600">{d}:</span>
                      <span className="font-bold text-slate-800">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  {['easy','medium','hard'].map(d => {
                    const count = qualityStats.difficulty?.[d] || 0;
                    const pct   = qualityStats.total ? (count / qualityStats.total) * 100 : 0;
                    return pct > 0 ? (
                      <div key={d} className={`h-full ${
                        d === 'easy' ? 'bg-emerald-500' : d === 'hard' ? 'bg-red-500' : 'bg-amber-500'
                      }`} style={{ width: `${pct}%` }} />
                    ) : null;
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Doctors */}
                <div className="card">
                  <h4 className="font-semibold text-slate-800 mb-4">🏆 Top Performing Doctors</h4>
                  <div className="space-y-3">
                    {qualityStats.topDoctors?.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs w-4">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{d.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.approvalRate}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{d.approvalRate}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{d.approved}/{d.total}</p>
                          {d.avgConf !== null && <p className="text-xs text-purple-600">{Math.round(d.avgConf * 100)}% conf</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Low Quality Annotations */}
                <div className="card">
                  <h4 className="font-semibold text-slate-800 mb-4">⚠️ Low Quality Annotations</h4>
                  <div className="space-y-2">
                    {qualityStats.lowQuality?.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No low quality annotations 🎉</p>
                    ) : qualityStats.lowQuality?.map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{a.doctor || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">
                            {a.flagged ? '⚠️ Flagged' : ''} {a.status}
                          </p>
                        </div>
                        <div className="text-right">
                          {a.confidenceScore !== null ? (
                            <span className="text-xs font-bold text-red-600">{Math.round(a.confidenceScore * 100)}% conf</span>
                          ) : <span className="text-xs text-slate-400">unscored</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <p>Click Refresh to load quality stats</p>
            </div>
          )}
        </div>
      )}

      {/* Annotation Viewer Modal */}
      {viewAnnotation && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewAnnotation(null)}>
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <ZoomIn size={18} className="text-blue-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Annotation Review</p>
                  <p className="text-slate-400 text-xs">Dr. {viewAnnotation.doctor?.name} · {viewAnnotation.image?.modality?.toUpperCase()} · {viewAnnotation.labels?.length} label(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {viewAnnotation.status === 'submitted' && (
                  <>
                    <input placeholder="Admin note..." value={notes[viewAnnotation._id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [viewAnnotation._id]: e.target.value }))}
                      className="bg-slate-700 border border-slate-600 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500 w-40" />
                    <button
                      onClick={() => { review(viewAnnotation._id, 'approved'); setViewAnnotation(null); }}
                      disabled={reviewing === viewAnnotation._id + 'approved'}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button
                      onClick={() => { review(viewAnnotation._id, 'rejected'); setViewAnnotation(null); }}
                      disabled={reviewing === viewAnnotation._id + 'rejected'}
                      className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      <XCircle size={13} /> Reject
                    </button>
                  </>
                )}
                <button onClick={() => setViewAnnotation(null)} className="text-slate-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Canvas */}
              <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4">
                <canvas ref={canvasRef}
                  className="max-w-full max-h-full rounded-lg shadow-xl"
                  style={{ maxHeight: 'calc(90vh - 160px)' }}
                />
              </div>

              {/* Side info */}
              <div className="w-56 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto flex-shrink-0">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Labels</p>
                <div className="space-y-2 mb-5">
                  {viewAnnotation.labels?.map((l, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                      ${l.type === 'bbox' ? 'bg-blue-600/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      <span>{l.type === 'bbox' ? '⬜' : '✏️'}</span>
                      <span className="capitalize">{l.category}</span>
                      <span className="ml-auto text-slate-500">{l.type === 'bbox' ? 'box' : 'pen'}</span>
                    </div>
                  ))}
                </div>

                {viewAnnotation.doctorNotes && (
                  <>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Doctor Notes</p>
                    <p className="text-slate-300 text-xs leading-relaxed bg-slate-700/50 rounded-lg p-3">
                      {viewAnnotation.doctorNotes}
                    </p>
                  </>
                )}

                {viewAnnotation.adminNote && (
                  <>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2 mt-4">Admin Note</p>
                    <p className="text-slate-300 text-xs leading-relaxed bg-slate-700/50 rounded-lg p-3">
                      {viewAnnotation.adminNote}
                    </p>
                  </>
                )}

                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Info</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status</span>
                      <span>{statusBadge[viewAnnotation.status]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payout</span>
                      <span className="text-emerald-400 font-semibold">₹{viewAnnotation.payoutAmount}</span>
                    </div>
                    {viewAnnotation.difficulty && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Difficulty</span>
                        <span className={`font-semibold capitalize ${
                          viewAnnotation.difficulty === 'easy' ? 'text-emerald-400' :
                          viewAnnotation.difficulty === 'hard' ? 'text-red-400' : 'text-amber-400'
                        }`}>{viewAnnotation.difficulty}</span>
                      </div>
                    )}
                    {viewAnnotation.confidenceScore !== null && viewAnnotation.confidenceScore !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Confidence</span>
                        <span className={`font-semibold ${
                          viewAnnotation.confidenceScore >= 0.6 ? 'text-emerald-400' :
                          viewAnnotation.confidenceScore >= 0.3 ? 'text-amber-400' : 'text-red-400'
                        }`}>{Math.round(viewAnnotation.confidenceScore * 100)}%</span>
                      </div>
                    )}
                    {viewAnnotation.flagged && (
                      <div className="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-lg text-center">
                        ⚠️ Low confidence — needs attention
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date</span>
                      <span className="text-slate-300">{new Date(viewAnnotation.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="pt-1">
                      <BlockchainBadge txHash={viewAnnotation.blockchainTxHash} onChain={viewAnnotation.onChain} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
