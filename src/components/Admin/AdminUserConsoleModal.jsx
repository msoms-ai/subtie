import React, { useState, useEffect, useMemo } from 'react';
import ClusterDashboard from '../ClusterDashboard.jsx';
import {
  X, ShieldCheck, User, CheckCircle2, ShieldAlert, UserCheck, RefreshCw,
  Search, ChevronLeft, ChevronRight, PlusCircle, Ban, Trash2, FolderGit2,
  Film, Clock, Coins, DollarSign, Activity, AlertTriangle, FileText, Send,
  Sparkles, Smartphone, Monitor, Code, Mail, PlayCircle, RotateCcw, AlertOctagon,
  Wrench, Download, Cpu, HardDrive, Check, ExternalLink, HelpCircle
} from 'lucide-react';

export default function AdminUserConsoleModal({ isOpen, onClose, currentUser, lang = 'en' }) {
  const isAr = lang === 'ar';

  // Navigation tab state: 'users' | 'cluster' | 'logs' | 'settings' | 'newsletter'
  const [activeTab, setActiveTab] = useState('users');

  // Common notification banners
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // -------------------------------------------------------------
  // TAB 1: USERS STATE & PAGINATION
  // -------------------------------------------------------------
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Modals for user actions
  const [creditModalUser, setCreditModalUser] = useState(null);
  const [creditMinutesInput, setCreditMinutesInput] = useState('60');
  const [creditReasonInput, setCreditReasonInput] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: SYSTEM LOGS & INCIDENT RECOVERY
  // -------------------------------------------------------------
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSeverity, setLogSeverity] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logStats, setLogStats] = useState({ total: 0, error: 0, warning: 0, stalled: 0, info: 0 });
  const [isRecovering, setIsRecovering] = useState(false);
  const [monitoredProjects, setMonitoredProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [manualProjectId, setManualProjectId] = useState('');

  // -------------------------------------------------------------
  // TAB 4: AI SETTINGS STATE
  // -------------------------------------------------------------
  const [settings, setSettings] = useState({
    geminiModel: 'gemini-3.8-flash',
    fallbackModel1: 'gemini-2.5-flash',
    fallbackModel2: 'gemini-2.5-pro',
    visionOcrModel: 'gemini-3.8-flash',
    apiIngestionStrategy: 'file_api',
    audioChunkDurationSec: 180,
    maxOutputTokens: 8192,
    adminAlertEmail: 'msoms1@gmail.com'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [testingModelKey, setTestingModelKey] = useState('');
  const [healthCheckResult, setHealthCheckResult] = useState(null);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);

  // -------------------------------------------------------------
  // TAB 5: NEWSLETTER STATE
  // -------------------------------------------------------------
  const [newsletterSubscribers, setNewsletterSubscribers] = useState({ total: 0, verified: 0 });
  const [newsletterTopic, setNewsletterTopic] = useState('');
  const [newsletterTone, setNewsletterTone] = useState('hype');
  const [newsletterLang, setNewsletterLang] = useState(lang);
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterHtml, setNewsletterHtml] = useState('');
  const [isGeneratingNewsletter, setIsGeneratingNewsletter] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile' | 'code'
  const [newsletterHistory, setNewsletterHistory] = useState([]);
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);
  const [newsletterSendModal, setNewsletterSendModal] = useState(false);

  // -------------------------------------------------------------
  // INITIAL DATA FETCHING ON OPEN
  // -------------------------------------------------------------
  useEffect(() => {
    if (isOpen && currentUser?.role === 'Admin') {
      fetchUsersList();
      fetchSettings();
      fetchLogs();
      fetchNewsletterData();
    }
  }, [isOpen, currentUser]);

  const clearAlerts = () => {
    setError('');
    setMessage('');
  };

  // =============================================================
  // USER MANAGEMENT HANDLERS
  // =============================================================
  const fetchUsersList = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users.');
      setUsers(data.users || []);
    } catch (err) {
      console.error('fetchUsersList error:', err);
      setError(err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    clearAlerts();
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role.');
      setMessage(data.message || (isAr ? 'تم تحديث رتبة المستخدم بنجاح' : 'User role updated successfully'));
      fetchUsersList();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleSuspend = async (user) => {
    clearAlerts();
    const actionName = user.isSuspended ? (isAr ? 'تنشيط' : 'Unsuspend') : (isAr ? 'تجميد' : 'Suspend');
    if (!window.confirm(isAr ? `هل أنت متأكد من ${actionName} حساب ${user.email}؟` : `Are you sure you want to ${actionName} ${user.email}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ isSuspended: !user.isSuspended })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle account suspension');
      setMessage(data.message);
      fetchUsersList();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddCreditsSubmit = async (e) => {
    e.preventDefault();
    if (!creditModalUser) return;
    setIsSubmittingCredit(true);
    clearAlerts();
    try {
      const minutes = parseInt(creditMinutesInput, 10);
      if (isNaN(minutes) || minutes === 0) {
        throw new Error(isAr ? 'الرجاء إدخال عدد دقائق صالح' : 'Please enter a valid amount of minutes');
      }
      const res = await fetch(`/api/admin/users/${creditModalUser.id}/credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ minutes, reason: creditReasonInput || 'Admin Grant' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add minutes credits');
      setMessage(data.message);
      if (creditModalUser.id === currentUser?.id && typeof data.minuteBalance === 'number') {
        window.dispatchEvent(new CustomEvent('subtie_refresh_user', { detail: { minuteBalance: data.minuteBalance } }));
      } else {
        window.dispatchEvent(new CustomEvent('subtie_refresh_user'));
      }
      setCreditModalUser(null);
      setCreditReasonInput('');
      fetchUsersList();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const handleDeleteUserSubmit = async () => {
    if (!deleteModalUser) return;
    setIsSubmittingDelete(true);
    clearAlerts();
    try {
      const res = await fetch(`/api/admin/users/${deleteModalUser.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user account');
      setMessage(data.message);
      setDeleteModalUser(null);
      fetchUsersList();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Filtered and Paginated users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = userSearch.toLowerCase().trim();
      const matchSearch = !q ||
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.msomsUsername && u.msomsUsername.toLowerCase().includes(q));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && !u.isSuspended) ||
        (statusFilter === 'suspended' && u.isSuspended);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, currentPage, usersPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, roleFilter, statusFilter]);

  // =============================================================
  // SYSTEM LOGS & INCIDENT RECOVERY HANDLERS
  // =============================================================
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/system/logs?severity=${logSeverity}&search=${encodeURIComponent(logSearch)}&limit=100`, {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        if (data.stats) setLogStats(data.stats);
      }
    } catch (err) {
      console.error('fetchLogs error:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchMonitoredProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const res = await fetch('/api/admin/projects/status', {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (data.success) {
        setMonitoredProjects(data.projects || []);
      }
    } catch (err) {
      console.error('fetchMonitoredProjects error:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
      fetchMonitoredProjects();
    }
  }, [activeTab, logSeverity]);

  const handleClearLogs = async () => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من رغبتك في مسح سجلات النظام؟' : 'Are you sure you want to clear system logs?')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/system/logs', {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (data.success) {
        setMessage(isAr ? 'تم مسح السجلات بنجاح' : 'System logs cleared');
        fetchLogs();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `subtie_system_logs_${Date.now()}.json`);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleRecoverTask = async (action, projectId = null) => {
    setIsRecovering(true);
    clearAlerts();
    try {
      const res = await fetch('/api/admin/system/recover-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ action, projectId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recovery action failed');
      setMessage(data.message || (isAr ? 'تم تنفيذ عملية التعافي بنجاح' : 'Recovery action executed successfully'));
      fetchLogs();
      fetchMonitoredProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRecovering(false);
    }
  };

  // =============================================================
  // AI SETTINGS HANDLERS
  // =============================================================
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    clearAlerts();
    try {
      const res = await fetch('/api/settings/models', {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch models');
      if (data.success && data.models) {
        setAvailableModels(data.models);
        setMessage(
          data.warning
            ? (isAr ? 'تم تحميل القائمة الاحتياطية (تعذر الاتصال المباشر بـ API)' : 'Loaded offline fallback model list')
            : (isAr ? 'تم تحديث قائمة النماذج بنجاح من Google API!' : 'Live models refreshed successfully from Google API!')
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestSpecificModel = async (modelName, keyName) => {
    if (!modelName) return;
    setTestingModelKey(keyName);
    clearAlerts();
    try {
      const res = await fetch('/api/settings/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName })
      });
      const data = await res.json();
      if (data.success) {
        alert((isAr ? `نجاح! استجاب النموذج (${modelName}):\n` : `Success! Model replied (${modelName}):\n`) + data.text);
      } else {
        alert((isAr ? `فشل اختبار النموذج (${modelName}):\n` : `Test failed for (${modelName}):\n`) + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error testing model: ' + err.message);
    } finally {
      setTestingModelKey('');
    }
  };

  const handleRunHealthCheck = async () => {
    setIsRunningHealthCheck(true);
    clearAlerts();
    setHealthCheckResult(null);
    try {
      const res = await fetch('/api/settings/health-check', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Health check failed');
      setHealthCheckResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    clearAlerts();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setMessage(isAr ? 'تم حفظ إعدادات محرك الذكاء الاصطناعي بنجاح!' : 'AI engine system settings saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // =============================================================
  // NEWSLETTER HANDLERS
  // =============================================================
  const fetchNewsletterData = async () => {
    try {
      const [resSub, resHist] = await Promise.all([
        fetch('/api/admin/newsletter/subscribers', { headers: { 'x-user-id': currentUser.id } }),
        fetch('/api/admin/newsletter/history', { headers: { 'x-user-id': currentUser.id } })
      ]);
      const dataSub = await resSub.json();
      const dataHist = await resHist.json();

      if (dataSub.success) {
        setNewsletterSubscribers(dataSub);
      }
      if (dataHist.success) {
        setNewsletterHistory(dataHist.history || []);
      }
    } catch (err) {
      console.error('fetchNewsletterData error:', err);
    }
  };

  const handleGenerateNewsletter = async () => {
    if (!newsletterTopic.trim()) {
      setError(isAr ? 'يرجى كتابة موضوع أو فكرة النشرة البريدية أولاً' : 'Please provide a newsletter topic/announcement first');
      return;
    }
    setIsGeneratingNewsletter(true);
    clearAlerts();
    try {
      const res = await fetch('/api/admin/newsletter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          topic: newsletterTopic,
          tone: newsletterTone,
          lang: newsletterLang
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate newsletter');
      if (data.subject) setNewsletterSubject(data.subject);
      if (data.html) setNewsletterHtml(data.html);
      setMessage(isAr ? 'تم إنشاء قالب النشرة بنجاح بواسطة الذكاء الاصطناعي!' : 'Newsletter template generated successfully with AI!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGeneratingNewsletter(false);
    }
  };

  const handleSendTestNewsletter = async () => {
    if (!newsletterSubject.trim() || !newsletterHtml.trim()) {
      setError(isAr ? 'يرجى كتابة العنوان وتوليد المحتوى قبل الإرسال التجريبي' : 'Subject and content are required for test send');
      return;
    }
    setIsSendingNewsletter(true);
    clearAlerts();
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          subject: `[TEST] ${newsletterSubject}`,
          html: newsletterHtml,
          isTest: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test newsletter');
      setMessage(data.message || (isAr ? 'تم إرسال بريد المعاينة التجريبي للمدير بنجاح!' : 'Test newsletter email sent successfully to Admin!'));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSendingNewsletter(false);
    }
  };

  const handleSendBlastCampaign = async () => {
    if (!newsletterSubject.trim() || !newsletterHtml.trim()) {
      setError(isAr ? 'الرجاء التأكد من وجود عنوان ومحتوى للنشرة' : 'Please provide subject and content');
      return;
    }
    setIsSendingNewsletter(true);
    clearAlerts();
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          subject: newsletterSubject,
          html: newsletterHtml,
          isTest: false
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch newsletter campaign');
      setMessage(data.message || (isAr ? 'تم إطلاق حملة النشرة البريدية بنجاح لجميع المشتركين!' : 'Newsletter blast dispatched successfully!'));
      setNewsletterSendModal(false);
      fetchNewsletterData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSendingNewsletter(false);
    }
  };

  if (!isOpen || currentUser?.role !== 'Admin') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div
        className="w-full max-w-6xl glass-panel p-4 sm:p-7 rounded-3xl border border-purple-500/40 space-y-5 shadow-2xl relative max-h-[94vh] flex flex-col overflow-hidden text-slate-100"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* ========================================================= */}
        {/* TOP HEADER BAR */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between gap-4 border-b border-purple-500/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white theme-light:text-slate-950 tracking-tight">
                  {isAr ? 'مركز قيادة النظام والإدارة (Subtie Ver. 2)' : 'System Command Console (Subtie Ver. 2)'}
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 border border-rose-500/40 text-rose-300">
                  v2.0 Admin
                </span>
              </div>
              <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold mt-0.5">
                {isAr
                  ? 'إدارة الحسابات والرصيد، مراقبة العتاد والسيرفر، استعادة المهام، إعدادات الذكاء الاصطناعي، والنشرات البريدية'
                  : 'User balances, hardware telemetry, task incident recovery, dynamic AI parameters, and newsletter campaigns'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white bg-slate-900/90 hover:bg-rose-600/80 theme-light:bg-purple-800 p-2.5 rounded-xl border border-purple-500/30 transition shadow-md shrink-0 cursor-pointer"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB NAVIGATION BAR */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-purple-500/20 shrink-0 overflow-x-auto">
          <button
            onClick={() => { clearAlerts(); setActiveTab('users'); }}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{isAr ? 'إدارة المستخدمين' : 'User Accounts'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-purple-950/60 text-purple-200 border border-purple-400/30">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => { clearAlerts(); setActiveTab('cluster'); }}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'cluster'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>{isAr ? 'المهام ومراقبة السيرفر' : 'Tasks & Telemetry'}</span>
          </button>

          <button
            onClick={() => { clearAlerts(); setActiveTab('logs'); }}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{isAr ? 'سجلات النظام والتعافي' : 'System Logs & Recovery'}</span>
            {logStats.error > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-rose-600 text-white font-black animate-pulse">
                {logStats.error}
              </span>
            )}
          </button>

          <button
            onClick={() => { clearAlerts(); setActiveTab('settings'); }}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isAr ? 'إعدادات الذكاء الاصطناعي (AI)' : 'Dynamic AI Settings'}</span>
          </button>

          <button
            onClick={() => { clearAlerts(); setActiveTab('newsletter'); }}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'newsletter'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>{isAr ? 'النشرة البريدية (AI)' : 'AI Newsletter'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-pink-950/60 text-pink-200 border border-pink-400/30">
              {newsletterSubscribers.total}
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* BANNER ALERTS */}
        {/* ========================================================= */}
        {message && (
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB BODY (SCROLLABLE) */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* ------------------------------------------------------- */}
          {/* TAB 1: USERS (PAGINATED, COMPACT, ACTIONS)             */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-purple-500/20">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={isAr ? 'بحث بالاسم، البريد أو معرف مسومس...' : 'Search by name, email, or msoms tag...'}
                    className="w-full bg-slate-950 border border-purple-500/30 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                  >
                    <option value="all">{isAr ? 'كل الرتب' : 'All Roles'}</option>
                    <option value="Admin">Admin</option>
                    <option value="Translator">Translator</option>
                    <option value="Auditor">Auditor</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                  >
                    <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                    <option value="active">{isAr ? 'نشط' : 'Active'}</option>
                    <option value="suspended">{isAr ? 'مجمد' : 'Suspended'}</option>
                  </select>

                  <button
                    onClick={fetchUsersList}
                    disabled={isLoadingUsers}
                    className="p-2 bg-purple-900/60 hover:bg-purple-800 text-white rounded-xl border border-purple-500/30 transition disabled:opacity-50"
                    title={isAr ? 'تحديث القائمة' : 'Refresh List'}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-2xl border border-purple-500/30 bg-slate-950/40">
                <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                  <thead className="bg-purple-950/90 text-white font-black border-b border-purple-500/30">
                    <tr>
                      <th className="p-3">{isAr ? 'المستخدم' : 'User'}</th>
                      <th className="p-3">{isAr ? 'الرتبة والحالة' : 'Role & Status'}</th>
                      <th className="p-3 text-center" title={isAr ? 'المشاريع / الفيديوهات' : 'Projects / Videos'}>
                        <div className="flex items-center justify-center gap-1">
                          <FolderGit2 className="w-3.5 h-3.5 text-pink-400" />
                          <span>/</span>
                          <Film className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center" title={isAr ? 'الدقائق المستخدمة' : 'Minutes Used'}>
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isAr ? 'المستهلك' : 'Used'}</span>
                        </div>
                      </th>
                      <th className="p-3 text-center" title={isAr ? 'رصيد الدقائق المتبقي' : 'Minute Balance'}>
                        <div className="flex items-center justify-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isAr ? 'الرصيد' : 'Balance'}</span>
                        </div>
                      </th>
                      <th className="p-3 text-center" title={isAr ? 'إجمالي المدفوعات ($)' : 'Total Paid'}>
                        <div className="flex items-center justify-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-green-400" />
                          <span>{isAr ? 'المدفوع' : 'Paid'}</span>
                        </div>
                      </th>
                      <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-bold">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-6 text-center text-slate-400">
                          {isAr ? 'لا يوجد مستخدمون يطابقون شروط البحث' : 'No users found matching query'}
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((u) => {
                        const isSelf = u.id === currentUser.id;
                        return (
                          <tr
                            key={u.id}
                            className={`hover:bg-purple-900/20 transition ${u.isSuspended ? 'bg-rose-950/20 text-rose-200' : 'text-slate-200'}`}
                          >
                            {/* User details */}
                            <td className="p-3">
                              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                                <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs border shrink-0 ${
                                  u.isSuspended ? 'bg-rose-900 text-rose-200 border-rose-500' : 'bg-gradient-to-tr from-purple-700 to-pink-600 text-white border-purple-400/50'
                                }`}>
                                  {(u.firstName || u.email || 'U')[0].toUpperCase()}
                                </div>
                                <div className="leading-tight truncate max-w-[170px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white truncate">
                                      {u.firstName || ''} {u.lastName || ''}
                                    </span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-pink-500 text-white font-black">
                                        {isAr ? 'أنت' : 'You'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="block text-[11px] text-purple-300 truncate">{u.email}</span>
                                  {u.msomsUsername && (
                                    <span className="text-[10px] text-pink-400 block">@{u.msomsUsername}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Role & Status */}
                            <td className="p-3">
                              <div className="flex flex-col gap-1 items-start">
                                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-purple-500/40">
                                  {['Admin', 'Translator', 'Auditor'].map((r) => (
                                    <button
                                      key={r}
                                      disabled={isSelf && r !== 'Admin'}
                                      onClick={() => handleRoleChange(u.id, r)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition ${
                                        u.role === r
                                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                                          : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1">
                                  {u.isSuspended ? (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                      {isAr ? 'مجمد' : 'Suspended'}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                      {isAr ? 'نشط' : 'Active'}
                                    </span>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                    u.isVerified ? 'text-cyan-400' : 'text-amber-400'
                                  }`}>
                                    {u.isVerified ? (isAr ? 'مؤكد' : 'Verified') : (isAr ? 'غير مؤكد' : 'Unverified')}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Projects / Videos */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-pink-300 font-mono" title={isAr ? 'مشاريع' : 'Projects'}>
                                  {u.totalProjects || 0}
                                </span>
                                <span className="text-slate-500">/</span>
                                <span className="text-cyan-300 font-mono" title={isAr ? 'فيديوهات' : 'Videos'}>
                                  {u.totalVideos || 0}
                                </span>
                              </div>
                            </td>

                            {/* Minutes Used */}
                            <td className="p-3 text-center font-mono text-amber-300">
                              {u.totalMinutesUsed || 0}m
                            </td>

                            {/* Minute Balance */}
                            <td className="p-3 text-center font-mono text-emerald-400 font-black">
                              {u.minuteBalance || 0}m
                            </td>

                            {/* Total Paid */}
                            <td className="p-3 text-center font-mono text-green-400 font-bold">
                              ${(u.totalPaid || 0).toFixed(2)}
                            </td>

                            {/* Actions Column */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Add credits */}
                                <button
                                  onClick={() => {
                                    setCreditModalUser(u);
                                    setCreditMinutesInput('60');
                                    setCreditReasonInput('');
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 transition"
                                  title={isAr ? 'إضافة دقائق رصيد' : 'Add Minutes Credits'}
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                </button>

                                {/* Suspend toggle */}
                                <button
                                  disabled={isSelf}
                                  onClick={() => handleToggleSuspend(u)}
                                  className={`p-1.5 rounded-lg border transition disabled:opacity-40 ${
                                    u.isSuspended
                                      ? 'bg-amber-600/30 hover:bg-amber-600 text-amber-200 border-amber-500/40'
                                      : 'bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border-slate-700'
                                  }`}
                                  title={u.isSuspended ? (isAr ? 'تنشيط الحساب' : 'Unsuspend') : (isAr ? 'تجميد الحساب' : 'Suspend')}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete user & content */}
                                <button
                                  disabled={isSelf}
                                  onClick={() => setDeleteModalUser(u)}
                                  className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition disabled:opacity-40"
                                  title={isAr ? 'حذف الحساب وكافة المحتويات' : 'Delete Account & Content'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/40 p-2.5 rounded-xl border border-purple-500/20">
                <span>
                  {isAr
                    ? `عرض ${paginatedUsers.length} من إجمالي ${filteredUsers.length} مستخدم`
                    : `Showing ${paginatedUsers.length} of ${filteredUsers.length} users`}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-900 text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  </button>

                  <span className="font-mono font-bold text-purple-300">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-900 text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition"
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 2: CLUSTER & TELEMETRY DASHBOARD                   */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'cluster' && (
            <div className="py-1">
              <ClusterDashboard lang={lang} currentUser={currentUser} />
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 3: SYSTEM LOGS & INCIDENT RECOVERY                 */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Incident Recovery Action Bar */}
              <div className="bg-gradient-to-r from-purple-950/70 via-slate-900/90 to-pink-950/70 p-4 rounded-2xl border border-purple-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-pink-400" />
                    <span>{isAr ? 'أدوات الاستعادة الذاتية وفك المهام العالقة' : 'Incident Recovery & Task Salvage'}</span>
                  </h4>
                  <p className="text-xs text-purple-200">
                    {isAr
                      ? 'إجراءات لحماية مشاريع المستخدمين وفك الاختناقات دون فقدان التقدم'
                      : 'Rescue stalled background tasks, release orphaned mutexes, and recover audio chunks'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={isRecovering}
                    onClick={() => handleRecoverTask('clear_locks')}
                    className="px-3 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فك الاختناقات (Clear Locks)' : 'Clear Jammed Locks'}</span>
                  </button>

                  <button
                    disabled={isRecovering}
                    onClick={() => handleRecoverTask('retry_stalled')}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{isAr ? 'استئناف المهام المعلقة' : 'Retry Stalled Tasks'}</span>
                  </button>

                  <button
                    disabled={isRecovering}
                    onClick={() => handleRecoverTask('rechunk_stuck')}
                    className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إعادة تقطيع الصوت واستدراكه' : 'Re-chunk & Salvage Audio'}</span>
                  </button>
                </div>

                {/* Specific Project ID Rescue Bar */}
                <div className="w-full pt-3 border-t border-purple-500/20 flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-pink-400" />
                    <span>{isAr ? 'استعادة مشروع محدد بالمعرّف ID:' : 'Specific Project Salvage:'}</span>
                  </span>
                  <input
                    type="text"
                    value={manualProjectId}
                    onChange={(e) => setManualProjectId(e.target.value.trim())}
                    placeholder={isAr ? 'معرّف المشروع (مثال: subtie_179...)' : 'Project ID (e.g. subtie_179...)'}
                    className="bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 flex-1 min-w-[200px] max-w-sm"
                  />
                  <button
                    disabled={isRecovering || !manualProjectId}
                    onClick={() => handleRecoverTask('retry_project', manualProjectId)}
                    className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-40"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>{isAr ? 'إعادة المعالجة الذكية' : 'Retry Processing'}</span>
                  </button>
                  <button
                    disabled={isRecovering || !manualProjectId}
                    onClick={() => handleRecoverTask('rechunk_project', manualProjectId)}
                    className="px-3 py-1 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-40"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAr ? 'إعادة تقطيع (2د) واستدراك' : 'Re-chunk (2m) & Retry'}</span>
                  </button>
                </div>
              </div>

              {/* RECENT PROJECTS & TASKS HEALTH WATCHDOG */}
              <div className="bg-slate-900/80 rounded-2xl border border-purple-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-pink-400" />
                    <h4 className="text-xs font-black text-white">
                      {isAr ? 'مراقب المشاريع وتشخيص المهام الأخيرة (Recent Projects & Tasks)' : 'Recent Projects & Task Diagnostics'}
                    </h4>
                  </div>
                  <button
                    onClick={fetchMonitoredProjects}
                    disabled={isLoadingProjects}
                    className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-white"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingProjects ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'تحديث المشاريع' : 'Refresh Projects'}</span>
                  </button>
                </div>

                {monitoredProjects.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    {isLoadingProjects ? (isAr ? 'جاري فحص المشاريع...' : 'Checking projects...') : (isAr ? 'لا توجد مشاريع مسجلة حالياً' : 'No projects found')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {monitoredProjects.slice(0, 10).map((p) => {
                      const isFailed = p.status === 'failed' || (p.status === 'ready' && p.subtitlesCount === 0);
                      const isProcessing = p.status === 'processing';

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-xs transition ${
                            isFailed
                              ? 'bg-rose-950/30 border-rose-500/40'
                              : isProcessing
                              ? 'bg-purple-950/40 border-purple-500/40 animate-pulse'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white truncate max-w-[180px]" title={p.projectName}>
                                  {p.projectName}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                  isFailed
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : isProcessing
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}>
                                  {isFailed ? (p.subtitlesCount === 0 && p.status === 'ready' ? (isAr ? '0 أسطر (فشل)' : '0 lines (failed)') : (isAr ? 'فشل' : 'Failed')) : isProcessing ? (isAr ? `معالجة ${p.processingProgress}%` : `Processing ${p.processingProgress}%`) : (isAr ? `جاهز (${p.subtitlesCount} سطر)` : `Ready (${p.subtitlesCount} lines)`)}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate" title={p.id}>
                                ID: {p.id} {p.duration ? `• ${Math.round(p.duration / 60)}m` : ''}
                              </p>
                              {p.processingStatus && (
                                <p className={`text-[10px] mt-1 line-clamp-1 ${isFailed ? 'text-rose-400 font-medium' : 'text-slate-400'}`}>
                                  {p.processingStatus}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 border-t border-purple-500/10 justify-end">
                            <button
                              disabled={isRecovering}
                              onClick={() => handleRecoverTask('retry_project', p.id)}
                              className="px-2 py-1 rounded-lg bg-purple-700/80 hover:bg-purple-600 text-white text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                              title={isAr ? 'إعادة المعالجة الذكية' : 'Retry Processing'}
                            >
                              <PlayCircle className="w-3 h-3" />
                              <span>{isAr ? 'إعادة المعالجة' : 'Retry AI'}</span>
                            </button>
                            <button
                              disabled={isRecovering}
                              onClick={() => handleRecoverTask('rechunk_project', p.id)}
                              className="px-2 py-1 rounded-lg bg-pink-700/80 hover:bg-pink-600 text-white text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                              title={isAr ? 'إعادة تقطيع الصوت إلى 2د والمحاولة' : 'Re-chunk audio to 2m and retry'}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{isAr ? 'تقطيع 2د' : 'Re-chunk (2m)'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Log Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-900/60 p-3 rounded-2xl border border-purple-500/20">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['all', 'error', 'warning', 'stalled', 'info'].map(sev => {
                    const count = sev === 'all' ? logStats.total : logStats[sev] || 0;
                    return (
                      <button
                        key={sev}
                        onClick={() => setLogSeverity(sev)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition flex items-center gap-1.5 ${
                          logSeverity === sev
                            ? 'bg-purple-600 text-white shadow'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{sev}</span>
                        <span className="text-[10px] px-1.5 rounded-md bg-purple-950/80 text-purple-200">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                      placeholder={isAr ? 'بحث في السجلات...' : 'Search logs...'}
                      className="bg-slate-950 border border-purple-500/30 rounded-xl pl-8 pr-2.5 rtl:pl-2.5 rtl:pr-8 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 w-44 sm:w-56"
                    />
                  </div>

                  <button
                    onClick={fetchLogs}
                    disabled={isLoadingLogs}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
                    title={isAr ? 'تحديث' : 'Refresh'}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={handleExportLogs}
                    className="p-1.5 bg-slate-800 hover:bg-purple-800 text-purple-200 hover:text-white rounded-xl transition"
                    title={isAr ? 'تصدير JSON' : 'Export JSON'}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleClearLogs}
                    className="p-1.5 bg-rose-950/80 hover:bg-rose-700 text-rose-200 hover:text-white rounded-xl transition"
                    title={isAr ? 'مسح السجلات' : 'Clear Logs'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Logs Stream Container */}
              <div className="bg-slate-950/90 rounded-2xl border border-purple-500/30 font-mono text-xs overflow-hidden max-h-[460px] flex flex-col">
                <div className="bg-slate-900 px-4 py-2 text-[11px] text-slate-400 border-b border-purple-500/20 flex items-center justify-between">
                  <span>{isAr ? 'بث أحداث النظام وسجلات التشغيل المباشرة' : 'Live Platform Events & Telemetry Stream'}</span>
                  <span>{logs.length} {isAr ? 'سجل' : 'entries'}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/60">
                  {logs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      {isLoadingLogs ? (isAr ? 'جاري قراءة السجلات...' : 'Loading logs...') : (isAr ? 'لا توجد سجلات مطابقة' : 'No logs recorded')}
                    </div>
                  ) : (
                    logs.map((lg) => {
                      const sevColor =
                        lg.severity === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : lg.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : lg.severity === 'stalled'
                          ? 'bg-purple-500/20 text-pink-400 border-pink-500/40'
                          : 'bg-blue-500/20 text-cyan-400 border-cyan-500/40';

                      return (
                        <div key={lg.id} className="pt-2 flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-500">
                              {new Date(lg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase border ${sevColor}`}>
                              {lg.severity}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
                              {lg.category}
                            </span>
                            <span className="text-slate-200 font-sans text-xs flex-1">
                              {lg.message}
                            </span>
                          </div>

                          {(lg.details?.projectId || lg.meta?.projectId) && (
                            <div className="mt-1 flex items-center justify-between gap-2 flex-wrap bg-purple-950/40 border border-purple-500/30 px-2.5 py-1.5 rounded-lg text-[11px]">
                              <span className="text-pink-300 font-mono font-bold">
                                {isAr ? 'المشروع:' : 'Project:'} {lg.details?.projectId || lg.meta?.projectId}
                              </span>
                              <div className="flex items-center gap-1.5 rtl:mr-auto ltr:ml-auto">
                                <button
                                  disabled={isRecovering}
                                  onClick={() => handleRecoverTask('retry_project', lg.details?.projectId || lg.meta?.projectId)}
                                  className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  <PlayCircle className="w-3 h-3" />
                                  <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
                                </button>
                                <button
                                  disabled={isRecovering}
                                  onClick={() => handleRecoverTask('rechunk_project', lg.details?.projectId || lg.meta?.projectId)}
                                  className="px-2 py-0.5 rounded bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>{isAr ? 'تقطيع 2د' : 'Re-chunk (2m)'}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {lg.details && Object.keys(lg.details).length > 0 && (
                            <details className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded-lg cursor-pointer">
                              <summary className="hover:text-purple-300">{isAr ? 'عرض التفاصيل والبيانات' : 'View Payload Data'}</summary>
                              <pre className="mt-1 text-[10px] text-purple-200 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(lg.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 4: EXTENSIVE AI SETTINGS                           */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'settings' && (
            <div className="space-y-5 bg-slate-900/50 p-5 rounded-2xl border border-purple-500/20">
              {/* Proactive Watchdog Alert Notice */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-slate-950 border border-purple-500/40 space-y-2">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-pink-400 animate-pulse" />
                  <span>{isAr ? 'نظام الحراسة الاستباقي ومراقبة صلاحية النماذج' : 'Proactive Model Deprecation Watchdog'}</span>
                </div>
                <p className="text-xs text-purple-200 leading-relaxed">
                  {isAr
                    ? 'في حال تعطل أو انتهاء صلاحية أي استدعاء لنماذج Gemini، يقوم السيرفر بالتحويل التلقائي الفوري إلى النماذج البديلة (Fallbacks) دون انقطاع، ويرسل بريداً تنبيهياً فورياً لإدارة المنصة مع توصيات لتحديث الإعدادات.'
                    : 'If any Gemini model expires or returns deprecation errors, the backend automatically fails over to configured secondary models and dispatches an instant alert email to Admin advising updated parameters.'}
                </p>
              </div>

              {/* Models Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Primary Model */}
                <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-white">
                      {isAr ? 'النموذج الرئيسي (Primary Model)' : 'Primary Gemini Model'}
                    </label>
                    <button
                      onClick={() => handleTestSpecificModel(settings.geminiModel, 'primary')}
                      disabled={Boolean(testingModelKey)}
                      className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold transition disabled:opacity-40"
                    >
                      {testingModelKey === 'primary' ? (isAr ? 'جاري الفحص...' : 'Testing...') : (isAr ? 'اختبار' : 'Test')}
                    </button>
                  </div>
                  <input
                    type="text"
                    list="gemini-models-list"
                    value={settings.geminiModel || ''}
                    onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-pink-500"
                    placeholder="e.g. gemini-3.8-flash"
                  />
                  <p className="text-[10px] text-slate-400">
                    {isAr ? 'النموذج الأساسي لتفريغ الصوت وترجمة الحوارات.' : 'Core model for ASR speech transcription and translation.'}
                  </p>
                </div>

                {/* Vision OCR Model */}
                <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-white">
                      {isAr ? 'نموذج قراءة النصوص المرئية (Vision OCR)' : 'Vision OCR Model (Signs & Titles)'}
                    </label>
                    <button
                      onClick={() => handleTestSpecificModel(settings.visionOcrModel, 'vision')}
                      disabled={Boolean(testingModelKey)}
                      className="px-2 py-0.5 rounded bg-pink-700 hover:bg-pink-600 text-white text-[10px] font-bold transition disabled:opacity-40"
                    >
                      {testingModelKey === 'vision' ? (isAr ? 'جاري الفحص...' : 'Testing...') : (isAr ? 'اختبار' : 'Test')}
                    </button>
                  </div>
                  <input
                    type="text"
                    list="gemini-models-list"
                    value={settings.visionOcrModel || ''}
                    onChange={(e) => setSettings({ ...settings, visionOcrModel: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-pink-500"
                    placeholder="e.g. gemini-3.8-flash"
                  />
                  <p className="text-[10px] text-slate-400">
                    {isAr ? 'فحص إطارات الفيديو لاستخراج لافتات الأنمي والترجمة المصورة.' : 'Inspects visual frames for Japanese on-screen signs and title cards.'}
                  </p>
                </div>

                {/* Fallback Model 1 */}
                <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-white">
                      {isAr ? 'النموذج البديل الأول (Fallback Model 1)' : 'Secondary Fallback Model 1'}
                    </label>
                    <button
                      onClick={() => handleTestSpecificModel(settings.fallbackModel1, 'fb1')}
                      disabled={Boolean(testingModelKey)}
                      className="px-2 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold transition disabled:opacity-40"
                    >
                      {testingModelKey === 'fb1' ? (isAr ? 'جاري الفحص...' : 'Testing...') : (isAr ? 'اختبار' : 'Test')}
                    </button>
                  </div>
                  <input
                    type="text"
                    list="gemini-models-list"
                    value={settings.fallbackModel1 || ''}
                    onChange={(e) => setSettings({ ...settings, fallbackModel1: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-pink-500"
                    placeholder="e.g. gemini-2.5-flash"
                  />
                  <p className="text-[10px] text-slate-400">
                    {isAr ? 'البديل التلقائي الفوري عند تعثر أو انتهاء النموذج الرئيسي.' : 'Auto-fails over immediately if the primary model errors out.'}
                  </p>
                </div>

                {/* Fallback Model 2 */}
                <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-white">
                      {isAr ? 'النموذج البديل الثاني (Fallback Model 2)' : 'Safety Fallback Model 2'}
                    </label>
                    <button
                      onClick={() => handleTestSpecificModel(settings.fallbackModel2, 'fb2')}
                      disabled={Boolean(testingModelKey)}
                      className="px-2 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold transition disabled:opacity-40"
                    >
                      {testingModelKey === 'fb2' ? (isAr ? 'جاري الفحص...' : 'Testing...') : (isAr ? 'اختبار' : 'Test')}
                    </button>
                  </div>
                  <input
                    type="text"
                    list="gemini-models-list"
                    value={settings.fallbackModel2 || ''}
                    onChange={(e) => setSettings({ ...settings, fallbackModel2: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-pink-500"
                    placeholder="e.g. gemini-2.5-pro"
                  />
                  <p className="text-[10px] text-slate-400">
                    {isAr ? 'بديل الطوارئ ذو القدرة العالية للإنقاذ.' : 'Deep-reasoning safety net model if secondary tier fails.'}
                  </p>
                </div>
              </div>

              {/* Tuning Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Audio Ingestion Strategy */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-500/30 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {isAr ? 'طريقة تمرير الصوت (Ingestion Strategy)' : 'API Ingestion Strategy'}
                  </label>
                  <select
                    value={settings.apiIngestionStrategy || 'file_api'}
                    onChange={(e) => setSettings({ ...settings, apiIngestionStrategy: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                  >
                    <option value="file_api">Google File API (Resumable Uploads)</option>
                    <option value="inline_base64">Inline Base64 Chunks (Direct Payload)</option>
                  </select>
                  <p className="text-[10px] text-slate-500">
                    {isAr ? 'تحديد كيفية إرسال ملفات الصوت لـ Gemini.' : 'Strategy for transferring media to Gemini endpoints.'}
                  </p>
                </div>

                {/* Chunk Duration */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-500/30 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {isAr ? 'طول مقطع الصوت الافتراضي' : 'Default Audio Chunk'}
                  </label>
                  <select
                    value={settings.audioChunkDurationSec || 180}
                    onChange={(e) => setSettings({ ...settings, audioChunkDurationSec: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                  >
                    <option value={120}>2 {isAr ? 'دقائق (120 ثانية - إنقاذ)' : 'Minutes (120s - Fast/Recovery)'}</option>
                    <option value={180}>3 {isAr ? 'دقائق (180 ثانية - مستحسن)' : 'Minutes (180s - Recommended)'}</option>
                    <option value={240}>4 {isAr ? 'دقائق (240 ثانية)' : 'Minutes (240s)'}</option>
                    <option value={300}>5 {isAr ? 'دقائق (300 ثانية)' : 'Minutes (300s)'}</option>
                  </select>
                  <p className="text-[10px] text-slate-500">
                    {isAr ? 'طول التجزئة لمعالجة الصوت دون انقطاع.' : 'Segmentation window for precise timestamping.'}
                  </p>
                </div>

                {/* Admin Alert Email */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-500/30 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {isAr ? 'بريد تنبيهات المدير الفورية' : 'Admin Alert Email'}
                  </label>
                  <input
                    type="email"
                    value={settings.adminAlertEmail || ''}
                    onChange={(e) => setSettings({ ...settings, adminAlertEmail: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500 font-mono"
                    placeholder="admin@msoms.ai"
                  />
                  <p className="text-[10px] text-slate-500">
                    {isAr ? 'يتلقى إشعارات انتهاء صلاحية النماذج والتحويل.' : 'Receives deprecation & failover notifications.'}
                  </p>
                </div>
              </div>

              {/* Datalist for models */}
              <datalist id="gemini-models-list">
                {availableModels.map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>

              {/* Health Check Results Panel */}
              {healthCheckResult && (
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/40 space-y-2">
                  <h5 className="text-xs font-black text-white flex items-center justify-between">
                    <span>{isAr ? 'نتائج فحص سلامة النماذج والاتصال (AI Health Check)' : 'AI Health Check Results'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(healthCheckResult.timestamp).toLocaleTimeString()}
                    </span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                    {Object.entries(healthCheckResult.results || {}).map(([key, val]) => (
                      <div key={key} className={`p-2.5 rounded-lg border text-xs ${
                        val.status === 'ok' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      }`}>
                        <div className="font-bold flex items-center justify-between">
                          <span className="capitalize">{key}</span>
                          <span className="text-[10px] font-mono">{val.latencyMs}ms</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{val.model}</div>
                        <div className="text-[10px] mt-1 font-bold">
                          {val.status === 'ok' ? '✓ Responsive' : `✕ ${val.error}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-purple-500/20">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleFetchModels}
                    disabled={isFetchingModels}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-purple-200 px-3 py-2.5 rounded-xl border border-purple-500/30 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingModels ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'جلب النماذج المعتمدة من Google' : 'Fetch Google Models'}</span>
                  </button>

                  <button
                    onClick={handleRunHealthCheck}
                    disabled={isRunningHealthCheck}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white font-bold px-3 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isRunningHealthCheck ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'تشغيل فحص السلامة (Health Check)' : 'Run AI Health Check'}</span>
                  </button>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-black px-6 py-2.5 rounded-xl transition text-xs disabled:opacity-50 shadow-lg shadow-purple-500/25"
                >
                  {isSavingSettings ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ إعدادات الذكاء الاصطناعي' : 'Save AI Parameters')}
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 5: AI NEWSLETTER GENERATOR & DISPATCH              */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'newsletter' && (
            <div className="space-y-5">
              {/* Subscribers Counter Header */}
              <div className="bg-gradient-to-r from-pink-950/70 via-purple-950/80 to-slate-900 p-4 rounded-2xl border border-purple-500/30 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-pink-400" />
                    <span>{isAr ? 'منظومة النشرة البريدية الذكية (Subtie AI Newsletter)' : 'Subtie AI Newsletter Engine'}</span>
                  </h4>
                  <p className="text-xs text-purple-200">
                    {isAr
                      ? 'إنشاء قوالب بريد إلكتروني تفاعلية واحترافية متوافقة مع الهواتف والحواسب بواسطة Gemini'
                      : 'Generate responsive branded anime translation newsletters with contextual artwork and dispatch via noreply@subtie.msoms.ai'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-purple-500/40">
                    <span className="block text-[10px] text-slate-400">{isAr ? 'المشتركون' : 'Subscribers'}</span>
                    <span className="text-sm font-black text-pink-400 font-mono">{newsletterSubscribers.total}</span>
                  </div>
                  <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-purple-500/40">
                    <span className="block text-[10px] text-slate-400">{isAr ? 'المؤكدون' : 'Verified'}</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{newsletterSubscribers.verified}</span>
                  </div>
                </div>
              </div>

              {/* Generator Prompt Panel */}
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/20 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-white flex items-center justify-between">
                    <span>{isAr ? 'موضوع الإعلان أو النشرة البريدية (Topic / Update)' : 'Newsletter Topic & Announcement Details'}</span>
                    <span className="text-[10px] text-slate-400">{isAr ? 'مثال: إطلاق التحديث 2.0، ميزات التورنت الجديدة، أو مسابقة الترجمة' : 'e.g. Subtie 2.0 Launch, Torrent Feature, or Seasonal Anime'}</span>
                  </label>
                  <textarea
                    rows="3"
                    value={newsletterTopic}
                    onChange={(e) => setNewsletterTopic(e.target.value)}
                    placeholder={isAr ? 'صف هنا ما تريد إعلام المشتركين به بالتفصيل وسيقوم الذكاء الاصطناعي بصياغته وتصميمه كقالب بريدي جذاب...' : 'Describe what you want to announce to users, and Gemini will compose a branded responsive email...'}
                    className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {isAr ? 'نبرة الخطاب (Tone)' : 'Tone'}
                    </label>
                    <select
                      value={newsletterTone}
                      onChange={(e) => setNewsletterTone(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                    >
                      <option value="hype">{isAr ? 'حماسية وأنمي مشوقة (Anime Hype)' : 'Anime Hype & Energetic'}</option>
                      <option value="professional">{isAr ? 'رسمية واحترافية (Professional)' : 'Professional & Clean'}</option>
                      <option value="update">{isAr ? 'تحديثات ومزايا (Release Notes)' : 'Feature Release Notes'}</option>
                      <option value="maintenance">{isAr ? 'إشعار صيانة أو ترقية (Notice)' : 'Maintenance Notice'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {isAr ? 'لغة القالب والاتجاه' : 'Language & Direction'}
                    </label>
                    <select
                      value={newsletterLang}
                      onChange={(e) => setNewsletterLang(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                    >
                      <option value="ar">{isAr ? 'العربية (RTL متناسق)' : 'Arabic (RTL Formatted)'}</option>
                      <option value="en">{isAr ? 'الإنجليزية (LTR)' : 'English (LTR Formatted)'}</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateNewsletter}
                      disabled={isGeneratingNewsletter || !newsletterTopic.trim()}
                      className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-black py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-pink-500/20"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGeneratingNewsletter ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingNewsletter ? (isAr ? 'جاري التوليد والتصميم...' : 'Designing with AI...') : (isAr ? 'توليد القالب بالذكاء الاصطناعي' : 'Generate with Gemini AI')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Newsletter Preview & Code Editor */}
              {newsletterHtml && (
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-purple-500/30 space-y-3">
                  {/* Subject Line & View Switches */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">
                        {isAr ? 'عنوان الرسالة (Subject Line)' : 'Email Subject Line'}
                      </label>
                      <input
                        type="text"
                        value={newsletterSubject}
                        onChange={(e) => setNewsletterSubject(e.target.value)}
                        className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-pink-500"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-purple-500/30 self-end sm:self-auto">
                      <button
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          previewDevice === 'desktop' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Desktop Preview"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Desktop</span>
                      </button>
                      <button
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          previewDevice === 'mobile' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Mobile Preview"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mobile</span>
                      </button>
                      <button
                        onClick={() => setPreviewDevice('code')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          previewDevice === 'code' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Raw HTML Code"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">HTML</span>
                      </button>
                    </div>
                  </div>

                  {/* Render Area */}
                  {previewDevice === 'code' ? (
                    <textarea
                      rows="14"
                      value={newsletterHtml}
                      onChange={(e) => setNewsletterHtml(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-200 font-mono outline-none focus:border-pink-500 leading-relaxed"
                    />
                  ) : (
                    <div className="flex justify-center bg-slate-950/80 p-3 rounded-xl border border-purple-500/20 overflow-x-auto min-h-[380px]">
                      <div
                        className={`bg-white rounded-xl shadow-2xl transition-all duration-300 overflow-hidden ${
                          previewDevice === 'mobile' ? 'w-[360px]' : 'w-full max-w-[620px]'
                        }`}
                      >
                        <iframe
                          title="Newsletter Preview"
                          srcDoc={newsletterHtml}
                          className="w-full h-[450px] border-none"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  )}

                  {/* Newsletter Dispatch Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Sender: <span className="text-purple-300">noreply@subtie.msoms.ai</span>
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleSendTestNewsletter}
                        disabled={isSendingNewsletter}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-purple-500/30 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إرسال بريد تجريبي للمدير' : 'Send Test Email to Admin'}</span>
                      </button>

                      <button
                        onClick={() => setNewsletterSendModal(true)}
                        disabled={isSendingNewsletter || newsletterSubscribers.total === 0}
                        className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{isAr ? `إطلاق الحملة لـ (${newsletterSubscribers.total}) مشترك` : `Dispatch Campaign (${newsletterSubscribers.total})`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign History */}
              {newsletterHistory.length > 0 && (
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/20 space-y-2">
                  <h5 className="text-xs font-black text-white">{isAr ? 'سجل الحملات البريدية المرسلة' : 'Campaign History'}</h5>
                  <div className="divide-y divide-purple-500/10 text-xs">
                    {newsletterHistory.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-slate-300">
                        <div className="truncate max-w-[340px]">
                          <span className="font-bold text-white block truncate">{item.subject}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.sentAt).toLocaleDateString()} · {item.recipientCount} {isAr ? 'مستلم' : 'recipients'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* MODAL 1: ADD MINUTES CREDITS                             */}
        {/* ========================================================= */}
        {creditModalUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 p-6 rounded-3xl border border-purple-500/50 space-y-4 shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'إضافة رصيد دقائق للمستخدم' : 'Add Minutes Credits'}</span>
                </h4>
                <button onClick={() => setCreditModalUser(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <p>
                  <span className="text-slate-400">{isAr ? 'المستخدم: ' : 'User: '}</span>
                  <span className="font-bold text-white">{creditModalUser.firstName} ({creditModalUser.email})</span>
                </p>
                <p>
                  <span className="text-slate-400">{isAr ? 'الرصيد الحالي: ' : 'Current Balance: '}</span>
                  <span className="font-mono text-emerald-400 font-bold">{creditModalUser.minuteBalance || 0}m</span>
                </p>
              </div>

              <form onSubmit={handleAddCreditsSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {isAr ? 'عدد الدقائق المراد إضافتها' : 'Minutes to Credit'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    required
                    value={creditMinutesInput}
                    onChange={(e) => setCreditMinutesInput(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {isAr ? 'سبب أو ملاحظة المنحة' : 'Reason / Note (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={creditReasonInput}
                    onChange={(e) => setCreditReasonInput(e.target.value)}
                    placeholder={isAr ? 'مثال: تعويض عطل، منحة دعم فني، ترقية يدوية' : 'e.g. Compensation, VIP grant, promotion'}
                    className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreditModalUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCredit}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-black transition disabled:opacity-50"
                  >
                    {isSubmittingCredit ? (isAr ? 'جاري الإضافة...' : 'Adding...') : (isAr ? 'إضافة الدقائق فوراً' : 'Confirm Credit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: DELETE USER & ASSOCIATED CONTENT CONFIRMATION   */}
        {/* ========================================================= */}
        {deleteModalUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 p-6 rounded-3xl border border-rose-500/50 space-y-4 shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
              <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3 text-rose-400">
                <AlertOctagon className="w-6 h-6 shrink-0" />
                <h4 className="text-sm font-black text-white">
                  {isAr ? 'تأكيد الحذف النهائي للحساب وكافة المحتويات' : 'Confirm Irreversible User Scrub'}
                </h4>
              </div>

              <div className="text-xs text-slate-300 space-y-2 bg-rose-950/20 p-3 rounded-xl border border-rose-500/30">
                <p>
                  {isAr ? 'سيتم حذف حساب المستخدم التالي وجميع بياناته بشكل نهائي لا رجعة فيه:' : 'You are about to irreversibly wipe this user and all associated data:'}
                </p>
                <div className="font-bold text-white font-mono">
                  {deleteModalUser.firstName} {deleteModalUser.lastName} ({deleteModalUser.email})
                </div>
                <ul className="list-disc list-inside text-rose-300 text-[11px] space-y-0.5 pt-1">
                  <li>{isAr ? `كافة المشاريع والترجمات (${deleteModalUser.totalProjects || 0} مشروع)` : `All projects and subtitles (${deleteModalUser.totalProjects || 0})`}</li>
                  <li>{isAr ? `كافة ملفات الفيديو والصوت المرفوعة في مجلد المستخدم` : `All uploaded video/audio files on server disk`}</li>
                  <li>{isAr ? `كافة سجلات الرصيد والمعاملات المالية` : `All minute balances and transaction records`}</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                >
                  {isAr ? 'تراجع' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDelete}
                  onClick={handleDeleteUserSubmit}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition disabled:opacity-50"
                >
                  {isSubmittingDelete ? (isAr ? 'جاري الحذف التام...' : 'Scrubbing...') : (isAr ? 'حذف الحساب والملفات نهائياً' : 'Permanently Delete User')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 3: NEWSLETTER BLAST CONFIRMATION                   */}
        {/* ========================================================= */}
        {newsletterSendModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 p-6 rounded-3xl border border-purple-500/50 space-y-4 shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
              <div className="flex items-center gap-3 border-b border-purple-500/20 pb-3 text-pink-400">
                <Mail className="w-6 h-6 shrink-0" />
                <h4 className="text-sm font-black text-white">
                  {isAr ? 'تأكيد إرسال النشرة لجميع المشتركين' : 'Confirm Newsletter Campaign Blast'}
                </h4>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p>
                  {isAr
                    ? `أنت على وشك إرسال هذه النشرة إلى إجمالي (${newsletterSubscribers.total}) مستخدم مشترك في المنصة:`
                    : `You are about to dispatch this email blast to (${newsletterSubscribers.total}) subscribed users:`}
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-purple-500/30 text-white font-bold">
                  {newsletterSubject}
                </div>
                <p className="text-[11px] text-purple-300">
                  {isAr
                    ? 'سيتم الإرسال من noreply@subtie.msoms.ai مع رابط إلغاء الاشتراك التلقائي في التذييل.'
                    : 'Dispatching via noreply@subtie.msoms.ai with automatic 1-click unsubscribe links in footer.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewsletterSendModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSendingNewsletter}
                  onClick={handleSendBlastCampaign}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-black transition disabled:opacity-50"
                >
                  {isSendingNewsletter ? (isAr ? 'جاري الإرسال...' : 'Dispatching...') : (isAr ? 'إطلاق الحملة الآن' : 'Dispatch Now')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
