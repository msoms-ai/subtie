import React, { useState } from 'react';
import { X, Mail, Lock, User, AtSign, Key, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import PasswordRulesIndicator from './PasswordRulesIndicator';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, lang = 'en' }) {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'verify' | 'forgot' | 'reset'
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [msomsUsername, setMsomsUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const resetFormState = () => {
    setError('');
    setMessage('');
  };

  const handleSwitchView = (newView) => {
    resetFormState();
    setView(newView);
  };

  // 1. Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          setEmail(data.email || email);
          setView('verify');
          setError(data.error);
        } else {
          setError(data.error || 'Failed to sign in.');
        }
        setIsLoading(false);
        return;
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Network login error.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Register Submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          msomsUsername,
          lang
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      setMessage(data.message);
      setView('verify');
    } catch (err) {
      setError(err.message || 'Registration network error.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Verify OTP Code
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        onLoginSuccess(data.user);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Verification network error.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Resend OTP
  const handleResendOtp = async () => {
    resetFormState();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.devOtp) setDevOtpToast(data.devOtp);
      setMessage(data.message || 'Verification code resent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Request Password Reset OTP
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Password reset request failed.');
        setIsLoading(false);
        return;
      }

      if (data.devOtp) setDevOtpToast(data.devOtp);
      setMessage(data.message);
      setView('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Complete Password Reset
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode, newPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Password reset failed.');
        setIsLoading(false);
        return;
      }

      setMessage(data.message);
      setTimeout(() => {
        handleSwitchView('login');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 space-y-6 shadow-2xl relative" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 rtl:left-auto rtl:right-6 text-slate-300 hover:text-white bg-purple-950 theme-light:bg-purple-800 p-2 rounded-full border border-purple-500/40 transition shadow-md"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-white theme-light:text-slate-950">
            {view === 'login' && (isAr ? 'تسجيل الدخول إلى سابتاي' : 'Sign In to Subtie')}
            {view === 'register' && (isAr ? 'إنشاء حساب مترجم جديد' : 'Create Translator Account')}
            {view === 'verify' && (isAr ? 'تأكيد البريد الإلكتروني (OTP)' : 'Verify Email Address')}
            {view === 'forgot' && (isAr ? 'استعادة كلمة المرور' : 'Reset Your Password')}
            {view === 'reset' && (isAr ? 'تعيين كلمة المرور الجديدة' : 'Set New Password')}
          </h3>
          <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold mt-1">
            {view === 'login' && (isAr ? 'أدخل بريدك الإلكتروني وكلمة المرور لمتابعة أعمال الترجمة' : 'Enter your credentials to access your translation projects')}
            {view === 'register' && (isAr ? 'انضم إلى نخبة مترجمي الأنمي في منصة سابتاي إمـسـومـس' : 'Join MSOMS anime fansubbers on the Subtie platform')}
            {view === 'verify' && (isAr ? 'أدخل رمز التحقق المكون من 6 أرقام المرسل لبريدك' : 'Enter the 6-digit verification code sent to your inbox')}
            {view === 'forgot' && (isAr ? 'أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين' : 'Enter your email address to receive password reset instructions')}
            {view === 'reset' && (isAr ? 'أدخل الرمز وكلمة المرور الجديدة المستوفية للشروط' : 'Enter the code and your new secure password')}
          </p>
        </div>

        {/* Success Alert */}
        {message && (
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center space-x-2 rtl:space-x-reverse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold">
            {error}
          </div>
        )}

        {/* ---------------- LOGIN VIEW ---------------- */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-purple-400 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full py-2.5 px-3.5 pl-10 rtl:pl-3.5 rtl:pr-10 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => handleSwitchView('forgot')}
                  className="text-[11px] font-bold text-pink-400 hover:text-pink-300 underline"
                >
                  {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-purple-400 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 px-3.5 pl-10 rtl:pl-3.5 rtl:pr-10 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-[1.02] text-white font-black text-sm shadow-xl shadow-purple-500/25 border border-purple-400/40 transition disabled:opacity-50 wizard-white-text"
            >
              {isLoading ? (isAr ? 'جاري التحقق...' : 'Authenticating...') : (isAr ? 'تسجيل الدخول الآن' : 'Sign In Now')}
            </button>

            <div className="text-center pt-2 text-xs font-bold text-slate-300 theme-light:text-slate-700">
              <span>{isAr ? 'ليس لديك حساب؟ ' : "Don't have an account? "}</span>
              <button
                type="button"
                onClick={() => handleSwitchView('register')}
                className="text-pink-400 hover:text-pink-300 font-black underline ml-1"
              >
                {isAr ? 'إنشاء حساب جديد' : 'Register Here'}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- REGISTER VIEW ---------------- */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                  {isAr ? 'الاسم الأول' : 'First Name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-purple-400 absolute top-3 left-3 rtl:left-auto rtl:right-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="محمد"
                    className="w-full py-2 px-3 pl-9 rtl:pl-3 rtl:pr-9 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                  {isAr ? 'اسم العائلة' : 'Last Name'}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="الفارسي"
                  className="w-full py-2 px-3 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                {isAr ? 'اسم المستخدِم في منتديات إمـسـومـس (اختياري)' : 'MSOMS Forum Username (Optional)'}
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-purple-400 absolute top-3 left-3 rtl:left-auto rtl:right-3 pointer-events-none" />
                <input
                  type="text"
                  value={msomsUsername}
                  onChange={(e) => setMsomsUsername(e.target.value)}
                  placeholder="Kudo_Shinichi_MSOMS"
                  className="w-full py-2 px-3 pl-9 rtl:pl-3 rtl:pr-9 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-purple-400 absolute top-3 left-3 rtl:left-auto rtl:right-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="translator@msoms.ai"
                  className="w-full py-2 px-3 pl-9 rtl:pl-3 rtl:pr-9 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative mb-2">
                <Lock className="w-4 h-4 text-purple-400 absolute top-3 left-3 rtl:left-auto rtl:right-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2 px-3 pl-9 rtl:pl-3 rtl:pr-9 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Password Standards Rules Indicator */}
              <PasswordRulesIndicator password={password} lang={lang} />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-[1.02] text-white font-black text-sm shadow-xl shadow-purple-500/25 border border-purple-400/40 transition disabled:opacity-50 wizard-white-text"
            >
              {isLoading ? (isAr ? 'جاري التسجيل...' : 'Creating Account...') : (isAr ? 'إنشاء حساب جديد وتلقي رمز OTP' : 'Register & Send OTP')}
            </button>

            <div className="text-center pt-1 text-xs font-bold text-slate-300 theme-light:text-slate-700">
              <span>{isAr ? 'لديك حساب بالفعل؟ ' : 'Already registered? '}</span>
              <button
                type="button"
                onClick={() => handleSwitchView('login')}
                className="text-pink-400 hover:text-pink-300 font-black underline ml-1"
              >
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- VERIFY OTP VIEW ---------------- */}
        {view === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                {isAr ? 'أدخل رمز التحقق (OTP) المكون من 6 أرقام' : 'Enter 6-Digit Verification Code'}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-purple-400 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full py-3 px-3.5 pl-10 rtl:pl-3.5 rtl:pr-10 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-center font-black tracking-widest text-lg focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-[1.02] text-white font-black text-sm shadow-xl shadow-purple-500/25 border border-purple-400/40 transition disabled:opacity-50 wizard-white-text"
            >
              {isLoading ? (isAr ? 'جاري التحقق...' : 'Verifying Code...') : (isAr ? 'تأكيد الحساب والبدء' : 'Verify Account')}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-pink-400 hover:text-pink-300 font-black underline flex items-center space-x-1 rtl:space-x-reverse"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isAr ? 'إعادة إرسال الرمز' : 'Resend Code'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchView('login')}
                className="text-slate-300 hover:text-white"
              >
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- FORGOT PASSWORD VIEW ---------------- */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                {isAr ? 'بريدك الإلكتروني المسجل' : 'Registered Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-purple-400 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full py-2.5 px-3.5 pl-10 rtl:pl-3.5 rtl:pr-10 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-[1.02] text-white font-black text-sm shadow-xl shadow-purple-500/25 border border-purple-400/40 transition disabled:opacity-50 wizard-white-text"
            >
              {isLoading ? (isAr ? 'جاري الإرسال...' : 'Sending Code...') : (isAr ? 'إرسال رمز إعادة التعيين (OTP)' : 'Send Reset Code (OTP)')}
            </button>

            <div className="text-center pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSwitchView('login')}
                className="text-pink-400 hover:text-pink-300 underline"
              >
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- RESET PASSWORD VIEW ---------------- */}
        {view === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1">
                {isAr ? 'أدخل رمز إعادة التعيين (OTP)' : 'Enter 6-Digit Reset Code'}
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full py-2 px-3 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-center font-black tracking-widest text-lg focus:outline-none focus:border-pink-500"
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
                placeholder="••••••••"
                className="w-full py-2 px-3 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500 mb-2"
              />

              <PasswordRulesIndicator password={newPassword} lang={lang} />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-[1.02] text-white font-black text-sm shadow-xl shadow-purple-500/25 border border-purple-400/40 transition disabled:opacity-50 wizard-white-text"
            >
              {isLoading ? (isAr ? 'جاري التغيير...' : 'Updating Password...') : (isAr ? 'تعيين كلمة المرور والعودة للدخول' : 'Reset Password Now')}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
