import React, { useState, useEffect } from 'react';
import { 
  Users, Search, ShieldCheck, ShieldAlert, Edit, Trash2, 
  Coins, CheckCircle2, XCircle, RefreshCw, Plus, Key, Lock, Ban, UserCheck 
} from 'lucide-react';

export default function UsersCrudModule({ user, lang = 'en' }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [creditModalUser, setCreditModalUser] = useState(null);
  const [creditDelta, setCreditDelta] = useState(60);
  const [creditReason, setCreditReason] = useState('Admin compensation');
  const [submittingCredit, setSubmittingCredit] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user?.id]);

  const handleRoleChange = async (targetId, newRole) => {
    if (!window.confirm(`Change role of user ${targetId} to ${newRole}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${targetId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User role updated to ${newRole}`);
        fetchUsers();
      } else {
        showToast(data.error || 'Role change failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSuspendToggle = async (targetId, currentSuspended) => {
    const actionText = currentSuspended ? 'unsuspend' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionText} user ${targetId}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${targetId}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ isSuspended: !currentSuspended })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User account ${actionText}ed successfully`);
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to update account status', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreditSubmit = async (e) => {
    e.preventDefault();
    if (!creditModalUser) return;
    setSubmittingCredit(true);
    try {
      const res = await fetch(`/api/admin/users/${creditModalUser.id}/credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          minutes: Number(creditDelta),
          minutesDelta: Number(creditDelta),
          amountMinutes: Number(creditDelta),
          reason: creditReason
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Updated balance: new balance is ${data.minuteBalance} mins`);
        setCreditModalUser(null);
        fetchUsers();
      } else {
        showToast(data.error || 'Credit adjustment failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingCredit(false);
    }
  };

  const handleDeleteUser = async (targetId) => {
    if (!window.confirm(`CRITICAL WARNING: This will permanently delete user ${targetId} and all their uploaded data. Proceed?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User ${targetId} deleted permanently`);
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredUsers = usersList.filter(u => {
    const term = searchTerm.toLowerCase();
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    return name.includes(term) || email.includes(term) || role.includes(term) || u.id.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg ${
          toast.type === 'error'
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
        }`}>
          {toast.type === 'error' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/80 border border-purple-500/20 rounded-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Users className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Users &amp; Role-Based Access Control (RBAC)
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {usersList.length} Accounts Registered
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage permissions, grant / revoke minutes, enforce account suspensions, and oversee quotas
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, email, role, id..."
              className="bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500 w-64"
            />
          </div>

          <button
            onClick={fetchUsers}
            className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
        {loading && usersList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
            <p className="text-xs">Loading accounts...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-xs font-bold">No accounts matched your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-purple-500/20 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">User Profile</th>
                  <th className="p-3.5">Email / Account ID</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Minutes Balance</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-purple-950/20 transition">
                    {/* User Profile */}
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-black flex items-center justify-center overflow-hidden shrink-0 border border-purple-400">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(u.firstName || 'U')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white leading-tight">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Projects: {u.projectCount || 0}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email / ID */}
                    <td className="p-3.5">
                      <div className="font-mono text-purple-200">
                        {u.email}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {u.id}
                      </div>
                    </td>

                    {/* Role Dropdown */}
                    <td className="p-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`text-xs font-black rounded-lg px-2.5 py-1 border transition focus:outline-none ${
                          u.role === 'Admin'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                            : u.role === 'Auditor'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                            : 'bg-purple-950/60 text-purple-300 border-purple-500/50'
                        }`}
                      >
                        <option value="User">User</option>
                        <option value="Auditor">Auditor</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>

                    {/* Minutes Balance */}
                    <td className="p-3.5">
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse font-mono font-bold text-yellow-400">
                        <span>🪙</span>
                        <span>{u.minuteBalance !== undefined ? u.minuteBalance : 0} Mins</span>
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        u.isSuspended
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3.5 text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start space-x-1.5 rtl:space-x-reverse">
                        <button
                          onClick={() => {
                            setCreditModalUser(u);
                            setCreditDelta(60);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 border border-yellow-500/30 font-bold text-[10px] transition flex items-center gap-1"
                          title="Grant or Deduct Minutes"
                        >
                          <Coins className="w-3 h-3" />
                          <span>Adjust Balance</span>
                        </button>

                        <button
                          onClick={() => handleSuspendToggle(u.id, u.isSuspended)}
                          className={`p-1.5 rounded-lg border transition ${
                            u.isSuspended
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border-amber-500/30'
                          }`}
                          title={u.isSuspended ? 'Unsuspend Account' : 'Suspend Account'}
                        >
                          {u.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                          title="Permanently Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit Adjustment Modal */}
      {creditModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2 text-white font-black text-sm">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span>Adjust Minutes Balance</span>
              </div>
              <button 
                onClick={() => setCreditModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Grant or deduct minutes for <strong className="text-white">{creditModalUser.firstName} {creditModalUser.lastName}</strong> ({creditModalUser.email}).
            </p>

            <form onSubmit={handleCreditSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                  Minutes Delta (Use negative to deduct, e.g. -30)
                </label>
                <input
                  type="number"
                  value={creditDelta}
                  onChange={(e) => setCreditDelta(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-yellow-400 focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                  Audit Reason / Justification
                </label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setCreditModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCredit}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-500 to-amber-600 hover:opacity-90 text-slate-950 transition shadow-lg shadow-yellow-500/20"
                >
                  {submittingCredit ? 'Updating...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
