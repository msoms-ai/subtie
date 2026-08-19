import React, { useState } from 'react';
import { X, User, Camera, Mail, Lock, Shield, Calendar, Bell, Globe, Sun, Moon, Check, Key, RefreshCw, CheckCircle2 } from 'lucide-react';
import PasswordRulesIndicator from '../Auth/PasswordRulesIndicator';

export default function UserProfileModal({ isOpen, onClose, user, onUpdateUser, lang = 'en', theme = 'dark', onToggleTheme, onChangeLang }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'preferences'
  
  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [msomsUsername, setMsomsUsername] = useState(user?.msomsUsername || '');
  
  // Subscriptions
  const [subscriptions, setSubscriptions] = useState(user?.subscriptions || { updates: true, newsletter: true, notifications: true });

  // Security state - Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Security state - Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailStep, setEmailStep] = useState('request'); // 'request' | 'confirm'
  const [devEmailOtp, setDevEmailOtp] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isAr = lang === 'ar';

  if (!isOpen || !user) return null;

  // Calculate Member Since duration
  const getMemberDuration = (createdAtStr) => {
    if (!createdAtStr) return isAr ? 'عضو جديد' : 'New Member';
    const created = new Date(createdAtStr);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return isAr ? 'انضم اليوم' : 'Joined today';
    if (diffDays < 30) return isAr ? `عضو منذ ${diffDays} يوم` : `Member for ${diffDays} days`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return isAr ? `عضو منذ ${diffMonths} شهر` : `Member for ${diffMonths} months`;
    
    const diffYears = Math.floor(diffMonths / 12);
    return isAr ? `عضو منذ ${diffYears} سنة` : `Member for ${diffYears} years`;
  };

  // Avatar Upload Handler
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setMessage('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload avatar.');

      onUpdateUser(data.user);
      setMessage(isAr ? 'تم تحديث الصورة الشخصية بنجاح!' : 'Avatar logo updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Save Profile Info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          firstName,
          lastName,
          msomsUsername,
          subscriptions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile.');

      onUpdateUser(data.user);
      setMessage(isAr ? 'تم حفظ بيانات الملف الشخصي بنجاح!' : 'Profile saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Change Password Handler
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed.');

      setMessage(data.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Request Email Change (OTP)
  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-email/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ newEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email change request failed.');

      if (data.devOtp) setDevEmailOtp(data.devOtp);
      setMessage(data.message);
      setEmailStep('confirm');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm Email Change OTP
  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-email/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ code: emailOtpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email confirmation failed.');

      onUpdateUser(data.user);
      setMessage(data.message);
      setEmailStep('request');
      setNewEmail('');
      setEmailOtpCode('');
      setDevEmailOtp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-2xl glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 rtl:left-auto rtl:right-6 text-slate-300 hover:text-white bg-purple-950 theme-light:bg-purple-800 p-2 rounded-full border border-purple-500/40 transition shadow-md"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 rtl:sm:space-x-reverse border-b border-purple-500/20 pb-6 pt-2">
          {/* Avatar Container with Upload Icon */}
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-purple-700 via-pink-600 to-indigo-700 text-white font-black text-3xl flex items-center justify-center border-4 border-purple-400 shadow-xl overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(user.firstName || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <label className="absolute inset-0 bg-slate-950/60 rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition">
              <Camera className="w-6 h-6 mb-1 text-pink-400" />
              <span className="text-[10px] font-black">{isAr ? 'تغيير الصورة' : 'Change Logo'}</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>

          <div className="text-center sm:text-left rtl:sm:text-right space-y-1">
            <div className="flex items-center justify-center sm:justify-start space-x-2 rtl:space-x-reverse">
              <h2 className="text-2xl font-black text-white theme-light:text-slate-950">
                {user.firstName} {user.lastName}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-black wizard-white-text shadow-md ${
                user.role === 'Admin'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white'
                  : user.role === 'Auditor'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
              }`}>
                {user.role}
              </span>
            </div>
            <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold">{user.email}</p>
            {user.msomsUsername && (
              <p className="text-xs text-pink-400 font-bold">
                {isAr ? 'عضوية إمـسـومـس:' : 'MSOMS Forum:'} @{user.msomsUsername}
              </p>
            )}
            <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse pt-1 text-[11px] font-bold text-slate-300 theme-light:text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>{getMemberDuration(user.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Global Success / Error Notices */}
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

        {/* Tab Navigation Buttons */}
        <div className="flex border-b border-purple-500/20 text-xs font-black">
          <button
            onClick={() => { setError(''); setMessage(''); setActiveTab('profile'); }}
            className={`pb-3 px-4 transition border-b-2 ${
              activeTab === 'profile'
                ? 'border-pink-500 text-pink-400 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'البيانات الشخصية والاشتراكات' : 'Profile & Subscriptions'}
          </button>

          <button
            onClick={() => { setError(''); setMessage(''); setActiveTab('security'); }}
            className={`pb-3 px-4 transition border-b-2 ${
              activeTab === 'security'
                ? 'border-pink-500 text-pink-400 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'الأمان وتغيير كلمة المرور' : 'Security & Password'}
          </button>

          <button
            onClick={() => { setError(''); setMessage(''); setActiveTab('preferences'); }}
            className={`pb-3 px-4 transition border-b-2 ${
              activeTab === 'preferences'
                ? 'border-pink-500 text-pink-400 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'تفضيلات اللغة والنمط' : 'Preferences & Theme'}
          </button>
        </div>

        {/* ---------------- TAB 1: PROFILE DETAILS ---------------- */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                  {isAr ? 'الاسم الأول' : 'First Name'}
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                  {isAr ? 'اسم العائلة' : 'Last Name'}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                {isAr ? 'اسم المستخدِم في منتديات إمـسـومـس أنمي (اختياري)' : 'MSOMS Anime Forum Username (Optional)'}
              </label>
              <input
                type="text"
                value={msomsUsername}
                onChange={(e) => setMsomsUsername(e.target.value)}
                placeholder="Kudo_Shinichi"
                className="w-full py-2.5 px-3.5 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Subscriptions Checkboxes */}
            <div className="pt-2 space-y-2 border-t border-purple-500/20">
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1.5">
                {isAr ? 'اشتراكات التنبيهات والأخبار:' : 'Notifications & Newsletters Subscriptions:'}
              </label>
              
              <label className="flex items-center space-x-2.5 rtl:space-x-reverse cursor-pointer text-xs font-bold text-slate-300 theme-light:text-slate-800">
                <input
                  type="checkbox"
                  checked={subscriptions.updates}
                  onChange={(e) => setSubscriptions({ ...subscriptions, updates: e.target.checked })}
                  className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                />
                <span>{isAr ? 'تلقي تحديثات منصة سابتاي والذكاء الاصطناعي' : 'Receive Subtie AI Platform updates'}</span>
              </label>

              <label className="flex items-center space-x-2.5 rtl:space-x-reverse cursor-pointer text-xs font-bold text-slate-300 theme-light:text-slate-800">
                <input
                  type="checkbox"
                  checked={subscriptions.newsletter}
                  onChange={(e) => setSubscriptions({ ...subscriptions, newsletter: e.target.checked })}
                  className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                />
                <span>{isAr ? 'الاشتراك في النشرة الإخبارية لترجمة الأنمي' : 'Subscribe to Anime Translation Newsletter'}</span>
              </label>

              <label className="flex items-center space-x-2.5 rtl:space-x-reverse cursor-pointer text-xs font-bold text-slate-300 theme-light:text-slate-800">
                <input
                  type="checkbox"
                  checked={subscriptions.notifications}
                  onChange={(e) => setSubscriptions({ ...subscriptions, notifications: e.target.checked })}
                  className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                />
                <span>{isAr ? 'تلقي تنبيهات مراجعات التدقيق والتثبت من الجودة' : 'Receive Quality Audit notification alerts'}</span>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-black text-xs shadow-lg wizard-white-text transition hover:scale-105"
              >
                {isLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Profile Changes')}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- TAB 2: SECURITY & PASSWORD ---------------- */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password Form */}
            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30">
              <h4 className="text-xs font-black text-pink-400 border-b border-purple-500/20 pb-2">
                {isAr ? '1. تغيير كلمة المرور' : '1. Change Password'}
              </h4>

              <div>
                <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                  {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full py-2 px-3 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                  {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full py-2 px-3 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500 mb-2"
                />

                <PasswordRulesIndicator password={newPassword} lang={lang} />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs shadow-md wizard-white-text"
                >
                  {isAr ? 'تحديث كلمة المرور' : 'Update Password'}
                </button>
              </div>
            </form>

            {/* Change Email Form with OTP */}
            <div className="space-y-3.5 p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30">
              <h4 className="text-xs font-black text-pink-400 border-b border-purple-500/20 pb-2">
                {isAr ? '2. تغيير البريد الإلكتروني (يتطلب رمز OTP)' : '2. Change Email Address (Requires OTP)'}
              </h4>

              {devEmailOtp && (
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-400 text-cyan-200 text-xs font-black flex items-center justify-between">
                  <span>{isAr ? 'رمز OTP الخاص بالبريد الجديد:' : 'Dev Email Change OTP:'} <strong className="text-white text-sm tracking-widest">{devEmailOtp}</strong></span>
                </div>
              )}

              {emailStep === 'request' ? (
                <form onSubmit={handleRequestEmailChange} className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                      {isAr ? 'البريد الإلكتروني الجديد' : 'New Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new@example.com"
                      className="w-full py-2 px-3 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2 rounded-2xl bg-purple-950 theme-light:bg-purple-800 text-white font-black text-xs border border-purple-400/80 shadow-md wizard-white-text"
                    >
                      {isAr ? 'إرسال رمز OTP للبريد الجديد' : 'Send OTP to New Email'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmEmailChange} className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                      {isAr ? 'أدخل رمز OTP المرسل للبريد الجديد' : 'Enter OTP Sent to New Email'}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={emailOtpCode}
                      onChange={(e) => setEmailOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full py-2 px-3 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white text-center font-black tracking-widest text-base focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => setEmailStep('request')}
                      className="px-4 py-2 rounded-2xl bg-slate-900 text-slate-300 text-xs font-bold"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs shadow-md wizard-white-text"
                    >
                      {isAr ? 'تأكيد تغيير البريد' : 'Confirm Email Change'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ---------------- TAB 3: PREFERENCES & THEME ---------------- */}
        {activeTab === 'preferences' && (
          <div className="space-y-5">
            {/* Site Language Preference */}
            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-2">
                {isAr ? '1. لغة الموقع الافتراضية:' : '1. Default Site Language:'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { code: 'ar', name: 'العربية (Arabic)' },
                  { code: 'en', name: 'English' }
                ].map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => onChangeLang(l.code)}
                    className={`py-3 px-2 rounded-2xl border-2 text-center font-black text-xs transition shadow-md wizard-white-text ${
                      lang === l.code
                        ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white border-purple-300 scale-[1.03]'
                        : 'bg-purple-950 theme-light:bg-purple-800 text-white border-purple-400/80 hover:bg-purple-900'
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Site Theme Preference */}
            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-2">
                {isAr ? '2. مظهر المنشأة والنمط:' : '2. Default Appearance & Theme:'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onToggleTheme('dark')}
                  className={`py-3.5 px-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center space-x-2 rtl:space-x-reverse transition shadow-md wizard-white-text ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-300 scale-[1.03]'
                      : 'bg-purple-950 text-white border-purple-400/80'
                  }`}
                >
                  <Moon className="w-4 h-4 text-purple-300" />
                  <span>{isAr ? 'النمط الليلي الداكن (Dark Mode)' : 'Dark Theme'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleTheme('light')}
                  className={`py-3.5 px-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center space-x-2 rtl:space-x-reverse transition shadow-md wizard-white-text ${
                    theme === 'light'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-300 scale-[1.03]'
                      : 'bg-purple-800 text-white border-purple-400/80'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span>{isAr ? 'النمط النهاري المضيء (Light Mode)' : 'Light Theme'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
