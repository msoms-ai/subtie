import React, { useState } from 'react';
import { Film, Upload, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, FileVideo, Layers, Cpu, Key, AlertCircle, RefreshCw } from 'lucide-react';
import StickFigureFightAnimation from './StickFigureFightAnimation.jsx';

export default function LoadVideoWizard({ onCompleteProcess, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('Episode'); // Movie, Trailer, Clip, Episode
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

  // API Key Prompt State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const projectTypes = [
    { id: 'Episode', label: 'Anime Episode', desc: 'Full anime series episode' },
    { id: 'Movie', label: 'Feature Movie', desc: 'Full length animated movie' },
    { id: 'Trailer', label: 'Teaser / Trailer', desc: 'Promotional trailer video' },
    { id: 'Clip', label: 'Short Video Clip', desc: 'Short scene or highlights clip' }
  ];

  // Step 3 -> Step 4 Upload Simulation Action
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
  const startAIProcessing = async (overrideApiKey = null) => {
    const activeApiKey = overrideApiKey || localStorage.getItem('SUBTIE_GEMINI_API_KEY') || '';

    if (!activeApiKey.trim()) {
      setShowApiKeyModal(true);
      return;
    }

    setCurrentStep(6);
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessProgress(10);
    setProcessStatusMsg('Uploading video to Gemini Files API...');

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName: projectName || 'Untitled Project',
          projectType,
          mediaTitle: mediaTitle || 'Untitled Video',
          apiKey: activeApiKey
        })
      });

      const data = await res.json();

      if (!data.success) {
        setIsProcessing(false);
        if (data.error === 'GEMINI_API_KEY_MISSING') {
          setShowApiKeyModal(true);
        } else {
          setErrorMessage(data.message || 'Gemini AI Processing failed.');
        }
        return;
      }

      setProcessProgress(100);
      setProcessStatusMsg('Processing complete! Loading Working Table Workspace...');
      setTimeout(() => {
        setIsProcessing(false);
        onCompleteProcess(data.project);
      }, 800);

    } catch (err) {
      setIsProcessing(false);
      console.error('AI Processing fetch error:', err);
      setErrorMessage('Network connection error while calling Gemini AI API.');
    }
  };

  const handleSaveModalApiKey = (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    localStorage.setItem('SUBTIE_GEMINI_API_KEY', apiKeyInput.trim());
    setShowApiKeyModal(false);
    startAIProcessing(apiKeyInput.trim());
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

          <StickFigureFightAnimation />

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
              onClick={() => startAIProcessing()}
              className="flex items-center space-x-2 px-8 py-4 mx-auto rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-bold text-base shadow-xl shadow-purple-500/30 hover:scale-105 transition-all"
            >
              <Cpu className="w-5 h-5 text-pink-200" />
              <span>Proceed to AI Video Processing</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Real Gemini AI Video Processing */}
      {currentStep === 6 && (
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-12 border border-purple-500/30 text-center space-y-8">
          
          {errorMessage ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white">Gemini AI Processing Error</h3>
              <p className="text-sm text-rose-300 max-w-md mx-auto leading-relaxed">{errorMessage}</p>
              
              <div className="pt-4 flex justify-center space-x-4">
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs"
                >
                  <Key className="w-4 h-4" />
                  <span>Update Gemini API Key</span>
                </button>
                <button
                  onClick={() => startAIProcessing()}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold text-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Processing</span>
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
                  Real Gemini AI Video Processing
                </h3>
                <p className="text-sm text-purple-300/80 max-w-md mx-auto">
                  Uploading video to Gemini Files API, extracting Japanese speech timestamps, and pre-translating to English & Arabic.
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

      {/* Gemini API Key Modal (Prompted if key is missing) */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md glass-panel-glow rounded-3xl p-6 text-slate-100 shadow-2xl border border-purple-500/40 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Enter Gemini API Key</h3>
                <p className="text-xs text-purple-300/80">Required to process your video with real AI</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To transcribe the actual audio track of your uploaded video file, please provide a Gemini API Key.
            </p>

            <form onSubmit={handleSaveModalApiKey} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-2">
                  Get a free key at{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 underline hover:text-pink-300"
                  >
                    Google AI Studio
                  </a>.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold text-white shadow-lg"
                >
                  <span>Start Processing</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
