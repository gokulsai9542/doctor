import { useRef, useState, useEffect, useCallback } from 'react';

export default function AnnotationCanvas({ imageUrl, onBoxesChange, category = 'lesion', tool = 'box', aiSuggestions = [] }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(new Image());
  const [drawing,  setDrawing]  = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [boxes,    setBoxes]    = useState([]);
  const [paths,    setPaths]    = useState([]);
  const [curPath,  setCurPath]  = useState([]);
  const [feedback, setFeedback] = useState(null); // real-time hint

  const COLORS = { box: '#3b82f6', pen: '#f59e0b', ai: '#a855f7', aiLow: '#ef4444' };

  const redraw = useCallback((bxs, pths, suggestions, previewBox = null, activePath = []) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    // Draw AI suggestions (dashed purple)
    suggestions.forEach(s => {
      const color = s.confidence >= 0.6 ? COLORS.ai : COLORS.aiLow;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.setLineDash([]);
      ctx.fillStyle = color + '18';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      // AI label
      ctx.fillStyle = color;
      ctx.font = '11px Inter, sans-serif';
      const tag = `AI ${Math.round(s.confidence * 100)}%`;
      const tw  = ctx.measureText(tag).width + 8;
      ctx.fillRect(s.x, s.y - 18, tw, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(tag, s.x + 4, s.y - 4);
    });

    // Draw doctor bounding boxes
    bxs.forEach(b => {
      ctx.strokeStyle = COLORS.box;
      ctx.lineWidth   = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = COLORS.box;
      const tw = ctx.measureText(b.category).width + 10;
      ctx.fillRect(b.x, b.y - 20, tw, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(b.category, b.x + 5, b.y - 5);
      ctx.fillStyle = 'rgba(59,130,246,0.08)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    // Preview box
    if (previewBox) {
      ctx.strokeStyle = COLORS.box;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(previewBox.x, previewBox.y, previewBox.w, previewBox.h);
      ctx.setLineDash([]);
    }

    // Pen paths
    pths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = COLORS.pen;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.fillStyle = COLORS.pen;
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(path.category, path.points[0].x + 4, path.points[0].y - 4);
    });

    // Active pen stroke
    if (activePath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = COLORS.pen;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.moveTo(activePath[0].x, activePath[0].y);
      activePath.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    imgRef.current.crossOrigin = 'anonymous';
    imgRef.current.src = imageUrl;
    imgRef.current.onload = () => redraw([], [], aiSuggestions);
  }, [imageUrl]);

  useEffect(() => {
    redraw(boxes, paths, aiSuggestions);
  }, [aiSuggestions]);

  useEffect(() => {
    onBoxesChange?.({ boxes, paths });
  }, [boxes, paths]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  // Real-time feedback: check IoU with AI suggestions while drawing
  const checkFeedback = (box) => {
    if (!aiSuggestions.length) { setFeedback(null); return; }
    const bestIoU = Math.max(...aiSuggestions.map(s => iou(box, s)));
    if (bestIoU > 0.6)       setFeedback({ type: 'good',    text: '✅ High confidence region' });
    else if (bestIoU > 0.3)  setFeedback({ type: 'medium',  text: '⚠️ Partial match with AI' });
    else                     setFeedback({ type: 'mismatch', text: '🔴 Mismatch with AI prediction' });
  };

  const iou = (a, b) => {
    const ix1 = Math.max(a.x, b.x), iy1 = Math.max(a.y, b.y);
    const ix2 = Math.min(a.x + a.w, b.x + b.w), iy2 = Math.min(a.y + a.h, b.y + b.h);
    const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
    if (!inter) return 0;
    return inter / (a.w * a.h + b.w * b.h - inter);
  };

  const onMouseDown = (e) => {
    setDrawing(true);
    const pos = getPos(e);
    tool === 'box' ? setStartPos(pos) : setCurPath([pos]);
  };

  const onMouseMove = (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    if (tool === 'box' && startPos) {
      const preview = { x: Math.min(startPos.x, pos.x), y: Math.min(startPos.y, pos.y), w: Math.abs(pos.x - startPos.x), h: Math.abs(pos.y - startPos.y) };
      redraw(boxes, paths, aiSuggestions, preview, []);
      if (preview.w > 20 && preview.h > 20) checkFeedback(preview);
    } else if (tool === 'pen') {
      const updated = [...curPath, pos];
      setCurPath(updated);
      redraw(boxes, paths, aiSuggestions, null, updated);
    }
  };

  const onMouseUp = (e) => {
    if (!drawing) return;
    setDrawing(false);
    const pos = getPos(e);
    if (tool === 'box' && startPos) {
      const w = Math.abs(pos.x - startPos.x), h = Math.abs(pos.y - startPos.y);
      if (w > 5 && h > 5) {
        const newBox = { x: Math.min(startPos.x, pos.x), y: Math.min(startPos.y, pos.y), w, h, category };
        const updated = [...boxes, newBox];
        setBoxes(updated);
        redraw(updated, paths, aiSuggestions);
      }
      setStartPos(null);
    } else if (tool === 'pen' && curPath.length > 2) {
      const updated = [...paths, { points: curPath, category }];
      setPaths(updated);
      setCurPath([]);
      redraw(boxes, updated, aiSuggestions, null, []);
    }
    setTimeout(() => setFeedback(null), 2000);
  };

  // Accept an AI suggestion as a doctor box
  const acceptSuggestion = (s) => {
    const newBox = { x: s.x, y: s.y, w: s.w, h: s.h, category: s.category || category };
    const updated = [...boxes, newBox];
    setBoxes(updated);
    redraw(updated, paths, aiSuggestions);
  };

  const handleUndo = () => {
    if (tool === 'box' && boxes.length > 0) {
      const u = boxes.slice(0, -1); setBoxes(u); redraw(u, paths, aiSuggestions);
    } else if (tool === 'pen' && paths.length > 0) {
      const u = paths.slice(0, -1); setPaths(u); redraw(boxes, u, aiSuggestions);
    }
  };

  const handleClear = () => { setBoxes([]); setPaths([]); setCurPath([]); redraw([], [], aiSuggestions); };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Real-time feedback */}
      {feedback && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
          ${feedback.type === 'good'    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            feedback.type === 'medium'  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                          'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
          {feedback.text}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={720} height={520}
        className="rounded-xl border-2 border-slate-700 max-w-full shadow-2xl cursor-crosshair"
        style={{ maxHeight: 'calc(100vh - 240px)', objectFit: 'contain' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}    onMouseLeave={onMouseUp}
        onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp}
      />

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button onClick={handleUndo} disabled={boxes.length + paths.length === 0}
          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg disabled:opacity-30">
          ↩ Undo
        </button>
        <button onClick={handleClear} disabled={boxes.length + paths.length === 0}
          className="text-xs px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg disabled:opacity-30">
          🗑 Clear
        </button>
        <span className="text-slate-500 text-xs">{boxes.length} box · {paths.length} stroke</span>
        {aiSuggestions.length > 0 && (
          <span className="text-purple-400 text-xs">{aiSuggestions.length} AI suggestion(s)</span>
        )}
      </div>

      {/* AI suggestion accept buttons */}
      {aiSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {aiSuggestions.map((s, i) => (
            <button key={i} onClick={() => acceptSuggestion(s)}
              className="text-xs px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-lg transition-colors">
              ✓ Accept AI Box {i + 1} ({Math.round(s.confidence * 100)}%)
            </button>
          ))}
          <button onClick={() => { aiSuggestions.forEach(s => acceptSuggestion(s)); }}
            className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            ✓ Accept All
          </button>
        </div>
      )}
    </div>
  );
}
