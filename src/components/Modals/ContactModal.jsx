import React, { useState } from 'react';
import { X, Mail, Send, CheckCircle } from 'lucide-react';

export default function ContactModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Suggestion',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-900/60 p-2 rounded-full border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Contact & Support</h3>
            <p className="text-xs text-slate-400">
              Send your queries or suggestions to{' '}
              <a href="mailto:support@subtie.msoms.ai" className="text-purple-400 hover:underline">
                support@subtie.msoms.ai
              </a>
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="py-12 flex flex-col items-center text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
            <h4 className="text-lg font-semibold text-white">Thank you for your message!</h4>
            <p className="text-xs text-slate-400">We have received your input and will review it promptly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kaizoku Translator"
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
              >
                <option value="Suggestion">Feature Suggestion</option>
                <option value="Query">General Query</option>
                <option value="Complaint">Issue / Complaint</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Message</label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write your suggestions, queries or issues..."
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-sm hover:opacity-95 transition shadow-lg shadow-purple-500/20"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
