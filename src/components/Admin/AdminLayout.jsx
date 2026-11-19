import React, { useState } from 'react';
import { 
  Layers, Zap, ShieldCheck, Key, Users, Film, Folder, 
  HardDrive, Trash2, Cpu, Settings, ArrowLeft, Globe, 
  Moon, Sun, Radio, Activity, ChevronRight, Menu, X, Shield 
} from 'lucide-react';

import IsometricDashboard from './IsometricDashboard';
import QueueManagerModule from './QueueManagerModule';
import StuckSentinelModule from './StuckSentinelModule';
import GeminiPoolModule from './GeminiPoolModule';
import UsersCrudModule from './UsersCrudModule';
import ProjectsCrudModule from './ProjectsCrudModule';
import CategoriesModule from './CategoriesModule';
import StorageBrowserModule from './StorageBrowserModule';
import GarbageCollectorModule from './GarbageCollectorModule';
import DiagnosticsModule from './DiagnosticsModule';
import GlobalSettingsModule from './GlobalSettingsModule';

export default function AdminLayout({ user, onExit, lang = 'en', theme = 'dark', onToggleLang, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAr = lang === 'ar';

  const menuItems = [
    { id: 'dashboard', label: '3D Isometric Topology', icon: Layers, badge: '8 Tiers' },
    { id: 'queue', label: 'BullMQ & Redis Queue', icon: Zap, badge: null },
    { id: 'sentinel', label: 'Stuck Tasks Sentinel', icon: ShieldCheck, badge: null },
    { id: 'gemini', label: 'Gemini 11-Key Cluster', icon: Key, badge: '11 Keys' },
    { id: 'users', label: 'Users & RBAC Roles', icon: Users, badge: null },
    { id: 'projects', label: 'Projects & Videos', icon: Film, badge: null },
    { id: 'categories', label: 'Series & Categories', icon: Folder, badge: null },
    { id: 'storage', label: 'Storage & R2 Vault', icon: HardDrive, badge: 'R2' },
    { id: 'garbage', label: 'Garbage Collector', icon: Trash2, badge: '6.7 GB' },
    { id: 'diagnostics', label: 'Diagnostics & PM2', icon: Cpu, badge: null },
    { id: 'settings', label: 'Global Settings', icon: Settings, badge: null }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Outfit'] select-none">
      
      {/* Top Admin Operations Bar */}
      <header className="h-16 bg-slate-900/90 border-b border-purple-500/20 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Admin Shield Brand */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Shield className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                Subtie AI Operations Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                V2.1 Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Host: subtie.msoms.ai | Cluster: 11-Key Multi-Engine | SQLite WAL + BullMQ
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
          {/* Exit to User App Button */}
          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl text-xs font-black bg-purple-600/20 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/30 transition shadow-sm"
            title="Exit back to Subtie Fansub Hub"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to App</span>
          </button>

          {/* User Pill */}
          <div className="hidden lg:flex items-center space-x-2 rtl:space-x-reverse bg-slate-900 border border-purple-500/20 px-3 py-1.5 rounded-xl text-xs">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center font-bold text-[10px] text-white">
              {(user?.firstName || 'A')[0]}
            </div>
            <span className="font-bold text-white">{user?.firstName}</span>
            <span className="text-[10px] text-rose-400 font-mono">({user?.role})</span>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace (Sidebar + Viewport) */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Left Sidebar Navigation */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900/95 md:bg-slate-900/60 border-r border-purple-500/20 
          transform transition-transform duration-300 ease-in-out md:translate-x-0 overflow-y-auto flex flex-col justify-between
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Operations Modules
            </div>

            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left rtl:text-right ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-300 hover:bg-purple-950/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 rtl:space-x-reverse truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-purple-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer info */}
          <div className="p-4 border-t border-purple-500/10 text-[10px] text-slate-500 font-mono text-center">
            Subtie V2.1 Microservices
            <br />
            100% Real Live Node Telemetry
          </div>
        </aside>

        {/* Viewport Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <IsometricDashboard user={user} lang={lang} onNavigateTab={setActiveTab} />
          )}
          {activeTab === 'queue' && (
            <QueueManagerModule user={user} lang={lang} />
          )}
          {activeTab === 'sentinel' && (
            <StuckSentinelModule user={user} lang={lang} />
          )}
          {activeTab === 'gemini' && (
            <GeminiPoolModule user={user} lang={lang} />
          )}
          {activeTab === 'users' && (
            <UsersCrudModule user={user} lang={lang} />
          )}
          {activeTab === 'projects' && (
            <ProjectsCrudModule user={user} lang={lang} />
          )}
          {activeTab === 'categories' && (
            <CategoriesModule user={user} lang={lang} />
          )}
          {activeTab === 'storage' && (
            <StorageBrowserModule user={user} lang={lang} />
          )}
          {activeTab === 'garbage' && (
            <GarbageCollectorModule user={user} lang={lang} />
          )}
          {activeTab === 'diagnostics' && (
            <DiagnosticsModule user={user} lang={lang} />
          )}
          {activeTab === 'settings' && (
            <GlobalSettingsModule user={user} lang={lang} />
          )}
        </main>

      </div>
    </div>
  );
}
