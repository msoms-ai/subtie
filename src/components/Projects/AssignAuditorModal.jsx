import React, { useState, useEffect } from 'react';
import { X, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AssignAuditorModal({ isOpen, onClose, project, currentUser, onAssignedSuccess, lang = 'en' }) {
  const [users, setUsers] = useState([]);
  const [selectedAuditorId, setSelectedAuditorId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isAr = lang === 'ar';

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchAvailableUsers();
    }
  }, [isOpen, currentUser]);

  const fetchAvailableUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await res.json();
      if (res.ok && data.users) {
        // Filter auditors or all verified users
        setUsers(data.users.filter(u => u.isVerified));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAuditorId) {
      setError(isAr ? 'الرجاء اختيار مدقق من القائمة.' : 'Please select an auditor from the list.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/project/${project.id}/assign-auditor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ auditorId: selectedAuditorId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign auditor.');

      setMessage(data.message);
      setTimeout(() => {
        onAssignedSuccess(data.project);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 space-y-6 shadow-2xl relative" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 rtl:left-auto rtl:right-6 text-slate-300 hover:text-white bg-purple-950 theme-light:bg-purple-800 p-2 rounded-full border border-purple-500/40 transition shadow-md"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse pt-2">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 text-white shadow-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white theme-light:text-slate-950">
              {isAr ? 'تعيين مدقق جودة للمشروع' : 'Assign Project Auditor'}
            </h3>
            <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold">
              {project.projectName}
            </p>
          </div>
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

        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-purple-200 theme-light:text-purple-950 mb-1.5">
              {isAr ? 'اختر مدقق الجودة (Auditor)' : 'Select Certified Auditor'}
            </label>
            <select
              value={selectedAuditorId}
              onChange={(e) => setSelectedAuditorId(e.target.value)}
              className="w-full py-3 px-3.5 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/40 text-white theme-light:text-purple-950 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer"
            >
              <option value="">{isAr ? '-- اختر مدققاً من القائمة --' : '-- Select Auditor --'}</option>
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-purple-950 text-white">
                  {u.firstName} {u.lastName} ({u.role}) - {u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-900 text-slate-300 text-xs font-bold"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:scale-105 text-white font-black text-xs shadow-lg wizard-white-text transition"
            >
              {isLoading ? (isAr ? 'جاري التعيين...' : 'Assigning...') : (isAr ? 'تأكيد تعيين المدقق' : 'Confirm Assignment')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
