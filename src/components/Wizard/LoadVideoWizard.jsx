import React, { useState } from 'react';
import { Upload, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, FileVideo, Layers, Cpu, AlertCircle, RefreshCw, Film, MessageSquare, Volume2, Clapperboard, Subtitles, Tv, Video } from 'lucide-react';
import CloudUploadAnimation from './CloudUploadAnimation.jsx';

export default function LoadVideoWizard({ onCompleteProcess, onCancel, lang = 'en' }) {
  const [currentStep, setCurrentStep] = useState(1);
  const isAr = lang === 'ar';

  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('Episode');
  const [mediaTitle, setMediaTitle] = useState('');

  // Upload State
  const [videoFile, setVideoFile] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCompleted, setUploadCompleted] = useState(false);

  // AI Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
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

  // Step 3 -> Step 4 Video File Upload to Server
  const handleUploadClick = async () => {
    if (!videoFile) {
      alert(isAr ? 'الرجاء اختيار ملف فيديو MP4 أولاً' : 'Please select an MP4 video file first.');
      return;
    }

    setCurrentStep(4);
    setIsUploading(true);
    setUploadProgress(10);

    // Active progress ticker interval (10% -> 92%)
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 92) return 92;
        return prev + 6;
      });
    }, 250);

    const createFormData = () => {
      const fd = new FormData();
      fd.append('video', videoFile);
      if (user?.id) fd.append('userId', user.id);
      if (projectName) fd.append('projectName', projectName);
      if (projectType) fd.append('projectType', projectType);
      if (mediaTitle) fd.append('mediaTitle', mediaTitle);
      return fd;
    };

    const reqHeaders = user?.id ? { 'x-user-id': user.id } : {};

    try {
      // Primary Upload Attempt: /api/upload
      let res = await fetch('/api/upload', {
        method: 'POST',
        headers: reqHeaders,
        body: createFormData()
      });

      // Fallback Attempt if Proxy Fails
      if (!res.ok && res.status !== 400 && res.status !== 500) {
        const directUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/upload`;
        res = await fetch(directUrl, {
          method: 'POST',
          headers: reqHeaders,
          body: createFormData()
        });
      }

      const data = await res.json();
      clearInterval(progressTimer);

      if (res.ok && data.success) {
        setUploadProgress(100);
        setProjectId(data.projectId);
        setTimeout(() => {
          setIsUploading(false);
          setUploadCompleted(true);
          setCurrentStep(5);
        }, 300);
      } else {
        setIsUploading(false);
        alert(data.error || (isAr ? 'فشل رفع فيديو المشروع. الرجاء المحاولة مرة أخرى.' : 'Upload failed. Please try again.'));
        setCurrentStep(3);
      }
    } catch (err) {
      clearInterval(progressTimer);
      setIsUploading(false);
      console.error('Upload Error:', err);
      alert(isAr ? 'خطأ في الاتصال بالسيرفر أثناء الرفع. الرجاء المحاولة مرة أخرى.' : 'Network connection error during upload. Please try again.');
      setCurrentStep(3);
    }
  };

  // Step 5 -> Step 6 AI Processing Pipeline
  const startAIProcessing = async () => {
    setCurrentStep(6);
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessProgress(15);
    setProcessStatusMsg(isAr ? 'جاري استخراج الصوت من الفيديو...' : 'Extracting audio track from video file...');

    const progressTimer = setInterval(() => {
      setProcessProgress(prev => {
        if (prev < 40) return prev + 5;
        if (prev < 80) return prev + 2;
        if (prev < 95) return prev + 1;
        return prev;
      });
    }, 1000);

    setTimeout(() => {
      setProcessStatusMsg(isAr ? 'جاري رفع الملف الصوتي إلى Gemini Files API...' : 'Uploading extracted audio track to Gemini Files API...');
    }, 3000);

    setTimeout(() => {
      setProcessStatusMsg(isAr ? 'جاري تفريغ الصوت الياباني والترجمة للإنجليزية والعربية...' : 'Transcribing Japanese speech & translating to English & Arabic...');
    }, 7000);

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName: projectName || 'Untitled Project',
          projectType,
          mediaTitle: mediaTitle || 'Untitled Video'
        })
      });

      const data = await res.json();
      clearInterval(progressTimer);

      if (!data.success) {
        setIsProcessing(false);
        setErrorMessage(data.message || (isAr ? 'فشلت معالجة الصوت بالذكاء الاصطناعي.' : 'Audio extraction / Gemini AI Processing failed.'));
        return;
      }

      setProcessProgress(100);
      setProcessStatusMsg(isAr ? 'اكتملت المعالجة! جاري فتح محرر الترجمة...' : 'Processing complete! Loading Working Table Workspace...');
      setTimeout(() => {
        setIsProcessing(false);
        onCompleteProcess(data.project);
      }, 600);

    } catch (err) {
      clearInterval(progressTimer);
      setIsProcessing(false);
      console.error('AI Processing fetch error:', err);
      setErrorMessage(isAr ? 'خطأ في الاتصال أثناء معالجة الصوت بالذكاء الاصطناعي.' : 'Network connection error during audio extraction / Gemini AI processing.');
    }
  };

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
            <label className="block text-xs font-black text-slate-300 theme-light:text-slate-950 mb-1.5">
              {isAr ? 'اسم المشروع' : 'Project Name'}
            </label>
            <input
              type="text"
              dir={isAr ? 'rtl' : 'ltr'}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={isAr ? 'مثال: مشروع ترجمة ون بيس - أرك وانو' : 'e.g. One Piece Wano Fansub Project'}
              className="w-full bg-slate-900 theme-light:bg-white border border-slate-700 theme-light:border-purple-400 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-sm text-white theme-light:text-slate-950 font-bold outline-none transition"
            />
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

      {/* STEP 3: Upload MP4 Video Dropzone */}
      {currentStep === 3 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-extrabold text-white theme-light:text-slate-950 mb-1">
              {isAr ? 'الخطوة 3: اختيار ملف الفيديو' : 'Step 3: Select Video File'}
            </h3>
            <p className="text-xs text-slate-300 theme-light:text-purple-950 font-bold">
              {isAr ? 'اختر ملف الفيديو بصيغة (.mp4) من جهازك ثم اضغط رفع.' : 'Select your video file from your local drive (.mp4 format) and click Upload.'}
            </p>
          </div>

          <div
            onClick={() => document.getElementById('hidden-video-input')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                setVideoFile(file);
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
              onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
              className="hidden"
            />

            {/* SOLID PURPLE CARD WITH PURE WHITE BOLD TEXT FOR SELECTED FILE (LTR) */}
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

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-7 py-3.5 rounded-2xl bg-slate-900 theme-light:bg-slate-900 text-white font-black text-sm border-2 border-slate-700 hover:bg-slate-800 transition shadow-md wizard-white-text"
            >
              {isAr ? <ArrowRight className="w-4 h-4 text-white" /> : <ArrowLeft className="w-4 h-4 text-white" />}
              <span>{isAr ? 'السابق' : 'Back'}</span>
            </button>
            <button
              disabled={!videoFile}
              onClick={handleUploadClick}
              className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>{isAr ? 'رفع الفيديو' : 'Upload Video'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Uploading Progress with Cloud Motion & LTR File Name */}
      {currentStep === 4 && (
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-10 border border-purple-500/30 text-center space-y-6">
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

            {/* FILE NAME IN PURE BOLD WHITE TEXT (LTR) */}
            <div className="flex items-center justify-between text-xs font-extrabold" dir="ltr">
              <span className="text-white font-black bg-purple-950 theme-light:bg-purple-800 px-4 py-1 rounded-xl border border-purple-400 shadow-sm text-left truncate max-w-xs">
                {videoFile?.name}
              </span>
              <span className="text-white bg-purple-950 theme-light:bg-purple-800 px-3 py-1 rounded-full border border-purple-400 wizard-white-text">
                {uploadProgress}%
              </span>
            </div>
          </div>
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
            
            {/* FILE NAME & PATH CONTAINER: SOLID PURPLE WITH BOLD WHITE TEXT (LTR) */}
            <div className="bg-purple-950 theme-light:bg-purple-800 p-4.5 rounded-2xl border-2 border-purple-400 max-w-md mx-auto shadow-xl text-center space-y-1.5 wizard-white-text my-3" dir="ltr">
              <span className="text-xs text-purple-200 font-bold block">{isAr ? 'مسار وتفاصيل الملف المرفوع:' : 'Uploaded File Directory:'}</span>
              <p className="text-sm font-extrabold text-white text-left truncate">{videoFile?.name}</p>
              <code className="text-xs font-mono font-black text-pink-300 text-left block">
                server/uploads/{projectId}/video.mp4
              </code>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={startAIProcessing}
              className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-4 mx-auto rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white font-black text-base shadow-xl shadow-purple-500/30 hover:scale-105 transition-all wizard-white-text border-2 border-purple-400"
            >
              <Cpu className="w-5 h-5 text-pink-200" />
              <span>{isAr ? 'استخراج الصوت ومعالجة الترجمة بـ Gemini AI' : 'Extract Audio & Process with Gemini AI'}</span>
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
                  <span>{isAr ? 'إعادة المحاولة' : 'Retry Audio Extraction & Gemini AI'}</span>
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
                <h3 className="text-2xl sm:text-3xl font-black text-white theme-light:text-slate-950 mb-2">
                  {isAr ? 'معالجة وتفريغ ترجمة الفيديو بالذكاء الاصطناعي' : 'Extracting & AI Subtitling Video Track'}
                </h3>
                <p className="text-sm text-purple-300 theme-light:text-purple-950 font-extrabold max-w-md mx-auto">
                  {isAr ? 'استخراج الملف الصوتي، تحليل التزامن، تفريغ الصوت الياباني بالملي ثانية، وتوليد الترجمة الإنجليزية والعربية.' : 'Extracting audio, analyzing timestamps with millisecond accuracy, transcribing Japanese speech, and building English & Arabic subtitle files.'}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3">
                <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full shimmer-bar transition-all duration-500"
                    style={{ width: `${processProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-purple-400 theme-light:text-purple-950">{processStatusMsg}</span>
                  <span className="text-white bg-purple-950 theme-light:bg-purple-700 px-3 py-0.5 rounded-full border border-purple-500/30 wizard-white-text">
                    {processProgress}%
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
}
