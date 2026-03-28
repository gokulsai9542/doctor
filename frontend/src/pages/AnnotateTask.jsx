import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Tag, Info, Square, PenLine, Search, X, StickyNote, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import AnnotationCanvas from '../components/AnnotationCanvas';
import BlockchainBadge from '../components/BlockchainBadge';

const modalityColor = {
  xray: 'bg-blue-100 text-blue-700',
  mri:  'bg-purple-100 text-purple-700',
  ct:   'bg-orange-100 text-orange-700',
};

// Reference image sources per modality
const REFERENCE_SOURCES = {
  xray: [
    { label: 'Radiopaedia X-Ray',  url: 'https://radiopaedia.org/search?utf8=%E2%9C%93&q={query}&scope=cases&lang=us' },
    { label: 'NIH Chest X-Ray',    url: 'https://www.nih.gov/news-events/news-releases/nih-clinical-center-provides-one-largest-publicly-available-chest-x-ray-datasets' },
  ],
  mri: [
    { label: 'Radiopaedia MRI',    url: 'https://radiopaedia.org/search?utf8=%E2%9C%93&q={query}&scope=cases&lang=us' },
    { label: 'The Whole Brain Atlas', url: 'https://www.med.harvard.edu/aanlib/home.html' },
  ],
  ct: [
    { label: 'Radiopaedia CT',     url: 'https://radiopaedia.org/search?utf8=%E2%9C%93&q={query}&scope=cases&lang=us' },
    { label: 'TCIA Collections',   url: 'https://www.cancerimagingarchive.net/collections/' },
  ],
};

export default function AnnotateTask() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [image,      setImage]      = useState(null);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [annotation, setAnnotation] = useState({ boxes: [], paths: [] });
  const [category,   setCategory]   = useState('lesion');
  const [tool,       setTool]       = useState('box');
  const [notes,      setNotes]      = useState('');
  const [showRef,    setShowRef]    = useState(false);
  const [refQuery,   setRefQuery]   = useState('');
  const [refResults, setRefResults] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [showNotes,  setShowNotes]  = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiConfidence,  setAiConfidence]  = useState(null);
  const [aiSource,      setAiSource]      = useState(null);
  const [difficulty,    setDifficulty]    = useState(null);
  const [aiDiseases,    setAiDiseases]    = useState([]);
  const [savedTxHash,   setSavedTxHash]   = useState(null);
  const [savedOnChain,  setSavedOnChain]  = useState(false);

  useEffect(() => {
    api.get(`/images/${id}`)
      .then(({ data }) => {
        setImage(data);
        setRefQuery(data.modality);
        fetchAiSuggestions(data.url, data.modality);
      })
      .catch(() => setError('Failed to load image.'));
  }, [id]);

  const fetchAiSuggestions = async (imageUrl, modality) => {
    setAiLoading(true);
    try {
      const { data } = await api.post('/ai/suggest', { imageUrl, modality });
      const boxes      = data.boxes      || [];
      const confidence = typeof data.confidence === 'number' ? data.confidence : 0;
      const source     = data.source     || 'unknown';
      const diseases   = data.diseases   || [];

      setAiSuggestions(boxes);
      setAiConfidence(confidence);
      setAiSource(source);
      setAiDiseases(diseases);
      setDifficulty(confidence >= 0.75 ? 'easy' : confidence >= 0.45 ? 'medium' : 'hard');

      if (diseases.length > 0) {
        toast.success(`AI suggests: ${diseases[0].disease} (${Math.round(diseases[0].confidence * 100)}%)`, { icon: '🤖' });
      }
    } catch (err) {
      console.error('[AI Suggest]', err);
      setAiSuggestions([]);
      setAiConfidence(0);
      setAiSource('error');
      setAiDiseases([]);
    } finally {
      setAiLoading(false);
    }
  };

  // Search reference images via Unsplash (free, no key needed for demo)
  const searchRefImages = async () => {
    if (!refQuery.trim()) return;
    setRefLoading(true);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=medical+${refQuery}&per_page=9&client_id=demo`
      );
      // Fallback: use static radiopaedia search if unsplash fails
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRefResults(data.results || []);
    } catch {
      // Show reference links instead
      setRefResults([]);
    } finally {
      setRefLoading(false);
    }
  };

  const totalAnnotations = annotation.boxes.length + annotation.paths.length;

  const handleSave = async () => {
    if (totalAnnotations === 0) return toast.error('Please draw at least one annotation.');
    setSaving(true);
    try {
      const labels = [
        ...annotation.boxes.map(b => ({
          category: b.category,
          type: 'bbox',
          coordinates: [b.x, b.y, b.w, b.h],
        })),
        ...annotation.paths.map(p => ({
          category: p.category,
          type: 'polygon',
          coordinates: p.points.flatMap(pt => [pt.x, pt.y]),
        })),
      ];
      const res = await api.post('/annotations', { imageId: id, labels, notes, aiSuggestions, aiConfidence });
      setSavedTxHash(res.data.blockchainTxHash || null);
      setSavedOnChain(res.data.onChain || false);
      toast.success('Annotation saved successfully!');
      setTimeout(() => navigate('/tasks'), 1500);
    } catch {
      toast.error('Failed to save annotation.');
    } finally {
      setSaving(false);
    }
  };

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="card text-center max-w-sm">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-slate-700 font-medium mb-4">{error}</p>
        <button onClick={() => navigate('/tasks')} className="btn-secondary">← Back to Tasks</button>
      </div>
    </div>
  );

  if (!image) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full spinner" />
      <span className="text-slate-600">Loading image...</span>
    </div>
  );

  const refSources = REFERENCE_SOURCES[image.modality] || REFERENCE_SOURCES.xray;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="h-4 w-px bg-slate-600" />
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${modalityColor[image.modality]}`}>
          {image.modality.toUpperCase()}
        </span>
        <span className="text-slate-300 text-sm font-medium">Annotation Tool</span>

        {/* Tool switcher in topbar */}
        <div className="flex gap-1 bg-slate-700 p-1 rounded-lg ml-2">
          <button onClick={() => setTool('box')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${tool === 'box' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Square size={13} /> Box
          </button>
          <button onClick={() => setTool('pen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${tool === 'pen' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            <PenLine size={13} /> Pen
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Notes toggle */}
          <button onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${showNotes ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}>
            <StickyNote size={13} /> Notes {notes && '●'}
          </button>
          {/* Reference images toggle */}
          <button onClick={() => setShowRef(!showRef)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${showRef ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}>
            <Search size={13} /> Reference
          </button>
        </div>
      </div>

      {/* Provider note */}
      {image.providerNote && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs px-5 py-2 flex items-center gap-2">
          <Info size={13} /> {image.providerNote}
        </div>
      )}

      {/* Notes bar */}
      {showNotes && (
        <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center gap-3">
          <StickyNote size={15} className="text-emerald-400 flex-shrink-0" />
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add your clinical notes here (findings, observations, recommendations)..."
            className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
          />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left — Canvas */}
        <div className="flex-1 flex items-center justify-center bg-slate-900 p-4 overflow-auto">
          <AnnotationCanvas
            imageUrl={image.url}
            onBoxesChange={setAnnotation}
            category={category}
            tool={tool}
            aiSuggestions={aiSuggestions}
          />
        </div>

        {/* Right — Tools Panel */}
        <div className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-semibold text-sm">Tools</h3>
          </div>

          <div className="p-4 space-y-5 flex-1 overflow-y-auto">
            {/* Active tool indicator */}
            <div className={`rounded-lg px-3 py-2.5 text-xs font-medium flex items-center gap-2
              ${tool === 'box' ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              {tool === 'box' ? <><Square size={13} /> Draw bounding box — click &amp; drag</> : <><PenLine size={13} /> Freehand pen — draw freely</>}
            </div>

            {/* AI Status */}
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">🤖 AI Analysis</p>
              {aiLoading ? (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full spinner" />
                  <span className="text-purple-300 text-xs">Analyzing image...</span>
                </div>
              ) : (
                <div className="bg-slate-700/50 rounded-lg px-3 py-2.5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Regions found</span>
                    <span className={`font-bold ${aiSuggestions.length > 0 ? 'text-purple-300' : 'text-slate-500'}`}>
                      {aiSuggestions.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Confidence</span>
                    <span className={`font-bold ${
                      aiConfidence >= 0.75 ? 'text-emerald-400' :
                      aiConfidence >= 0.45 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {aiConfidence !== null ? `${Math.round(aiConfidence * 100)}%` : '—'}
                    </span>
                  </div>
                  {difficulty && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Difficulty</span>
                      <span className={`font-bold capitalize ${
                        difficulty === 'easy'   ? 'text-emerald-400' :
                        difficulty === 'medium' ? 'text-amber-400'   : 'text-red-400'
                      }`}>{difficulty}</span>
                    </div>
                  )}
                  {aiSource && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Source</span>
                      <span className="text-slate-500 capitalize">{aiSource.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Disease Suggestions */}
              {!aiLoading && aiDiseases.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">🧬 Disease Predictions</p>
                  {aiDiseases.slice(0, 4).map(({ disease, confidence: c }) => (
                    <div key={disease}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span
                          className={`font-medium cursor-pointer hover:text-blue-300 transition-colors ${
                            c >= 0.5 ? 'text-white' : 'text-slate-400'
                          }`}
                          onClick={() => c >= 0.3 && setCategory(disease.toLowerCase().replace(' ', '_'))}
                          title="Click to use as label"
                        >
                          {disease}
                        </span>
                        <span className={`font-bold ${
                          c >= 0.6 ? 'text-red-400' : c >= 0.35 ? 'text-amber-400' : 'text-slate-500'
                        }`}>{Math.round(c * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all ${
                            c >= 0.6 ? 'bg-red-500' : c >= 0.35 ? 'bg-amber-500' : 'bg-slate-600'
                          }`}
                          style={{ width: `${Math.round(c * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-slate-600 text-xs mt-1">Click a disease to use as label</p>
                </div>
              )}

              {!aiLoading && aiDiseases.length > 0 && (
                <div className="">
                  <button
                    onClick={() => image && fetchAiSuggestions(image.url, image.modality)}
                    className="w-full text-xs py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg transition-colors mt-1">
                    🔄 Re-analyze
                  </button>
                </div>
              )}
            </div>

            {/* Label */}
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
                <Tag size={11} className="inline mr-1" />Label
              </p>
              <input value={category} onChange={e => setCategory(e.target.value)}
                placeholder="e.g. lesion, tumor..."
                className="w-full bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['lesion', 'tumor', 'nodule', 'fracture', 'normal'].map(l => (
                  <button key={l} onClick={() => setCategory(l)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors
                      ${category === l ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Annotation count */}
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">Annotations</p>
              <div className="bg-slate-700/50 rounded-lg px-3 py-2.5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-300 flex items-center gap-1"><Square size={11} /> Boxes</span>
                  <span className="text-white font-bold">{annotation.boxes.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300 flex items-center gap-1"><PenLine size={11} /> Strokes</span>
                  <span className="text-white font-bold">{annotation.paths.length}</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-700/30 rounded-lg p-3">
              <p className="text-slate-400 text-xs font-medium mb-2">How to annotate</p>
              <ol className="text-slate-500 text-xs space-y-1 list-decimal list-inside">
                <li>Pick Box or Pen tool above</li>
                <li>Set a label</li>
                <li>Draw on the image</li>
                <li>Add notes if needed</li>
                <li>Click Save when done</li>
              </ol>
            </div>
          </div>

          {/* Save */}
          <div className="p-4 border-t border-slate-700 space-y-2">
            {/* Blockchain status after save */}
            {(savedTxHash || savedOnChain) && (
              <div className="flex justify-center">
                <BlockchainBadge txHash={savedTxHash} onChain={savedOnChain} />
              </div>
            )}
            <button onClick={handleSave} disabled={saving || totalAnnotations === 0}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> : <Save size={15} />}
              {saving ? 'Saving...' : `Save (${totalAnnotations})`}
            </button>
          </div>
        </div>
      </div>

      {/* Reference Image Panel — slides in from bottom */}
      {showRef && (
        <div className="absolute inset-x-0 bottom-0 bg-slate-800 border-t border-slate-700 z-30"
          style={{ height: '320px' }}>
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-700">
            <Search size={15} className="text-purple-400" />
            <span className="text-white text-sm font-medium">Reference Images</span>
            <div className="flex gap-2 ml-2 flex-1">
              <input
                value={refQuery}
                onChange={e => setRefQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchRefImages()}
                placeholder="Search medical images..."
                className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
              />
              <button onClick={searchRefImages} disabled={refLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-1.5 rounded-lg transition-colors">
                {refLoading ? '...' : 'Search'}
              </button>
            </div>
            <button onClick={() => setShowRef(false)} className="text-slate-400 hover:text-white ml-2">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto h-full">
            {/* Reference source links */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="text-slate-400 text-xs self-center">Open in:</span>
              {refSources.map(src => (
                <a key={src.label}
                  href={src.url.replace('{query}', encodeURIComponent(refQuery || image.modality))}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
                  <ExternalLink size={11} /> {src.label}
                </a>
              ))}
              <a href={`https://www.google.com/search?q=${encodeURIComponent('medical ' + refQuery + ' radiology')}&tbm=isch`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
                <ExternalLink size={11} /> Google Images
              </a>
            </div>

            {refResults.length > 0 ? (
              <div className="grid grid-cols-6 gap-2">
                {refResults.map(img => (
                  <a key={img.id} href={img.links?.html} target="_blank" rel="noopener noreferrer"
                    className="relative group rounded-lg overflow-hidden border border-slate-700 hover:border-purple-500 transition-colors">
                    <img src={img.urls?.small} alt={img.alt_description}
                      className="w-full h-20 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ExternalLink size={14} className="text-white" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs text-center py-4">
                Use the links above to open reference databases in a new tab, or search to find images.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
