import React, { useState } from 'react';
import { Upload, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, FileVideo, Layers, Cpu, AlertCircle, RefreshCw } from 'lucide-react';
import CloudUploadAnimation from './CloudUploadAnimation.jsx';

export default function LoadVideoWizard({ onCompleteProcess, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);

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
    { id: 'Episode', label: 'Anime Episode', desc: 'Full anime series episode' },
    { id: 'Movie', label: 'Feature Movie', desc: 'Full length animated movie' },
    { id: 'Trailer', label: 'Teaser / Trailer', desc: 'Promotional trailer video' },
    { id: 'Clip', label: 'Short Video Clip', desc: 'Short scene or highlights clip' }
  ];

  // Step 3 -> Step 4 Upload Action
  const handleUploadClick = async () => {
    if (!videoFile) {
      alert('Please select an MP4 video file first.');
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
      alert('Network upload error. Please try again.');
      setCurrentStep(3);
    }
  };

  // Step 5 -> Step 6 AI Processing Pipeline
  const startAIProcessing = async () => {
    setCurrentStep(6);
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessProgress(15);
    setProcessStatusMsg('Extracting audio track from video file...');

    // Progress animation steps
    const progressTimer = setInterval(() => {
      setProcessProgress(prev => {
        if (prev < 40) return prev + 5;
        if (prev < 80) return prev + 2;
        if (prev < 95) return prev + 1;
        return prev;
      });
    }, 1000);

    setTimeout(() => {
      setProcessStatusMsg('Uploading extracted audio track to Gemini Files API...');
    }, 3000);

    setTimeout(() => {
      setProcessStatusMsg('Transcribing Japanese speech & translating to English & Arabic...');
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
        setErrorMessage(data.message || 'Audio extraction / Gemini AI Processing failed.');
        return;
      }

      setProcessProgress(100);
      setProcessStatusMsg('Processing complete! Loading Working Table Workspace...');
      setTimeout(() => {
        setIsProcessing(false);
        onCompleteProcess(data.project);
      }, 600);

    } catch (err) {
      clearInterval(progressTimer);
      setIsProcessing(false);
      console.error('AI Processing fetch error:', err);
      setErrorMessage('Network connection error during audio extraction / Gemini AI processing.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onCancel}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/20">
            Step {currentStep} of 6
          </span>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-6 gap-1.5">
          {['Project Setup', 'Video Details', 'Select File', 'Uploading', 'Complete', 'AI Processing'].map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = currentStep > stepNum;
            return (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-full h-2 rounded-full transition-all ${
                    isDone ? 'bg-purple-500' : isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse' : 'bg-slate-800'
                  }`}
                />
                <span className={`text-[10px] font-medium mt-1.5 hidden sm:inline truncate max-w-full ${isActive ? 'text-purple-300 font-semibold' : 'text-slate-500'}`}>
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
            <h3 className="text-2xl font-bold text-white mb-1">Step 1: Project Setup</h3>
            <p className="text-xs text-slate-400">
              Enter your project name and select the type of media project you are creating.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. One Piece Wano Fansub Project"
              className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-base text-white outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Project Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projectTypes.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setProjectType(t.id)}
                  className={`p-4 rounded-2xl border text-left transition flex items-start space-x-3 ${
                    projectType === t.id
                      ? 'bg-purple-950/80 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Layers className={`w-5 h-5 shrink-0 mt-0.5 ${projectType === t.id ? 'text-pink-400' : 'text-slate-500'}`} />
                  <div>
                    <h4 className="text-sm font-bold">{t.label}</h4>
                    <p className="text-xs opacity-75 mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              disabled={!projectName.trim()}
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-purple-500/20"
            >
              <span>Next: Media Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Name of Project & Video Title */}
      {currentStep === 2 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Step 2: Video Details</h3>
            <p className="text-xs text-slate-400">
              Specify the title of the video ({projectType}) for <span className="text-purple-300 font-semibold">{projectName}</span>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Title of {projectType}
            </label>
            <input
              type="text"
              value={mediaTitle}
              onChange={(e) => setMediaTitle(e.target.value)}
              placeholder={`e.g. Episode 1071: Gear 5 Awakens`}
              className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-base text-white outline-none transition"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm font-medium transition"
            >
              Back
            </button>
            <button
              disabled={!mediaTitle.trim()}
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-purple-500/20"
            >
              <span>Next: Upload File</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Upload MP4 Video */}
      {currentStep === 3 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Step 3: Select Video File</h3>
            <p className="text-xs text-slate-400">
              Select your video file from your local drive (.mp4 format) and click Upload.
            </p>
          </div>

          <div className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            
            {videoFile ? (
              <div className="flex items-center space-x-3 bg-slate-900 px-4 py-3 rounded-2xl border border-slate-700">
                <FileVideo className="w-6 h-6 text-pink-400" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{videoFile.name}</p>
                  <p className="text-xs text-slate-400">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-2" />
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-200">Select MP4 video from local drive</p>
                <input
                  type="file"
                  accept="video/mp4"
                  onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
                  className="mt-4 cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 text-xs text-slate-400"
                />
              </>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm font-medium transition"
            >
              Back
            </button>
            <button
              disabled={!videoFile}
              onClick={handleUploadClick}
              className="flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-purple-500/30"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Uploading Progress with Stick Figures Fighting */}
      {currentStep === 4 && (
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-10 border border-purple-500/30 text-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Uploading Video to Server</h3>
            <p className="text-xs text-purple-300">
              Please wait while your video file is being uploaded...
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

            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Uploading {videoFile?.name}</span>
              <span className="text-white bg-purple-950 px-3 py-0.5 rounded-full border border-purple-500/30">
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
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Upload Successful and Completed!
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your video file has been saved in a unique project directory on the server:
              <br />
              <code className="text-xs text-purple-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 mt-2 inline-block">
                server/uploads/{projectId}/video.mp4
              </code>
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={startAIProcessing}
              className="flex items-center space-x-2 px-8 py-4 mx-auto rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-bold text-base shadow-xl shadow-purple-500/30 hover:scale-105 transition-all"
            >
              <Cpu className="w-5 h-5 text-pink-200" />
              <span>Extract Audio & Process with Gemini AI</span>
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
              <h3 className="text-2xl font-bold text-white">Audio / AI Processing Error</h3>
              <p className="text-sm text-rose-300 max-w-md mx-auto leading-relaxed">{errorMessage}</p>
              
              <div className="pt-4 flex justify-center space-x-4">
                <button
                  onClick={startAIProcessing}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Audio Extraction & Gemini AI</span>
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
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                  Extracting Audio & Gemini AI Processing
                </h3>
                <p className="text-sm text-purple-300/80 max-w-md mx-auto">
                  Extracting audio track locally, uploading MP3 to Gemini API, transcribing Japanese speech timestamps, and translating to English & Arabic.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3">
                <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full shimmer-bar transition-all duration-500"
                    style={{ width: `${processProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-purple-400">{processStatusMsg}</span>
                  <span className="text-white bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-500/30">
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
