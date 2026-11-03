import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, PlayCircle, RefreshCw, Scissors, CheckCircle2, Layers } from 'lucide-react';

export default function ReSubtitleModal({ isOpen, onClose, project, videoDurationSeconds, onComplete, isAr }) {
  const [chunks, setChunks] = useState([]);
  const [selectedChunks, setSelectedChunks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRechunking, setIsRechunking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

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

  const handleSelectAll = () => {
    if (selectedChunks.length === chunks.length) {
      setSelectedChunks([]);
    } else {
      setSelectedChunks(chunks.map(c => c.index));
    }
  };

  const handleSelectSuspiciousOnly = () => {
    setSelectedChunks(chunks.filter(c => c.suspicious).map(c => c.index));
  };

  const handleRechunkOnly = async () => {
    setIsRechunking(true);
    setStatusMessage(isAr ? 'جاري إعادة تجزئة الصوت بالكامل إلى مقاطع دقيقتين...' : 'Re-chunking audio into fresh 2-minute segments...');
    try {
      const res = await fetch(`/api/project/${project.id}/rechunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(isAr ? `تمت إعادة تجزئة الصوت بنجاح (${data.chunkCount} مقطع)` : `Audio re-chunked successfully into ${data.chunkCount} chunks!`);
        // If there are newly created chunks, refresh our chunk indices
        const allIndices = Array.from({ length: data.chunkCount }, (_, i) => i);
        setSelectedChunks(allIndices);
        setTimeout(() => setStatusMessage(''), 4500);
      } else {
        alert(isAr ? 'فشلت إعادة التجزئة: ' + data.error : 'Re-chunk failed: ' + data.error);
        setStatusMessage('');
      }
    } catch (err) {
      alert(isAr ? 'خطأ في الاتصال بالخادم أثناء إعادة التجزئة' : 'Network error during audio rechunk');
      setStatusMessage('');
    } finally {
      setIsRechunking(false);
    }
  };

  const handleProcess = async (withRechunk = false) => {
    if (selectedChunks.length === 0 && !withRechunk) return;
    setIsProcessing(true);
    setStatusMessage(withRechunk 
      ? (isAr ? 'جاري إعادة تجزئة الصوت وإعادة الترجمة بالذكاء الاصطناعي...' : 'Re-chunking audio and resubtitling with AI...')
      : (isAr ? 'جاري إعادة الترجمة للأجزاء المحددة بالذكاء الاصطناعي...' : 'Resubtitling selected chunks with AI...')
    );
    
    try {
      const res = await fetch(`/api/project/${project.id}/resubtitle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chunkIndices: selectedChunks.length > 0 ? selectedChunks : undefined,
          rechunk: withRechunk
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(isAr ? 'تم استكمال الترجمة وتحديث الملف بنجاح!' : 'Subtitling completed & project updated!');
        setTimeout(() => {
          onComplete(data.project);
        }, 800);
      } else {
        alert(isAr ? 'خطأ: ' + data.error : 'Error: ' + data.error);
        setStatusMessage('');
      }
    } catch (err) {
      alert(isAr ? 'خطأ في الاتصال بالشبكة أثناء معالجة الترجمة' : 'Network error during resubtitling');
      setStatusMessage('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 theme-light:bg-white border-2 border-purple-500/40 theme-light:border-purple-300 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20 theme-light:border-purple-200 bg-slate-800/60 theme-light:bg-purple-50/70">
          <h2 className="text-xl font-black text-white theme-light:text-slate-950 flex items-center gap-2">
            <PlayCircle className="text-purple-400 theme-light:text-purple-700 w-6 h-6" />
            <span>{isAr ? 'إعادة ترجمة الأجزاء المفقودة وتجزئة الصوت' : 'ReSubtitle Missing Lines & Audio Re-chunk'}</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 theme-light:hover:bg-purple-100 rounded-full text-slate-400 theme-light:text-slate-600 transition" disabled={isProcessing || isRechunking}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Audio Re-chunking Feature Banner */}
          <div className="p-4 rounded-2xl bg-purple-950/50 theme-light:bg-purple-100 border border-purple-500/40 theme-light:border-purple-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-black text-pink-300 theme-light:text-purple-950">
                <Scissors className="w-4 h-4 text-pink-400 theme-light:text-purple-700" />
                <span>{isAr ? 'ميزة إعادة تجزئة الصوت (2 دقيقة):' : 'Fresh Audio 2-Min Re-chunking:'}</span>
              </div>
              <p className="text-[11px] text-purple-200 theme-light:text-purple-900 font-bold leading-relaxed max-w-lg">
                {isAr
                  ? 'إذا فشلت عملية التقطيع السابقة أو فُقدت أجزاء من الصوت، اضغط هنا لإعادة تقطيع الملف بالكامل بدقة إلى أجزاء دقيقتين وتصحيح الفجوات.'
                  : 'If previous audio chunking was incomplete or dropped lines, re-chunk the audio into clean 2-minute segments.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRechunkOnly}
              disabled={isProcessing || isRechunking}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs hover:scale-105 transition shadow-md shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRechunking ? 'animate-spin' : ''}`} />
              <span>{isRechunking ? (isAr ? 'جاري التقطيع...' : 'Re-chunking...') : (isAr ? 'إعادة تجزئة الصوت (2 دقيقة)' : 'Re-chunk Audio (2 min)')}</span>
            </button>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 theme-light:bg-emerald-100 border border-emerald-500/40 text-emerald-300 theme-light:text-emerald-900 text-xs font-black flex items-center space-x-2 rtl:space-x-reverse shadow-md animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Filter / Quick Selection Controls */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-extrabold text-slate-300 theme-light:text-slate-800">
              {isAr ? `الأجزاء المحددة: ${selectedChunks.length} من أصل ${chunks.length}` : `Selected: ${selectedChunks.length} of ${chunks.length} chunks`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectSuspiciousOnly}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 theme-light:bg-purple-100 text-purple-300 theme-light:text-purple-900 hover:bg-slate-700 transition"
              >
                {isAr ? 'تحديد الأجزاء المشبوهة فقط' : 'Select Suspicious Only'}
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 theme-light:bg-purple-100 text-purple-300 theme-light:text-purple-900 hover:bg-slate-700 transition"
              >
                {selectedChunks.length === chunks.length ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All') : (isAr ? 'تحديد الكل' : 'Select All')}
              </button>
            </div>
          </div>

          {/* Chunks List */}
          <div className="space-y-2">
            {chunks.map(chunk => (
              <label 
                key={chunk.index} 
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                  chunk.suspicious 
                    ? 'border-red-500/50 bg-red-950/30 theme-light:bg-red-50 theme-light:border-red-300 hover:bg-red-950/50' 
                    : 'border-purple-500/20 bg-slate-950/40 theme-light:bg-purple-50/50 theme-light:border-purple-200 hover:bg-purple-950/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    checked={selectedChunks.includes(chunk.index)}
                    onChange={() => handleToggle(chunk.index)}
                    disabled={isProcessing || isRechunking}
                    className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800"
                  />
                  <div>
                    <div className="font-black text-slate-200 theme-light:text-slate-950 flex items-center gap-2 text-xs sm:text-sm">
                      {isAr ? `المقطع ${chunk.index + 1}` : `Chunk ${chunk.index + 1}`}
                      {chunk.suspicious && (
                        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 theme-light:bg-red-100 theme-light:text-red-700 border border-red-400/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{chunk.subCount === 0 ? (isAr ? 'فارغ بالكامل' : 'Empty') : (isAr ? 'فجوات مفقودة' : 'Gaps detected')}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 theme-light:text-slate-600 font-mono font-bold mt-1">
                      {formatTime(chunk.start)} - {formatTime(chunk.end)} (120s)
                    </div>
                  </div>
                </div>
                <div className="text-right rtl:text-left">
                  <span className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg ${
                    chunk.subCount === 0 
                      ? 'text-red-400 bg-red-950/50 theme-light:bg-red-100 theme-light:text-red-800' 
                      : 'text-emerald-400 bg-emerald-950/50 theme-light:bg-emerald-100 theme-light:text-emerald-800'
                  }`}>
                    {chunk.subCount} {isAr ? 'أسطر' : 'lines'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-purple-500/20 theme-light:border-purple-200 bg-slate-800/60 theme-light:bg-purple-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button 
            onClick={onClose} 
            disabled={isProcessing || isRechunking}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-300 theme-light:text-slate-700 hover:bg-white/10 theme-light:hover:bg-purple-100 transition"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Re-chunk & Resubtitle Combo Button */}
            <button 
              onClick={() => handleProcess(true)}
              disabled={isProcessing || isRechunking}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:scale-105 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-pink-500/20"
              title={isAr ? 'إعادة تجزئة الصوت لمقاطع دقيقتين ثم إعادة الترجمة' : 'Re-chunk audio into 2-min segments and resubtitle'}
            >
              <Scissors className="w-4 h-4 text-white" />
              <span>{isAr ? 'إعادة التجزئة والترجمة' : 'Re-chunk & Resubtitle'}</span>
            </button>

            {/* Standard Resubtitle Selected Chunks Button */}
            <button 
              onClick={() => handleProcess(false)}
              disabled={isProcessing || isRechunking || selectedChunks.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/25"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>{isAr ? 'جاري المعالجة...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 text-white" />
                  <span>{isAr ? 'إعادة الترجمة للأجزاء المحددة' : 'Resubtitle Selected'}</span>
                </>
              )}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
