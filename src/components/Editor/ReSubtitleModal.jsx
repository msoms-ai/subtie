import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, PlayCircle } from 'lucide-react';

export default function ReSubtitleModal({ isOpen, onClose, project, videoDurationSeconds, onComplete, isAr }) {
  const [chunks, setChunks] = useState([]);
  const [selectedChunks, setSelectedChunks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen || !project?.subtitles) return;
    
    const chunkDuration = 120;
    const totalChunks = Math.max(1, Math.ceil(videoDurationSeconds / chunkDuration));
    
    let generatedChunks = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkDuration;
      const end = (i + 1) * chunkDuration;
      
      const chunkSubs = project.subtitles.filter(s => (s.startSeconds >= start && s.startSeconds < end));
      
      let suspicious = false;
      if (chunkSubs.length === 0) {
        suspicious = true; // Completely empty chunk is highly suspicious
      } else {
        // Check for large gaps > 15 seconds
        for (let j = 0; j < chunkSubs.length - 1; j++) {
          const gap = chunkSubs[j+1].startSeconds - chunkSubs[j].endSeconds;
          if (gap > 15) suspicious = true;
        }
      }

      generatedChunks.push({
        index: i,
        start,
        end,
        subCount: chunkSubs.length,
        suspicious
      });
    }
    
    setChunks(generatedChunks);
    setSelectedChunks(generatedChunks.filter(c => c.suspicious).map(c => c.index));
  }, [isOpen, project, videoDurationSeconds]);

  if (!isOpen) return null;

  const handleToggle = (idx) => {
    if (selectedChunks.includes(idx)) {
      setSelectedChunks(selectedChunks.filter(i => i !== idx));
    } else {
      setSelectedChunks([...selectedChunks, idx]);
    }
  };

  const handleProcess = async () => {
    if (selectedChunks.length === 0) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch(`/api/project/${project.id}/resubtitle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkIndices: selectedChunks })
      });
      const data = await res.json();
      if (data.success) {
        onComplete(data.project);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Network Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 border border-purple-500/30 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-800/50">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <PlayCircle className="text-purple-400" />
            {isAr ? 'إعادة ترجمة الأجزاء المفقودة' : 'ReSubtitle Missing Lines'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition" disabled={isProcessing}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-slate-400 mb-6">
            {isAr 
              ? 'يقوم النظام بتقسيم الصوت إلى أجزاء (Chunks) مدة كل منها دقيقتين. الأجزاء المظللة باللون الأحمر تحتوي على فجوات زمنية طويلة (أكثر من 15 ثانية) وقد تشير إلى خطأ أو تجاوز من الذكاء الاصطناعي في الترجمة. حدد الأجزاء لإعادة معالجتها.'
              : 'Audio is split into 2-minute chunks. Chunks highlighted in red have suspicious gaps (>15s) indicating AI may have missed lines. Select chunks to re-process.'}
          </p>

          <div className="space-y-2">
            {chunks.map(chunk => (
              <label 
                key={chunk.index} 
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  chunk.suspicious ? 'border-red-500/50 bg-red-950/20 hover:bg-red-950/40' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    checked={selectedChunks.includes(chunk.index)}
                    onChange={() => handleToggle(chunk.index)}
                    disabled={isProcessing}
                    className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500 bg-slate-800"
                  />
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      {isAr ? `الجزء ${chunk.index + 1}` : `Chunk ${chunk.index + 1}`}
                      {chunk.suspicious && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      {formatTime(chunk.start)} - {formatTime(chunk.end)} ({120}s)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${chunk.subCount === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {chunk.subCount} {isAr ? 'أسطر' : 'lines'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-slate-800/50 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/10 transition"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || selectedChunks.length === 0}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (isAr ? 'جاري المعالجة...' : 'Processing...') : (isAr ? 'إعادة المعالجة الآن' : 'ReSubtitle Now')}
          </button>
        </div>
        
      </div>
    </div>
  );
}
