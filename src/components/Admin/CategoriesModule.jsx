import React, { useState, useEffect } from 'react';
import { 
  Folder, FolderPlus, Edit2, Trash2, RefreshCw, CheckCircle2, 
  AlertTriangle, ShieldAlert, Film, Clock, Check, X 
} from 'lucide-react';

export default function CategoriesModule({ user, lang = 'en' }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch categories');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user?.id]);

  const handleRenameSubmit = async (oldName) => {
    if (!renameValue.trim() || renameValue.trim() === oldName) {
      setEditingCategory(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ newName: renameValue.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Category renamed to "${renameValue.trim()}"`);
        setEditingCategory(null);
        fetchCategories();
      } else {
        showToast(data.error || 'Rename failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (name) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"? Existing projects will be reassigned to "Uncategorized".`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Category "${name}" removed`);
        fetchCategories();
      } else {
        showToast(data.error || 'Failed to delete category', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

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
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Folder className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Categories &amp; Anime Series Manager
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {categories.length} Series Folders
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage folder taxonomies, bulk rename anime titles across all projects, and oversee category completion rates
            </p>
          </div>
        </div>

        <button
          onClick={fetchCategories}
          className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
          title="Refresh Categories"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && categories.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
            <p className="text-xs">Loading series categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <p className="text-xs font-bold">No series categories configured.</p>
          </div>
        ) : (
          categories.map(cat => {
            const isEditing = editingCategory === cat.name;

            return (
              <div
                key={cat.name}
                className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-md shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Folder className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {cat.projectType || 'Series'}
                  </span>
                </div>

                {isEditing ? (
                  <div className="flex items-center space-x-1 rtl:space-x-reverse mb-3">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="bg-slate-950 border border-purple-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none flex-grow"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRenameSubmit(cat.name)}
                      className="p-1.5 rounded-lg bg-emerald-600 text-white"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <h3 className="text-sm font-black text-white truncate mb-2" title={cat.name}>
                    {cat.name}
                  </h3>
                )}

                <div className="bg-slate-950/60 rounded-xl p-2.5 space-y-1 text-[11px] font-mono mb-3">
                  <div className="flex justify-between text-slate-400">
                    <span>Episodes / Videos:</span>
                    <span className="font-bold text-white">{cat.count} total ({cat.readyCount} ready)</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Latest Update:</span>
                    <span className="font-bold text-slate-300">
                      {cat.latestDate ? new Date(cat.latestDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-1.5 rtl:space-x-reverse pt-1 border-t border-purple-500/10">
                  <button
                    onClick={() => {
                      setEditingCategory(cat.name);
                      setRenameValue(cat.name);
                    }}
                    className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition"
                    title="Rename Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(cat.name)}
                    className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
