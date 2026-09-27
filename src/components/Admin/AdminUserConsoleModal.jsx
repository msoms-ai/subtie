import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, User, CheckCircle2, ShieldAlert, UserCheck, RefreshCw } from 'lucide-react';

export default function AdminUserConsoleModal({ isOpen, onClose, currentUser, lang = 'en' }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'settings'
  const [settings, setSettings] = useState({ geminiModel: 'gemini-1.5-pro' });
  const [isSaving, setIsSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const isAr = lang === 'ar';

  useEffect(() => {
    if (isOpen && currentUser?.role === 'Admin') {
      fetchUsersList();
      fetchSettings();
    }
  }, [isOpen, currentUser]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

    const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/settings/models', {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch models');
      if (data.success && data.models) {
        setAvailableModels(data.models);
        if (data.warning) {
          setMessage(isAr ? 'تم تحميل القائمة الاحتياطية (تعذر الاتصال بـ API)' : 'Loaded offline fallback list (API connection failed)');
        } else {
          setMessage(isAr ? 'تم تحديث قائمة النماذج بنجاح من جوجل!' : 'Live models refreshed successfully from Google API!');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError('');
    setMessage('');
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
      if (!res.ok) throw new Error(data.error);
      setMessage(isAr ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };


  const fetchUsersList = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/users', {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users.');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/auth/users/${targetUserId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role.');

      setMessage(data.message);
      fetchUsersList();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen || currentUser?.role !== 'Admin') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-3xl glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 rtl:left-auto rtl:right-6 text-slate-300 hover:text-white bg-purple-950 theme-light:bg-purple-800 p-2 rounded-full border border-purple-500/40 transition shadow-md"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-2">
          <div className="p-3 w-12 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg self-start">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white theme-light:text-slate-950">
              {isAr ? 'لوحة تحكم النظام والإدارة' : 'System Administration Console'}
            </h3>
            <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold">
              {isAr ? 'إدارة المستخدمين وإعدادات النظام' : 'Manage users and system settings'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-purple-500/20 text-xs font-black pt-2">
          <button
            onClick={() => { setError(''); setMessage(''); setActiveTab('users'); }}
            className={`pb-3 px-4 transition border-b-2 ${
              activeTab === 'users'
                ? 'border-pink-500 text-pink-400 font-black'
                : 'border-transparent text-slate-400 hover:text-white theme-light:text-slate-600 theme-light:hover:text-purple-900'
            }`}
          >
            {isAr ? 'إدارة المستخدمين' : 'User Management'}
          </button>
          <button
            onClick={() => { setError(''); setMessage(''); setActiveTab('settings'); }}
            className={`pb-3 px-4 transition border-b-2 ${
              activeTab === 'settings'
                ? 'border-pink-500 text-pink-400 font-black'
                : 'border-transparent text-slate-400 hover:text-white theme-light:text-slate-600 theme-light:hover:text-purple-900'
            }`}
          >
            {isAr ? 'إعدادات النظام (AI)' : 'System Settings (AI)'}
          </button>
        </div>

        {/* Alerts */}
        {message && (
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center space-x-2 rtl:space-x-reverse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold">
            {error}
          </div>
        )}

        {/* TAB 1: USER TABLE */}
        {activeTab === 'users' ? (
          <div className="overflow-x-auto rounded-2xl border border-purple-500/30">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-purple-950/80 theme-light:bg-purple-800 text-white font-black border-b border-purple-500/30">
                <tr>
                  <th className="p-3.5">{isAr ? 'المستخدم' : 'User Name'}</th>
                  <th className="p-3.5">{isAr ? 'البريد' : 'Email'}</th>
                  <th className="p-3.5">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5">{isAr ? 'الرتبة' : 'Current Role'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/20 font-bold">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-purple-900/30 transition text-white theme-light:text-slate-900">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="w-8 h-8 rounded-full bg-purple-700 text-white font-black flex items-center justify-center border border-purple-400 shrink-0">
                          {(u.firstName || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="block font-black text-white theme-light:text-slate-950">{u.firstName} {u.lastName}</span>
                          {u.msomsUsername && <span className="text-[10px] text-pink-400">@{u.msomsUsername}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-purple-200 theme-light:text-purple-950">{u.email}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${u.isVerified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
                        {u.isVerified ? (isAr ? 'مؤكد' : 'Verified') : (isAr ? 'معلق' : 'Pending')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black wizard-white-text ${
                        u.role === 'Admin' ? 'bg-rose-600 text-white' : u.role === 'Auditor' ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex rounded-xl bg-purple-950 p-1 border border-purple-500/40">
                        {['Admin', 'Translator', 'Auditor'].map(r => (
                          <button
                            key={r}
                            disabled={u.id === currentUser.id && r !== 'Admin'} // Protect self demotion
                            onClick={() => handleRoleChange(u.id, r)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition wizard-white-text ${
                              u.role === r
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 2: SYSTEM SETTINGS */
          <div className="bg-slate-900/50 theme-light:bg-slate-100 p-5 rounded-2xl border border-purple-500/20">
            <h4 className="text-sm font-black text-white theme-light:text-slate-900 mb-4">{isAr ? 'إعدادات محرك الترجمة' : 'Translation Engine Settings'}</h4>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 theme-light:text-slate-600 flex items-center justify-between">
                <span>{isAr ? 'معرف نموذج جيميناي (Gemini Model Identifier)' : 'Gemini Model Identifier'}</span>
                <button 
                  onClick={handleFetchModels}
                  disabled={isFetchingModels}
                  className="flex items-center space-x-1 rtl:space-x-reverse text-[10px] bg-purple-900/50 hover:bg-purple-800 text-purple-200 px-2 py-1 rounded-lg transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'جلب النماذج الحية' : 'Refresh Live Models'}</span>
                </button>
              </label>
              <input
                type="text"
                list="gemini-models-list"
                value={settings.geminiModel || ''}
                onChange={(e) => setSettings({...settings, geminiModel: e.target.value})}
                className="w-full bg-slate-950 theme-light:bg-white border border-slate-700 theme-light:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-white theme-light:text-slate-900 font-mono outline-none focus:border-purple-500"
                placeholder="e.g. gemini-1.5-pro"
              />
              <datalist id="gemini-models-list">
                {availableModels.map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <p className="text-[10px] text-slate-500 theme-light:text-slate-400 leading-relaxed pt-2">
                {isAr 
                  ? 'أدخل المعرف الدقيق للنموذج (مثال: gemini-1.5-pro-002). سيتم الانتقال تلقائياً إلى gemini-1.5-flash في حال فشل هذا النموذج.' 
                  : 'Enter the exact model ID (e.g. gemini-1.5-pro-002). The system will automatically fallback to gemini-1.5-flash if this model fails or is unavailable.'}
              </p>
            </div>
            
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50"
            >
              {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الإعدادات' : 'Save Settings')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
