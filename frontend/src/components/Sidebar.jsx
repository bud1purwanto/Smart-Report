import React from 'react';
import { LayoutGrid, ArrowLeftRight, Clock, Server } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Sidebar = () => {
  const { activeTab, setActiveTab, activeServer } = useAppStore();

  const navItems = [
    { id: 'studio', label: 'Query Studio', icon: LayoutGrid, desc: 'Visual Canvas & ALV Grid' },
    { id: 'compare', label: 'Cross-Server Diff', icon: ArrowLeftRight, desc: 'Komparasi Multi-Server' },
    { id: 'schedules', label: 'Auto-Blast Telegram', icon: Clock, desc: 'Jadwal & Notifikasi' },
    { id: 'servers', label: 'SAP Server Profiles', icon: Server, desc: 'Katalog Host & SID' },
  ];

  return (
    <aside className="w-60 border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur flex flex-col justify-between p-3.5 select-none shrink-0 transition-colors duration-200">
      <div className="space-y-4">
        <div className="px-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Modul Smart Report
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-400 font-bold shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <div className="truncate">
                  <div className="text-xs leading-none">{item.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 truncate">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* SAP System Status Card */}
      <div className="rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">SAP Live Gateway</span>
          </div>
          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
            ONLINE
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          <div>
            Server: <b className="text-slate-700 dark:text-slate-200">{activeServer?.name || 'Loading...'}</b>
          </div>
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-mono pt-1 border-t border-slate-100 dark:border-slate-700/60">
            <span>SID: {activeServer?.sid || '-'}</span>
            <span>Client: {activeServer?.client || '-'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
