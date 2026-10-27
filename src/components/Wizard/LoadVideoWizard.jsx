import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Upload, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, FileVideo, Layers, Cpu, AlertCircle, RefreshCw, Film, MessageSquare, Volume2, Clapperboard, Subtitles, Tv, Video, Link as LinkIcon, Radio, Globe, AlertTriangle } from 'lucide-react';
import CloudUploadAnimation from './CloudUploadAnimation.jsx';

export default function LoadVideoWizard({ user, onCompleteProcess, onCancel, lang = 'en', initialProjectName = '', initialProjectType = 'Episode' }) {
  const [currentStep, setCurrentStep] = useState(1);
  const isAr = lang === 'ar';

  // Form State
  const [projectName, setProjectName] = useState(initialProjectName);
  const [projectType, setProjectType] = useState(initialProjectType);
  const [mediaTitle, setMediaTitle] = useState('');

  // Source Type: 'direct' (Local MP4), 'torrent' (.torrent file), 'magnet' (Magnet URI)
  const [sourceType, setSourceType] = useState('direct');
  const [torrentFile, setTorrentFile] = useState(null);
  const [magnetLink, setMagnetLink] = useState('');
  const [torrentTelemetry, setTorrentTelemetry] = useState(null);
  const [isIngestingTorrent, setIsIngestingTorrent] = useState(false);

  // Upload State
  const [videoFile, setVideoFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState('00:00:00');
  const [videoDurationSecs, setVideoDurationSecs] = useState(0);

  const extractDuration = (file) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const seconds = video.duration;
      setVideoDurationSecs(Math.ceil(seconds));
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      setVideoDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    video.src = URL.createObjectURL(file);
  };
  const [projectId, setProjectId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCompleted, setUploadCompleted] = useState(false);
  const hasCompletedProcessRef = useRef(false);
  const startAIProcessingRef = useRef(null);

  // AI Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [progressExtract, setProgressExtract] = useState(0);
  const [progressTranscode, setProgressTranscode] = useState(0);
  const [progressTranslate, setProgressTranslate] = useState(0);
  const [processStatusMsg, setProcessStatusMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const projectTypes = [
    { id: 'Episode', label: isAr ? 'حلقة أنمي' : 'Anime Episode', icon: Tv },
    { id: 'Movie', label: isAr ? 'فيلم سينمائي' : 'Feature Movie', icon: Video },
    { id: 'Trailer', label: isAr ? 'عروض ترويجية' : 'Teaser / Trailer', icon: Sparkles },
    { id: 'Clip', label: isAr ? 'مقطع فيديو' : 'Short Video Clip', icon: Layers }
  ];

  const stepLabels = isAr ? [
    'إعداد المشروع', 'تفاصيل الفيديو', 'اختيار الملف', 'جاري الرفع', 'مكتمل', 'معالجة الذكاء الاصطناعي'
  ] : [
    'Project Setup', 'Video Details', 'Select File', 'Uploading', 'Complete', 'AI Processing'
  ];

  const [uploadStatusText, setUploadStatusText] = useState('');

  const [existingFolders, setExistingFolders] = useState([]);
  const [folderSelectionMode, setFolderSelectionMode] = useState('new'); // 'new' or 'existing'

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const headers = user?.id ? { 'x-user-id': user.id } : {};
        const res = await fetch('/api/projects', { cache: 'no-store', headers });
        const data = await res.json();
        let projectsArray = [];
        if (Array.isArray(data)) {
          projectsArray = data;
        } else if (data.success) {
          projectsArray = data.projects || [];
        }
        const folders = [...new Set(projectsArray.map(p => p.projectName).filter(Boolean))];
        setExistingFolders(folders);
        if (folders.length > 0) {
          setFolderSelectionMode('existing');
          setProjectName(folders[0]);
        }
      } catch (err) {
        console.error('Failed to fetch folders:', err);
      }
    };
    fetchFolders();
  }, [user]);

  // Real-Time Socket.io Telemetry Listener
  useEffect(() => {
    if (!projectId) return;

    // Connect to port 3001 directly in dev or through origin
    const socketUrl = window.location.port === '5173'
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : undefined;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socket.emit('join_project', projectId);

    socket.on('processing_progress', (data) => {
      if (data.progress !== undefined) setProcessProgress(data.progress);
      if (data.status) setProcessStatusMsg(data.status);
      if (data.progressExtract !== undefined) setProgressExtract(data.progressExtract);
      if (data.progressTranscode !== undefined) setProgressTranscode(data.progressTranscode);
      if (data.progressTranslate !== undefined) setProgressTranslate(data.progressTranslate);

      // Automatic transition to editor when AI processing reaches 100%
      if ((data.progress === 100 || data.status === 'Completed') && !hasCompletedProcessRef.current) {
        hasCompletedProcessRef.current = true;
        fetch(`/api/project/${projectId}`, {
          headers: user?.id ? { 'x-user-id': user.id } : {}
        })
          .then(r => r.json())
          .then(proj => {
            if (proj && proj.id && !proj.error) {
              setProcessStatusMsg(isAr ? 'اكتملت المعالجة بنجاح! جاري فتح محرر الترجمة...' : 'Processing complete! Opening subtitle workspace...');
              setTimeout(() => {
                setIsProcessing(false);
                onCompleteProcess(proj);
              }, 800);
            } else {
              hasCompletedProcessRef.current = false;
            }
          })
          .catch(err => {
            console.error('Error fetching final project:', err);
            hasCompletedProcessRef.current = false;
          });
      }

      // Handle Torrent Telemetry
      if (data.stage && data.stage.startsWith('torrent_')) {
        setTorrentTelemetry(data);
        if (data.progress !== undefined) setUploadProgress(data.progress);
        if (data.message) setUploadStatusText(data.message);

        if (data.stage === 'torrent_completed') {
          setTimeout(() => {
            if (startAIProcessingRef.current) {
              startAIProcessingRef.current(projectId);
            } else {
              setCurrentStep(6);
              setIsProcessing(true);
              setProcessStatusMsg(isAr ? 'اكتمل تحميل التورنت! بدء المعالجة بالذكاء الاصطناعي...' : 'Torrent downloaded! Starting AI transcription...');
            }
          }, 1000);
        } else if (data.stage === 'torrent_failed') {
          setErrorMessage(data.error || 'Failed to download torrent.');
          setCurrentStep(6);
        }
      }
    });

    return () => {
      socket.emit('leave_project', projectId);
      socket.disconnect();
    };
  }, [projectId]);

  // Dual Fallback: Poll torrent status endpoint every 1.5s during download
  useEffect(() => {
    if (!projectId || currentStep !== 4 || sourceType === 'direct') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/torrent/${projectId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data?.status) {
          const st = data.status;
          setTorrentTelemetry(prev => ({ ...(prev || {}), ...st }));
          if (st.progress !== undefined) setUploadProgress(st.progress);
          if (st.status === 'completed') {
            clearInterval(pollInterval);
            if (startAIProcessingRef.current) {
              startAIProcessingRef.current(projectId);
            } else {
              setCurrentStep(6);
              setIsProcessing(true);
            }
          } else if (st.status === 'failed') {
            clearInterval(pollInterval);
            setErrorMessage(st.error || 'Torrent download failed');
            setCurrentStep(6);
          }
        }
      } catch (err) {
        // Silently ignore polling glitch
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [projectId, currentStep, sourceType]);

  // Handle Torrent & Magnet Link Ingestion
  const handleTorrentIngest = async () => {
    if (sourceType === 'torrent' && !torrentFile) {
      alert(isAr ? 'الرجاء اختيار ملف .torrent أولاً' : 'Please select a .torrent file first.');
      return;
    }
    if (sourceType === 'magnet' && !magnetLink.trim().startsWith('magnet:?')) {
      alert(isAr ? 'الرجاء إدخال رابط تورنت Magnet صالح يبدأ بـ magnet:?' : 'Please enter a valid magnet link starting with magnet:?');
      return;
    }

    setIsIngestingTorrent(true);
    setCurrentStep(4);
    setUploadProgress(5);
    setUploadStatusText(isAr ? 'جاري الاتصال بسرب التورنت وفحص ملفات الفيديو...' : 'Connecting to torrent swarm and verifying video contents...');

    const sendIngestRequest = async (targetUrl) => {
      let res;
      if (sourceType === 'torrent') {
        const fd = new FormData();
        if (user?.id) fd.append('userId', user.id);
        if (projectName) fd.append('projectName', projectName);
        if (projectType) fd.append('projectType', projectType);
        if (mediaTitle) fd.append('mediaTitle', mediaTitle);
        fd.append('torrentFile', torrentFile);

        res = await fetch(targetUrl, {
          method: 'POST',
          headers: user?.id ? { 'x-user-id': user.id } : {},
          body: fd
        });
      } else {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.id ? { 'x-user-id': user.id } : {})
          },
          body: JSON.stringify({
            userId: user?.id,
            projectName,
            projectType,
            mediaTitle,
            magnetLink: magnetLink.trim()
          })
        });
      }

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        throw new Error(`Server returned invalid response (${res.status}): ${text ? text.slice(0, 100) : 'empty response'}`);
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }
      return data;
    };

    try {
      let data = null;
      try {
        data = await sendIngestRequest('/api/torrent/ingest');
      } catch (proxyErr) {
        console.warn('Ingest attempt 1 failed, trying direct backend port 3001...', proxyErr.message);
        const protocol = window.location.protocol || 'http:';
        const hostname = window.location.hostname || 'localhost';
        const directUrl = `${protocol}//${hostname}:3001/api/torrent/ingest`;
        data = await sendIngestRequest(directUrl);
      }

      setProjectId(data.projectId);
      setUploadStatusText(isAr ? 'تم بدء الاتصال بالسرب والتحميل في الخلفية...' : 'Connected to swarm. Downloading video in background...');
    } catch (err) {
      console.error('Torrent ingest error:', err);
      setErrorMessage(err.message || 'Failed to start torrent ingestion');
      setCurrentStep(6);
    } finally {
      setIsIngestingTorrent(false);
    }
  };

  const handleCancelTorrent = async () => {
    if (!projectId) {
      onCancel();
      return;
    }
    if (confirm(isAr ? 'هل أنت متأكد من إلغاء تحميل التورنت؟' : 'Are you sure you want to cancel this torrent download?')) {
      try {
        await fetch(`/api/torrent/${projectId}/cancel`, { method: 'POST' });
      } catch (e) {
        console.error('Cancel torrent error:', e);
      }
      onCancel();
    }
  };

  // Robust XHR Upload with Real Byte Tracking & Direct Fallback
  const handleUploadClick = () => {
    if (!videoFile) {
      alert(isAr ? 'الرجاء اختيار ملف فيديو MP4 أولاً' : 'Please select an MP4 video file first.');
      return;
    }

    setCurrentStep(4);
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStatusText(isAr ? 'جاري تجهيز اتصال الرفع...' : 'Preparing upload stream...');

    const createFormData = () => {
      const fd = new FormData();
      // Text metadata FIRST so Busboy/Multer reads req.body fields before parsing the binary file
      if (user?.id) fd.append('userId', user.id);
      if (projectName) fd.append('projectName', projectName);
      if (projectType) fd.append('projectType', projectType);
      if (mediaTitle) fd.append('mediaTitle', mediaTitle);
      fd.append('video', videoFile);
      return fd;
    };

    const runUploadXHR = (targetUrl, isFallback = false) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const loadedMb = (e.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (e.total / (1024 * 1024)).toFixed(1);
          const percent = Math.min(Math.round((e.loaded / e.total) * 100), 99);
          setUploadProgress(percent);
          setUploadStatusText(
            isAr 
              ? `تم نقل ${loadedMb} MB من ${totalMb} MB (${percent}%)`
              : `Uploaded ${loadedMb} MB of ${totalMb} MB (${percent}%)`
          );
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            setUploadProgress(100);
            setUploadStatusText(isAr ? 'اكتمل نقل الملف إلى السيرفر بنجاح!' : 'File upload completed successfully!');
            setProjectId(data.projectId);
            setTimeout(() => {
              setIsUploading(false);
              setUploadCompleted(true);
              setCurrentStep(5);
            }, 300);
          } else if (!isFallback) {
            console.warn('Upload attempt 1 returned non-200, trying direct backend port 3001...');
            const protocol = window.location.protocol || 'http:';
            const hostname = window.location.hostname || 'localhost';
            const directUrl = `${protocol}//${hostname}:3001/api/upload`;
            runUploadXHR(directUrl, true);
          } else {
            setIsUploading(false);
            alert(data.error || (isAr ? 'فشل رفع الفيديو على السيرفر.' : 'Server upload error.'));
            setCurrentStep(3);
          }
        } catch (err) {
          if (!isFallback) {
            const protocol = window.location.protocol || 'http:';
            const hostname = window.location.hostname || 'localhost';
            const directUrl = `${protocol}//${hostname}:3001/api/upload`;
            runUploadXHR(directUrl, true);
          } else {
            setIsUploading(false);
            alert(isAr ? 'حدث خطأ أثناء معالجة استجابة السيرفر' : 'Error parsing server response');
            setCurrentStep(3);
          }
        }
      };

      xhr.onerror = () => {
        if (!isFallback) {
          console.warn('XHR error on relative path, attempting direct port 3001...');
          const protocol = window.location.protocol || 'http:';
          const hostname = window.location.hostname || 'localhost';
          const directUrl = `${protocol}//${hostname}:3001/api/upload`;
          runUploadXHR(directUrl, true);
        } else {
          setIsUploading(false);
          alert(isAr ? 'خطأ في الاتصال بالسيرفر أثناء الرفع. الرجاء التأكد من تشغيل السيرفر.' : 'Network connection error during upload. Please check server connection.');
          setCurrentStep(3);
        }
      };

      xhr.ontimeout = () => {
        if (!isFallback) {
          const protocol = window.location.protocol || 'http:';
          const hostname = window.location.hostname || 'localhost';
          const directUrl = `${protocol}//${hostname}:3001/api/upload`;
          runUploadXHR(directUrl, true);
        } else {
          setIsUploading(false);
          alert(isAr ? 'انتهت مهلة اتصال الرفع للسيرفر.' : 'Upload request timed out.');
          setCurrentStep(3);
        }
      };

      xhr.open('POST', targetUrl, true);
      if (user?.id) {
        xhr.setRequestHeader('x-user-id', user.id);
      }
      xhr.timeout = 0;
      xhr.send(createFormData());
    };

    runUploadXHR('/api/upload');
  };

  // Step 5 -> Step 6 AI Processing Pipeline
  const startAIProcessing = async (overrideProjectId = null) => {
    const activeId = overrideProjectId || projectId;
    if (!activeId) return;

    setCurrentStep(6);
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessProgress(5);
    setProgressExtract(25);
    setProgressTranscode(0);
    setProgressTranslate(0);
    setProcessStatusMsg(isAr ? 'جاري بدء استخراج الصوت والمعالجة...' : 'Initializing audio extraction and processing...');

    // Start polling the server for real progress
    const progressTimer = setInterval(async () => {
      try {
        const pRes = await fetch(`/api/project/${activeId}/progress?t=${Date.now()}`, { cache: 'no-store' });
        const pData = await pRes.json();
        if (pData.progress > 0) {
          setProcessProgress(pData.progress);
          if (pData.status) {
            setProcessStatusMsg(pData.status);
          }
          if (pData.progressExtract !== undefined) setProgressExtract(pData.progressExtract);
          if (pData.progressTranscode !== undefined) setProgressTranscode(pData.progressTranscode);
          if (pData.progressTranslate !== undefined) setProgressTranslate(pData.progressTranslate);
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 2000);

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-user-id': user.id } : {})
        },
        body: JSON.stringify({
          projectId: activeId,
          projectName: projectName || 'Untitled Project',
          projectType,
          mediaTitle: mediaTitle || 'Untitled Video',
          videoDurationSecs: videoDurationSecs || 0
        })
      });

      const data = await res.json();
      clearInterval(progressTimer);

      if (res.status === 402 || res.status === 403) {
        setIsProcessing(false);
        setErrorMessage(data.error || 'Permission denied.');
        return;
      }
      if (!data.success && !data.project) {
        setIsProcessing(false);
        setErrorMessage(data.error || data.message || (isAr ? 'فشلت معالجة الصوت بالذكاء الاصطناعي.' : 'Audio extraction / Gemini AI Processing failed.'));
        return;
      }

      let finalProject = data.project;
      if (!finalProject) {
        try {
          const pRes = await fetch(`/api/project/${activeId}`, {
            headers: user?.id ? { 'x-user-id': user.id } : {}
          });
          const pData = await pRes.json();
          if (pData && pData.id && !pData.error) {
            finalProject = pData;
          }
        } catch (fetchErr) {
          console.warn('Could not fetch final project immediately:', fetchErr);
        }
      }

      setProcessProgress(100);
      setProcessStatusMsg(isAr ? 'اكتملت المعالجة! جاري فتح محرر الترجمة...' : 'Processing complete! Loading Working Table Workspace...');
      setTimeout(async () => {
        setIsProcessing(false);
        if (finalProject && finalProject.id) {
          onCompleteProcess(finalProject);
        } else {
          try {
            const pRes = await fetch(`/api/project/${activeId}`, {
              headers: user?.id ? { 'x-user-id': user.id } : {}
            });
            const pData = await pRes.json();
            if (pData && pData.id && !pData.error) {
              onCompleteProcess(pData);
            }
          } catch (e) {}
        }
      }, 600);

    } catch (err) {
      clearInterval(progressTimer);
      setIsProcessing(false);
      console.error('AI Processing fetch error:', err);
      setErrorMessage(isAr ? 'خطأ في الاتصال أثناء معالجة الصوت بالذكاء الاصطناعي.' : 'Network connection error during audio extraction / Gemini AI processing.');
    }
  };

  useEffect(() => {
    startAIProcessingRef.current = startAIProcessing;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onCancel}
            className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-black text-white bg-purple-950 theme-light:bg-purple-700 px-4 py-2 rounded-xl border border-purple-500/40 theme-light:border-purple-800 shadow-md transition hover:scale-105 wizard-white-text"
          >
            {isAr ? <ArrowRight className="w-4 h-4 text-white" /> : <ArrowLeft className="w-4 h-4 text-white" />}
            <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </button>
          <span className="text-xs font-black text-white uppercase tracking-widest bg-purple-950 theme-light:bg-purple-700 px-4 py-1.5 rounded-full border border-purple-500/40 theme-light:border-purple-800 shadow-md wizard-white-text">
            {isAr ? `الخطوة ${currentStep} من 6` : `Step ${currentStep} of 6`}
          </span>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-6 gap-2">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = currentStep > stepNum;
            return (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-full h-2.5 rounded-full transition-all ${
                    isDone ? 'bg-gradient-to-r from-purple-600 to-pink-600' : isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse' : 'bg-slate-800 theme-light:bg-slate-300'
                  }`}
                />
                <span className={`text-[10px] font-black mt-1.5 hidden sm:inline truncate max-w-full ${isActive ? 'text-purple-300 theme-light:text-purple-950 font-black' : 'text-slate-400 theme-light:text-purple-900 font-extrabold'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Enter Project Name & Select Project Type */}
      {currentStep === 1 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-extrabold text-white theme-light:text-slate-950 mb-1">
              {isAr ? 'الخطوة 1: إعداد المشروع' : 'Step 1: Project Setup'}
            </h3>
            <p className="text-xs text-slate-300 theme-light:text-purple-950 font-bold">
              {isAr ? 'أدخل اسم مشروع الترجمة واختر نوع الوسائط.' : 'Enter your project name and select the type of media project you are creating.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-300 theme-light:text-slate-950 mb-3">
              {isAr ? 'مجلد المشروع (الأنمي)' : 'Project Folder (Anime Series)'}
            </label>
            
            <div className="flex space-x-2 rtl:space-x-reverse mb-3" dir={isAr ? 'rtl' : 'ltr'}>
              <button
                onClick={() => setFolderSelectionMode('existing')}
                disabled={existingFolders.length === 0}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${folderSelectionMode === 'existing' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 theme-light:bg-slate-200 text-slate-400 theme-light:text-slate-600 hover:bg-slate-700'} ${existingFolders.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAr ? 'اختيار مجلد حالي' : 'Select Existing Folder'}
              </button>
              <button
                onClick={() => { setFolderSelectionMode('new'); setProjectName(''); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${folderSelectionMode === 'new' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 theme-light:bg-slate-200 text-slate-400 theme-light:text-slate-600 hover:bg-slate-700'}`}
              >
                {isAr ? 'إنشاء مجلد جديد' : 'Create New Folder'}
              </button>
            </div>

            {folderSelectionMode === 'existing' && existingFolders.length > 0 ? (
              <select
                dir={isAr ? 'rtl' : 'ltr'}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-900 theme-light:bg-white border border-slate-700 theme-light:border-purple-400 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-sm text-white theme-light:text-slate-950 font-bold outline-none transition"
              >
                {existingFolders.map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                dir={isAr ? 'rtl' : 'ltr'}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={isAr ? 'مثال: ون بيس - أرك وانو' : 'e.g. One Piece Wano Arc'}
                className="w-full bg-slate-900 theme-light:bg-white border border-slate-700 theme-light:border-purple-400 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-sm text-white theme-light:text-slate-950 font-bold outline-none transition"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-slate-300 theme-light:text-slate-950 mb-3">
              {isAr ? 'نوع المشروع (اختر الفئة)' : 'Select Media Category'}
            </label>
            {/* BIG ICONS WITH TITLE BELOW (NO EXTRA DESCRIPTION TEXT) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {projectTypes.map(t => {
                const IconComponent = t.icon;
                const isSelected = projectType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setProjectType(t.id)}
                    className={`p-6 sm:p-7 rounded-3xl transition flex flex-col items-center justify-center text-center cursor-pointer ${
                      isSelected
                        ? 'wizard-selected-card shadow-2xl scale-[1.04]'
                        : 'wizard-unselected-card hover:scale-[1.02]'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3.5 transition shadow-md ${
                      isSelected
                        ? 'bg-purple-950/90 border-2 border-yellow-300 text-yellow-300'
                        : 'bg-purple-900/90 border-2 border-purple-400/60 text-pink-300'
                    }`}>
                      <IconComponent className="w-9 h-9" />
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-white text-center">{t.label}</h4>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              disabled={!projectName.trim()}
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
            >
              <span>{isAr ? 'التالي: تفاصيل الفيديو' : 'Next: Media Details'}</span>
              {isAr ? <ArrowLeft className="w-4 h-4 text-white" /> : <ArrowRight className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Name of Project & Video Title */}
      {currentStep === 2 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-extrabold text-white theme-light:text-slate-950 mb-1">
              {isAr ? 'الخطوة 2: تفاصيل الفيديو' : 'Step 2: Video Details'}
            </h3>
            <p className="text-xs text-slate-300 theme-light:text-purple-950 font-bold">
              {isAr ? `حدد عنوان مقطع الفيديو (${projectType}) لمشروع ${projectName}` : `Specify the title of the video (${projectType}) for ${projectName}.`}
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-300 theme-light:text-slate-950 mb-1.5">
              {isAr ? 'اسم المشروع' : 'Project Name'}
            </label>
            <input
              type="text"
              dir={isAr ? 'rtl' : 'ltr'}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-slate-900/70 theme-light:bg-slate-100 border border-slate-800 theme-light:border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-300 theme-light:text-slate-950 font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-300 theme-light:text-slate-950 mb-1.5">
              {isAr ? `عنوان مقطع (${projectType})` : `Title of ${projectType}`}
            </label>
            <input
              type="text"
              dir={isAr ? 'rtl' : 'ltr'}
              value={mediaTitle}
              onChange={(e) => setMediaTitle(e.target.value)}
              placeholder={isAr ? 'مثال: الحلقة 1071 - توقظ المحرك الخامس' : `e.g. Episode 1071: Gear 5 Awakens`}
              className="w-full bg-slate-900 theme-light:bg-white border border-slate-700 theme-light:border-purple-400 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-sm text-white theme-light:text-slate-950 font-bold outline-none transition"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-7 py-3.5 rounded-2xl bg-slate-900 theme-light:bg-slate-900 text-white font-black text-sm border-2 border-slate-700 hover:bg-slate-800 transition shadow-md wizard-white-text"
            >
              {isAr ? <ArrowRight className="w-4 h-4 text-white" /> : <ArrowLeft className="w-4 h-4 text-white" />}
              <span>{isAr ? 'السابق' : 'Back'}</span>
            </button>
            <button
              disabled={!mediaTitle.trim()}
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
            >
              <span>{isAr ? 'التالي: رفع الملف' : 'Next: Upload File'}</span>
              {isAr ? <ArrowLeft className="w-4 h-4 text-white" /> : <ArrowRight className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Multi-Source Video Selection (Direct, .torrent, or Magnet Link) */}
      {currentStep === 3 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-extrabold text-white theme-light:text-slate-950 mb-1">
              {isAr ? 'الخطوة 3: اختيار مصدر الفيديو' : 'Step 3: Select Video Source'}
            </h3>
            <p className="text-xs text-slate-300 theme-light:text-purple-950 font-bold">
              {isAr ? 'اختر طريقة تزويد الفيديو: رفع مباشر، أو ملف تورنت، أو رابط مغناطيسي Magnet.' : 'Choose how you want to provide your video: direct file upload, .torrent file, or magnet link.'}
            </p>
          </div>

          {/* 3-Tab Source Switcher */}
          <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-purple-500/30">
            <button
              type="button"
              onClick={() => setSourceType('direct')}
              className={`flex items-center justify-center space-x-2 rtl:space-x-reverse py-3 px-3 rounded-xl font-black text-xs transition ${
                sourceType === 'direct'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileVideo className="w-4 h-4 shrink-0" />
              <span className="truncate">{isAr ? 'ملف فيديو MP4' : 'Direct MP4 File'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('torrent')}
              className={`flex items-center justify-center space-x-2 rtl:space-x-reverse py-3 px-3 rounded-xl font-black text-xs transition ${
                sourceType === 'torrent'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-4 h-4 shrink-0" />
              <span className="truncate">{isAr ? 'ملف تورنت (.torrent)' : 'Torrent File'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('magnet')}
              className={`flex items-center justify-center space-x-2 rtl:space-x-reverse py-3 px-3 rounded-xl font-black text-xs transition ${
                sourceType === 'magnet'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LinkIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{isAr ? 'رابط مغناطيسي (Magnet)' : 'Magnet Link'}</span>
            </button>
          </div>

          {/* TAB 1: Direct File Dropzone */}
          {sourceType === 'direct' && (
            <div
              onClick={() => document.getElementById('hidden-video-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  setVideoFile(file);
                  extractDuration(file);
                  if (!mediaTitle.trim()) {
                    setMediaTitle(file.name.replace(/\.[^/.]+$/, ''));
                  }
                }
              }}
              className="border-3 border-dashed border-purple-500/60 theme-light:border-purple-600 hover:border-pink-500 bg-purple-950/40 theme-light:bg-purple-100/90 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center transition cursor-pointer group shadow-inner"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-xl shadow-purple-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <div className="w-full h-full bg-slate-950 theme-light:bg-purple-900 rounded-[22px] flex items-center justify-center">
                  <Upload className="w-8 h-8 text-pink-300 animate-bounce" />
                </div>
              </div>

              <input
                id="hidden-video-input"
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setVideoFile(e.target.files[0]);
                    extractDuration(e.target.files[0]);
                    if (!mediaTitle.trim()) {
                      setMediaTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                    }
                  }
                }}
                className="hidden"
              />

              {videoFile ? (
                <div className="flex items-center space-x-4 bg-purple-950 theme-light:bg-purple-800 px-6 py-4 rounded-2xl border-2 border-purple-400 shadow-xl wizard-white-text max-w-lg mx-auto" dir="ltr">
                  <FileVideo className="w-7 h-7 text-pink-300 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm sm:text-base font-extrabold text-white truncate max-w-xs">{videoFile.name}</p>
                    <p className="text-xs text-purple-200 font-bold">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoFile(null);
                      setVideoDuration('00:00:00');
                    }}
                    className="px-3 py-1 rounded-xl bg-purple-900 hover:bg-rose-600 text-white text-xs font-black transition ml-auto"
                  >
                    {isAr ? 'تغيير الملف' : 'Change'}
                  </button>
                </div>
              ) : (
                <>
                  <h4 className="text-base font-black text-white theme-light:text-purple-950 mb-1">
                    {isAr ? 'انقر أو اسحب ملف فيديو MP4 هنا' : 'Click or Drag & Drop MP4 Video File Here'}
                  </h4>
                  <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold mb-4">
                    {isAr ? 'يدعم مقاطع فيديو الأنمي بصيغة MP4 حتى 500 ميجابايت' : 'Supports MP4 anime video files up to 500MB'}
                  </p>

                  <button
                    type="button"
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-black text-xs shadow-lg shadow-purple-500/30 flex items-center space-x-2 rtl:space-x-reverse border border-purple-400/40 wizard-white-text hover:scale-105 transition"
                  >
                    <Upload className="w-4 h-4 text-white" />
                    <span>{isAr ? 'تصفح واختيار ملف من الجهاز' : 'Browse MP4 Video File'}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* TAB 2: Torrent File Dropzone */}
          {sourceType === 'torrent' && (
            <div
              onClick={() => document.getElementById('hidden-torrent-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  if (!file.name.endsWith('.torrent')) {
                    alert(isAr ? 'يجب اختيار ملف بامتداد .torrent' : 'Please select a valid .torrent file');
                    return;
                  }
                  setTorrentFile(file);
                  if (!mediaTitle.trim()) {
                    setMediaTitle(file.name.replace(/\.[^/.]+$/, ''));
                  }
                }
              }}
              className="border-3 border-dashed border-purple-500/60 theme-light:border-purple-600 hover:border-pink-500 bg-purple-950/40 theme-light:bg-purple-100/90 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center transition cursor-pointer group shadow-inner"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-xl shadow-purple-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <div className="w-full h-full bg-slate-950 theme-light:bg-purple-900 rounded-[22px] flex items-center justify-center">
                  <Radio className="w-8 h-8 text-pink-300 animate-pulse" />
                </div>
              </div>

              <input
                id="hidden-torrent-input"
                type="file"
                accept=".torrent"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setTorrentFile(e.target.files[0]);
                    if (!mediaTitle.trim()) {
                      setMediaTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                    }
                  }
                }}
                className="hidden"
              />

              {torrentFile ? (
                <div className="flex items-center space-x-4 bg-purple-950 theme-light:bg-purple-800 px-6 py-4 rounded-2xl border-2 border-purple-400 shadow-xl wizard-white-text max-w-lg mx-auto" dir="ltr">
                  <Radio className="w-7 h-7 text-pink-300 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm sm:text-base font-extrabold text-white truncate max-w-xs">{torrentFile.name}</p>
                    <p className="text-xs text-purple-200 font-bold">{(torrentFile.size / 1024).toFixed(1)} KB (Torrent Metadata)</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTorrentFile(null);
                    }}
                    className="px-3 py-1 rounded-xl bg-purple-900 hover:bg-rose-600 text-white text-xs font-black transition ml-auto"
                  >
                    {isAr ? 'تغيير الملف' : 'Change'}
                  </button>
                </div>
              ) : (
                <>
                  <h4 className="text-base font-black text-white theme-light:text-purple-950 mb-1">
                    {isAr ? 'انقر أو اسحب ملف تورنت (.torrent) هنا' : 'Click or Drag & Drop .torrent File Here'}
                  </h4>
                  <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold mb-4">
                    {isAr ? 'يجب أن يحتوي التورنت على ملف فيديو واحد فقط بحد أقصى 2 جيجابايت' : 'Single video torrent only, maximum size 2GB (Non-video files ignored)'}
                  </p>

                  <button
                    type="button"
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-black text-xs shadow-lg shadow-purple-500/30 flex items-center space-x-2 rtl:space-x-reverse border border-purple-400/40 wizard-white-text hover:scale-105 transition"
                  >
                    <Radio className="w-4 h-4 text-white" />
                    <span>{isAr ? 'تصفح ملف التورنت' : 'Browse .torrent File'}</span>
                  </button>
                </>
              )}

              {/* Requirement pill */}
              <div className="mt-4 flex items-center space-x-2 rtl:space-x-reverse text-[11px] font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'حد أقصى 2GB • ملف فيديو فردي فقط • حماية انقطاع الموزعين لمدة 30 دقيقة' : 'Max 2GB • Single video file only • 30-min zero-seed safeguard active'}</span>
              </div>
            </div>
          )}

          {/* TAB 3: Magnet Link Input */}
          {sourceType === 'magnet' && (
            <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/30 space-y-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                <div className="p-2.5 rounded-2xl bg-purple-600/30 text-pink-300 border border-purple-400/30">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {isAr ? 'رابط التورنت المغناطيسي (Magnet URI)' : 'BitTorrent Magnet Link URI'}
                  </h4>
                  <p className="text-[11px] text-purple-300 font-bold">
                    {isAr ? 'ألصق رابط التورنت المغناطيسي الذي يبدأ بـ magnet:?' : 'Paste the torrent magnet link starting with magnet:?'}
                  </p>
                </div>
              </div>

              <textarea
                rows={3}
                value={magnetLink}
                onChange={(e) => {
                  setMagnetLink(e.target.value);
                  const dnMatch = e.target.value.match(/dn=([^&]+)/);
                  if (dnMatch && dnMatch[1] && !mediaTitle.trim()) {
                    try {
                      setMediaTitle(decodeURIComponent(dnMatch[1]).replace(/\.[^/.]+$/, ''));
                    } catch (err) {
                      // fallback
                    }
                  }
                }}
                placeholder="magnet:?xt=urn:btih:..."
                dir="ltr"
                className="w-full bg-slate-950/80 border-2 border-purple-500/40 focus:border-pink-500 rounded-2xl p-4 text-white text-xs font-mono tracking-wide placeholder-slate-500 focus:outline-none transition"
              />

              {magnetLink && !magnetLink.trim().startsWith('magnet:?') && (
                <p className="text-xs text-rose-400 font-bold flex items-center space-x-1.5 rtl:space-x-reverse">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{isAr ? 'الرابط غير صالح؛ يجب أن يبدأ بـ magnet:?' : 'Invalid link format; must start with magnet:?'}</span>
                </p>
              )}

              {/* Requirement pill */}
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-[11px] font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-2 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'حد أقصى 2GB • ملف فيديو واحد • حماية انقطاع الموزعين (Seeds) لمدة 30 دقيقة' : 'Max 2GB • Single video file only • 30-min zero-seed timeout safeguard'}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-7 py-3.5 rounded-2xl bg-slate-900 theme-light:bg-slate-900 text-white font-black text-sm border-2 border-slate-700 hover:bg-slate-800 transition shadow-md wizard-white-text"
            >
              {isAr ? <ArrowRight className="w-4 h-4 text-white" /> : <ArrowLeft className="w-4 h-4 text-white" />}
              <span>{isAr ? 'السابق' : 'Back'}</span>
            </button>

            {sourceType === 'direct' ? (
              <button
                disabled={!videoFile}
                onClick={handleUploadClick}
                className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>{isAr ? 'رفع الفيديو' : 'Upload Video'}</span>
              </button>
            ) : sourceType === 'torrent' ? (
              <button
                disabled={!torrentFile || isIngestingTorrent}
                onClick={handleTorrentIngest}
                className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
              >
                <Radio className="w-4 h-4 text-white" />
                <span>{isIngestingTorrent ? (isAr ? 'جاري الاتصال...' : 'Connecting...') : (isAr ? 'بدء معالجة التورنت' : 'Start Torrent Ingest')}</span>
              </button>
            ) : (
              <button
                disabled={!magnetLink.trim().startsWith('magnet:?') || isIngestingTorrent}
                onClick={handleTorrentIngest}
                className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
              >
                <LinkIcon className="w-4 h-4 text-white" />
                <span>{isIngestingTorrent ? (isAr ? 'جاري الاتصال...' : 'Connecting...') : (isAr ? 'بدء معالجة المغناطيس' : 'Start Magnet Ingest')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Live Upload or Torrent Ingestion Telemetry */}
      {currentStep === 4 && (
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-10 border border-purple-500/30 text-center space-y-6">
          {sourceType === 'direct' ? (
            /* Direct File Upload Progress View */
            <>
              <div>
                <h3 className="text-2xl font-extrabold text-white theme-light:text-slate-950 mb-1">
                  {isAr ? 'جاري رفع الفيديو إلى السيرفر' : 'Uploading Video to Server'}
                </h3>
                <p className="text-xs text-purple-300 theme-light:text-purple-950 font-extrabold">
                  {isAr ? 'يرجى الانتظار بينما يتم نقل الفيديو للسيرفر...' : 'Please wait while your video file is being uploaded...'}
                </p>
              </div>

              <CloudUploadAnimation />

              <div className="max-w-md mx-auto space-y-3">
                <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full shimmer-bar transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-extrabold" dir="ltr">
                  <span className="text-white font-black bg-purple-950 theme-light:bg-purple-800 px-4 py-1 rounded-xl border border-purple-400 shadow-sm text-left truncate max-w-xs">
                    {videoFile?.name}
                  </span>
                  <span className="text-white bg-purple-950 theme-light:bg-purple-800 px-3 py-1 rounded-full border border-purple-400 wizard-white-text">
                    {uploadProgress}%
                  </span>
                </div>

                {uploadStatusText && (
                  <p className="text-xs font-extrabold text-pink-300 bg-purple-950/80 theme-light:bg-purple-900/90 py-1.5 px-4 rounded-xl border border-pink-400/40 inline-block">
                    {uploadStatusText}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* BitTorrent Swarm Live Ingestion Telemetry View */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-xl shadow-purple-500/30 flex items-center justify-center mb-3">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                    <Radio className="w-7 h-7 text-pink-300 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white theme-light:text-slate-950">
                  {isAr ? 'جاري تنزيل ملف الفيديو عبر سرب التورنت' : 'Downloading Video via WebTorrent Swarm'}
                </h3>
                <p className="text-xs text-purple-300 font-bold max-w-md mx-auto">
                  {uploadStatusText || (isAr ? 'الاتصال بالموزعين وتنزيل أجزاء الفيديو...' : 'Connecting to seeders and fetching pieces...')}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-lg mx-auto space-y-2">
                <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 transition-all duration-300 shadow-md"
                    style={{ width: `${torrentTelemetry?.progress !== undefined ? torrentTelemetry.progress : uploadProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-black text-white px-1" dir="ltr">
                  <span>{torrentTelemetry?.downloadedMb || 0} MB / {torrentTelemetry?.totalMb || 0} MB</span>
                  <span className="text-pink-300">{torrentTelemetry?.progress !== undefined ? torrentTelemetry.progress : uploadProgress}%</span>
                </div>
              </div>

              {/* Live 4-Card Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-left" dir="ltr">
                <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Speed</span>
                  <span className="text-sm font-black text-white">{torrentTelemetry?.downloadSpeed || 0} MB/s</span>
                </div>
                <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Swarm Peers</span>
                  <span className="text-sm font-black text-pink-300">{torrentTelemetry?.numPeers || 0} peers</span>
                </div>
                <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seeders</span>
                  <span className="text-sm font-black text-emerald-400">{torrentTelemetry?.numSeeds !== undefined ? torrentTelemetry.numSeeds : 0} seeds</span>
                </div>
                <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Time</span>
                  <span className="text-sm font-black text-white">{torrentTelemetry?.eta !== undefined ? torrentTelemetry.eta : '--'}</span>
                </div>
              </div>

              {/* Zero-Seeds Safeguard Notice */}
              <div className="max-w-lg mx-auto bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-start space-x-3 rtl:space-x-reverse text-right">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <p className="font-bold text-amber-300 mb-0.5">
                    {isAr ? 'حماية عدم توفر الموزعين (Seeds Safeguard)' : 'Zero-Seeds Safeguard Active'}
                  </p>
                  <p className="leading-relaxed opacity-90 text-[11px]">
                    {isAr
                      ? 'إذا استمر عدد الموزعين (Seeds) عند 0 لأكثر من 30 دقيقة متواصلة، فسيقوم السيرفر بإلغاء التنزيل تلقائياً، وحذف الملفات الجزئية، وإرسال تنبيه بالبريد.'
                      : 'If seeds remain 0 for more than 30 consecutive minutes, the job will abort automatically, purge partial files, and notify you.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Run in Background & Cancel */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-white font-extrabold text-xs border border-purple-400/40 shadow-md transition"
                >
                  {isAr ? 'العمل في الخلفية (العودة للرئيسية)' : 'Run in Background (Return Home)'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelTorrent}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-rose-300 font-extrabold text-xs border border-rose-500/40 transition"
                >
                  {isAr ? 'إلغاء التنزيل' : 'Cancel Download'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Upload Successful Confirmation with LTR White File Path */}
      {currentStep === 5 && (
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-12 border border-emerald-500/30 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white theme-light:text-slate-950 mb-2">
              {isAr ? 'تم رفع الفيديو بنجاح واكتمال!' : 'Upload Successful and Completed!'}
            </h3>
            
            {/* FILE METADATA CONTAINER */}
            <div className="bg-purple-950 theme-light:bg-purple-800 p-4 rounded-2xl border-2 border-purple-400 max-w-md mx-auto shadow-xl text-left space-y-2 wizard-white-text my-3" dir="ltr">
              <span className="text-xs text-purple-200 font-bold block text-center mb-3 border-b border-purple-500/30 pb-2">{isAr ? 'بيانات الملف المرفوع' : 'Uploaded File Metadata'}</span>
              
              <ul className="text-sm space-y-2 px-2 pb-2">
                <li className="flex items-start">
                  <span className="font-bold text-pink-300 mr-2 w-20">Name:</span>
                  <span className="font-extrabold text-white break-words flex-1 leading-tight">{videoFile?.name}</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-pink-300 mr-2 w-20">Size:</span>
                  <span className="font-extrabold text-white flex-1">{videoFile ? (videoFile.size / (1024 * 1024)).toFixed(2) : '0.00'} MB</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-pink-300 mr-2 w-20">Duration:</span>
                  <span className="font-extrabold text-white flex-1">{videoDuration}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={startAIProcessing}
              className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-4 mx-auto rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white font-black text-base shadow-xl shadow-purple-500/30 hover:scale-105 transition-all wizard-white-text border-2 border-purple-400"
            >
              <Cpu className="w-5 h-5 text-pink-200" />
              <span>{isAr ? 'المتابعة إلى تفريغ الصوت الياباني' : 'Proceed with Japanese Audio Transcribing'}</span>
              {isAr ? <ArrowLeft className="w-5 h-5 text-white" /> : <ArrowRight className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Audio Extraction & Dedicated Video Subbing AI Processing Animation */}
      {currentStep === 6 && (
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-12 border border-purple-500/30 text-center space-y-8">
          
          {errorMessage ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white theme-light:text-slate-950">{isAr ? 'خطأ في المعالجة' : 'Audio / AI Processing Error'}</h3>
              <p className="text-sm text-rose-300 theme-light:text-rose-700 max-w-md mx-auto leading-relaxed font-extrabold">{errorMessage}</p>
              
              <div className="pt-4 flex justify-center space-x-4">
                <button
                  onClick={startAIProcessing}
                  className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 to-pink-600 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                  <span>{isAr ? 'إعادة المحاولة' : 'Retry Audio Processing'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* MEANINGFUL VIDEO SUBBING AI ANIMATION GRAPHIC */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                {/* Rotating Outer Subtitle Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-purple-500/50 animate-spin" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-2 rounded-full border-2 border-pink-500/40 animate-ping" style={{ animationDuration: '3s' }} />
                
                {/* Center Video Subbing Core Badge */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-700 via-pink-600 to-indigo-600 p-0.5 shadow-2xl shadow-purple-500/40 flex items-center justify-center relative z-10">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center relative overflow-hidden">
                    <Film className="w-8 h-8 text-pink-400 animate-pulse" />
                    <Sparkles className="w-5 h-5 text-yellow-300 absolute top-1 right-1 animate-spin" />
                    <MessageSquare className="w-4 h-4 text-sky-400 absolute bottom-1.5 left-1.5" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white theme-light:text-slate-950 mb-1">
                  {isAr ? 'معالجة وتفريغ الصوت الياباني' : 'Japanese Audio Processing & Transcribing'}
                </h3>
                <p className="text-sm text-purple-300 theme-light:text-purple-950 font-extrabold max-w-md mx-auto opacity-80">
                  {isAr ? 'بدعم من ذكاء msoms الاصطناعي' : 'Powered by msoms\'s AI'}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-5 text-left" dir={isAr ? 'rtl' : 'ltr'}>
                
                {/* Step 1: Extracting Audio */}
                <div>
                  <div className="flex justify-between text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                    <span>{isAr ? '1. استخراج الصوت الياباني' : '1. Japanese Audio Extraction'}</span>
                    <span className="text-emerald-400">{progressExtract}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden mt-2">
                    <div className="h-full rounded-full shimmer-bar bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${progressExtract}%` }} />
                  </div>
                </div>

                {/* Step 2: Transcoding to AI */}
                <div>
                  <div className="flex justify-between text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                    <span>{isAr ? '2. تفريغ الصوت الياباني' : '2. Japanese Audio Transcribing'}</span>
                    <span className="text-pink-400">{progressTranscode}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden mt-2">
                    <div className="h-full rounded-full shimmer-bar bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-500" style={{ width: `${progressTranscode}%` }} />
                  </div>
                </div>

                {/* Step 3: Translating AI Processing */}
                <div>
                  <div className="flex justify-between text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                    <span>{isAr ? '3. ترجمة الصوت الياباني' : '3. Japanese Audio Translating'}</span>
                    <span className="text-indigo-400">{progressTranslate}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden mt-2">
                    <div className="h-full rounded-full shimmer-bar bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-500" style={{ width: `${progressTranslate}%` }} />
                  </div>
                </div>
                
                {/* Overall Status Text & Immediate Action */}
                <div className="text-center pt-2 space-y-3">
                  <span className="text-xs font-black text-purple-400 theme-light:text-purple-900 bg-purple-950/50 theme-light:bg-purple-100 px-4 py-1.5 rounded-xl inline-block border border-purple-500/20">{processStatusMsg}</span>

                  {processProgress === 100 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const prjRes = await fetch(`/api/project/${projectId}`);
                            const pData = await prjRes.json();
                            if (pData && !pData.error) onCompleteProcess(pData);
                          } catch (e) {
                            console.error('Manual open error:', e);
                          }
                        }}
                        className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:scale-105 text-white font-black text-sm shadow-xl shadow-emerald-500/30 border-2 border-emerald-400 transition cursor-pointer"
                      >
                        {isAr ? 'فتح محرر الترجمة الآن' : 'Open Subtitle Workspace Now'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
}
