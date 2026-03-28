import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Clock, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Layout from '../components/Layout';

const modalityStyle = {
  xray: 'bg-blue-600',
  mri:  'bg-purple-600',
  ct:   'bg-orange-500',
};
const modalityIcon = { xray: '🦴', mri: '🧠', ct: '🫁' };

export default function TaskList() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [assigning, setAssigning] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/images/tasks')
      .then(({ data }) => setTasks(data))
      .finally(() => setLoading(false));
  }, []);

  const assignAndGo = async (id) => {
    setAssigning(id);
    try {
      await api.patch(`/images/assign/${id}`);
      navigate(`/annotate/${id}`);
    } catch {
      toast.error('Failed to assign task.');
      setAssigning(null);
    }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.modality === filter);

  return (
    <Layout title="Annotation Tasks">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-slate-500 text-sm">{tasks.length} task(s) available</p>
        <div className="flex gap-2">
          {['all', 'xray', 'mri', 'ct'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${filter === f ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'}`}>
              {f === 'all' ? 'All' : `${modalityIcon[f]} ${f.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
              <div className="h-44 bg-slate-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-3 bg-slate-100 rounded w-32" />
                <div className="h-9 bg-slate-200 rounded-lg mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-slate-700 font-semibold text-lg mb-2">No tasks available</h3>
          <p className="text-slate-400 text-sm max-w-xs">
            {filter !== 'all' ? `No ${filter.toUpperCase()} tasks right now. Try a different filter.` : 'Check back later for new annotation tasks.'}
          </p>
        </div>
      )}

      {/* Task Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(task => (
            <div key={task._id}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
              {/* Image */}
              <div className="relative">
                <img src={task.url} alt="medical" className="w-full h-44 object-cover" />
                <span className={`absolute top-2.5 left-2.5 text-white text-xs font-bold px-2.5 py-1 rounded-full ${modalityStyle[task.modality]}`}>
                  {modalityIcon[task.modality]} {task.modality.toUpperCase()}
                </span>
                <span className="absolute top-2.5 right-2.5 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  ₹5
                </span>
              </div>

              {/* Body */}
              <div className="p-4">
                {task.uploadedBy && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2">
                    <Building2 size={12} />
                    {task.uploadedBy.organization || task.uploadedBy.name}
                  </div>
                )}
                {task.providerNote && (
                  <div className="bg-amber-50 border-l-2 border-amber-400 text-amber-700 text-xs px-2.5 py-1.5 rounded-r-lg mb-3">
                    {task.providerNote}
                  </div>
                )}
                <div className="flex items-center gap-1 text-slate-400 text-xs mb-3">
                  <Clock size={11} />
                  {new Date(task.createdAt).toLocaleDateString('en-IN')}
                </div>
                <button onClick={() => assignAndGo(task._id)} disabled={assigning === task._id}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm">
                  {assigning === task._id
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />
                    : <PenLine size={14} />}
                  {assigning === task._id ? 'Loading...' : 'Start Annotation'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
