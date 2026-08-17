import React, { useState } from 'react';
import { Upload, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, FileVideo, Layers, Cpu, AlertCircle, RefreshCw } from 'lucide-react';
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
    { id: 'Episode', label: isAr ? 'حلقة أنمي' : 'Anime Episode', desc: isAr ? 'حلقة كاملة من مسلسل أنمي' : 'Full anime series episode' },
    { id: 'Movie', label: isAr ? 'فيلم سينمائي' : 'Feature Movie', desc: isAr ? 'فيلم أنمي طويل' : 'Full length animated movie' },
    { id: 'Trailer', label: isAr ? 'عروض ترويجية (تريلر)' : 'Teaser / Trailer', desc: isAr ? 'فيديو ترويجي أو تشويقي' : 'Promotional trailer video' },
    { id: 'Clip', label: isAr ? 'مقطع فيديو قصير' : 'Short Video Clip', desc: isAr ? 'مقطع قصير أو مشهد مميز' : 'Short scene or highlights clip' }
  ];

  const stepLabels = isAr ? [
    'إعداد المشروع', 'تفاصيل الفيديو', 'اختيار الملف', 'جاري الرفع', 'مكتمل', 'معالجة الذكاء الاصطناعي'
  ] : [
    'Project Setup', 'Video Details', 'Select File', 'Uploading', 'Complete', 'AI Processing'
  ];

  // Step 3 -> Step 4 Upload Action
  const handleUploadClick = async () => {
    if (!videoFile) {
      alert(isAr ? 'الرجاء اختيار ملف فيديو MP4 أولاً' : 'Please select an MP4 video file first.');
      return;
    }

    setCurrentStep(4);
    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('video', videoFile);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 400);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      clearInterval(interval);

      if (data.success) {
        setUploadProgress(100);
        setProjectId(data.projectId);
        setTimeout(() => {
          setIsUploading(false);
          setUploadCompleted(true);
          setCurrentStep(5);
        }, 600);
      } else {
        alert(data.error || 'Upload failed');
        setCurrentStep(3);
      }
    } catch (err) {
      clearInterval(interval);
      console.error('Upload error:', err);
      alert(isAr ? 'خطأ في الاتصال أثناء الرفع' : 'Network upload error. Please try again.');
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
            <ArrowLeft className="w-4 h-4 text-white" />
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
            <label className="block text-xs font-black text-slate-300 theme-light:text-slate-950 mb-2">
              {isAr ? 'نوع المشروع' : 'Project Type'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {projectTypes.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setProjectType(t.id)}
                  className={`p-4.5 rounded-2xl transition flex items-start space-x-3 rtl:space-x-reverse text-left rtl:text-right ${
                    projectType === t.id
                      ? 'wizard-selected-card shadow-lg'
                      : 'wizard-unselected-card hover:scale-[1.01]'
                  }`}
                >
                  <Layers className={`w-5 h-5 shrink-0 mt-0.5 ${projectType === t.id ? 'text-yellow-300' : 'text-purple-600'}`} />
                  <div>
                    <h4 className="text-sm font-black mb-0.5">{t.label}</h4>
                    <p className="text-xs font-bold leading-relaxed">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              disabled={!projectName.trim()}
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
            >
              <span>{isAr ? 'التالي: تفاصيل الفيديو' : 'Next: Media Details'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
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
              className="px-7 py-3.5 rounded-2xl bg-slate-900 theme-light:bg-slate-900 text-white font-black text-sm border-2 border-slate-700 hover:bg-slate-800 transition shadow-md wizard-white-text"
            >
              {isAr ? 'السابق' : 'Back'}
            </button>
            <button
              disabled={!mediaTitle.trim()}
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-sm transition shadow-lg shadow-purple-500/30 wizard-white-text border-2 border-purple-400"
            >
              <span>{isAr ? 'التالي: رفع الملف' : 'Next: Upload File'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Upload MP4 Video */}
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

          <div className="border-3 border-dashed border-purple-500/50 theme-light:border-purple-600 hover:border-purple-400 bg-purple-950/20 theme-light:bg-purple-50 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 theme-light:bg-purple-200 border border-purple-500/30 flex items-center justify-center text-purple-400 theme-light:text-purple-800 mb-4">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            
            {videoFile ? (
              <div className="flex items-center space-x-3 rtl:space-x-reverse bg-slate-900 theme-light:bg-white px-5 py-3.5 rounded-2xl border-2 border-slate-700 theme-light:border-purple-400 shadow-md">
                <FileVideo className="w-6 h-6 text-pink-400 theme-light:text-purple-700" />
                <div className="text-left rtl:text-right">
                  <p className="text-sm font-black text-white theme-light:text-slate-950">{videoFile.name}</p>
                  <p className="text-xs text-slate-400 theme-light:text-slate-600 font-semibold">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-2" />
              </div>
            ) : (
              <>
                <p className="text-sm font-black text-slate-200 theme-light:text-purple-950">
                  {isAr ? 'اختر ملف فيديو MP4 من الجهاز' : 'Select MP4 video from local drive'}
                </p>
                <input
                  type="file"
                  accept="video/mp4"
                  onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
                  className="mt-4 cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-purple-600 file:text-white hover:file:bg-purple-500 text-xs text-slate-300 theme-light:text-slate-900 font-bold"
                />
              </>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-7 py-3.5 rounded-2xl bg-slate-900 theme-light:bg-slate-900 text-white font-black text-sm border-2 border-slate-700 hover:bg-slate-800 transition shadow-md wizard-white-text"
            >
              {isAr ? 'السابق' : 'Back'}
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

      {/* STEP 4: Uploading Progress with Cloud Motion */}
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

            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-slate-300 theme-light:text-slate-950">{videoFile?.name}</span>
              <span className="text-white bg-purple-950 theme-light:bg-purple-700 px-3 py-0.5 rounded-full border border-purple-500/30 wizard-white-text">
                {uploadProgress}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Upload Successful Confirmation */}
      {currentStep === 5 && (
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-12 border border-emerald-500/30 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white theme-light:text-slate-950 mb-2">
              {isAr ? 'تم رفع الفيديو بنجاح واكتمال!' : 'Upload Successful and Completed!'}
            </h3>
            <p className="text-sm text-slate-300 theme-light:text-slate-800 max-w-md mx-auto font-bold">
              {isAr ? 'تم حفظ ملف الفيديو في مجلد المشروع الخاص بك على السيرفر:' : 'Your video file has been saved in a unique project directory on the server:'}
              <br />
              <code className="text-xs text-purple-300 theme-light:text-purple-950 bg-slate-900 theme-light:bg-purple-100 px-3 py-1 rounded-xl border border-slate-800 theme-light:border-purple-400 mt-2 inline-block font-black">
                server/uploads/{projectId}/video.mp4
              </code>
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={startAIProcessing}
              className="flex items-center space-x-2 rtl:space-x-reverse px-8 py-4 mx-auto rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white font-black text-base shadow-xl shadow-purple-500/30 hover:scale-105 transition-all wizard-white-text border-2 border-purple-400"
            >
              <Cpu className="w-5 h-5 text-pink-200" />
              <span>{isAr ? 'استخراج الصوت ومعالجة الترجمة بـ Gemini AI' : 'Extract Audio & Process with Gemini AI'}</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Audio Extraction & Real Gemini AI Video Processing */}
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
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-xl shadow-purple-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-purple-400 animate-spin" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white theme-light:text-slate-950 mb-2">
                  {isAr ? 'جاري استخراج الصوت والمعالجة بالذكاء الاصطناعي' : 'Extracting Audio & Gemini AI Processing'}
                </h3>
                <p className="text-sm text-purple-300 theme-light:text-purple-950 font-extrabold max-w-md mx-auto">
                  {isAr ? 'استخراج الملف الصوتي محلياً، رفعه للـ AI، تفريغ الصوت الياباني بدقة، وترجمته للإنجليزية والعربية.' : 'Extracting audio track locally, uploading MP3 to Gemini API, transcribing Japanese speech timestamps, and translating to English & Arabic.'}
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
