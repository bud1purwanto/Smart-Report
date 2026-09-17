import React from 'react';
import { LayoutGrid, ArrowLeftRight, Clock, Server, Code2, Database } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Sidebar = () => {
  const { activeTab, setActiveTab, activeServer } = useAppStore();

  const navItems = [
    { id: 'studio', label: 'Query Studio', icon: LayoutGrid },
    { id: 'compare', label: 'Cross-Server Diff', icon: ArrowLeftRight },
    { id: 'schedules', label: 'Auto-Blast Telegram', icon: Clock },
    { id: 'servers', label: 'SAP Servers', icon: Server },
  ];

  return (
    <aside className="w-56 border-r border-slate-800 bg-slate-900/60 backdrop-blur flex flex-col justify-between p-3 select-none shrink-0">
      <div className="space-y-4">
        <div className="px-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Modul Utama
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* SAP System Status Card */}
      <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">SAP Live Gateway</span>
          </div>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
            CONNECTED
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          <div>
            Server: <b className="text-slate-200">{activeServer?.name || 'Loading...'}</b>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[10px] mt-0.5 font-mono">
            <span>SID: {activeServer?.sid || '-'}</span>
            <span>CLI: {activeServer?.client || '-'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

