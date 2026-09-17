import React from 'react';
import { LayoutGrid, ArrowLeftRight, Clock, Server, Sun, Moon, Languages } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../locales/useTranslation';

export const Sidebar = () => {
  const { activeTab, setActiveTab, activeServer, theme, setTheme, toggleTheme } = useAppStore();
  const { t, language, setLanguage, toggleLanguage } = useTranslation();

  const navItems = [
    { id: 'studio', label: t('sidebar.queryStudio'), icon: LayoutGrid, desc: t('sidebar.queryStudioDesc') },
    { id: 'compare', label: t('sidebar.crossServerDiff'), icon: ArrowLeftRight, desc: t('sidebar.crossServerDiffDesc') },
    { id: 'schedules', label: t('sidebar.autoBlast'), icon: Clock, desc: t('sidebar.autoBlastDesc') },
    { id: 'servers', label: t('sidebar.serverProfiles'), icon: Server, desc: t('sidebar.serverProfilesDesc') },
  ];

  return (
    <aside className="w-60 border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur flex flex-col justify-between p-3.5 select-none shrink-0 transition-colors duration-200">
      <div className="space-y-4">
        <div className="px-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t('sidebar.moduleHeader')}
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
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Theme & Language Segmented Switches + SAP Status Card */}
      <div className="space-y-2.5">
        {/* Theme & Language Controls (Side-by-Side Segmented Switches) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Theme Segmented Switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-xs border border-slate-200/60 dark:border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title={t('sidebar.switchToLight')}
            >
              <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-500 fill-amber-400/20' : ''}`} />
              <span className="text-[10px]">Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white dark:bg-slate-800 text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title={t('sidebar.switchToDark')}
            >
              <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-indigo-400 fill-indigo-400/20' : ''}`} />
              <span className="text-[10px]">Dark</span>
            </button>
          </div>

          {/* Language Segmented Switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-mono font-black transition-all duration-200 cursor-pointer ${
                language === 'en'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="English (Default)"
            >
              <span>🇬🇧</span>
              <span>EN</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('id')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-mono font-black transition-all duration-200 cursor-pointer ${
                language === 'id'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Bahasa Indonesia"
            >
              <span>🇮🇩</span>
              <span>ID</span>
            </button>
          </div>
        </div>

        {/* SAP System Status Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{t('sidebar.liveGateway')}</span>
            </div>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
              {t('sidebar.online')}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            <div>
              {t('sidebar.server')}: <b className="text-slate-700 dark:text-slate-200">{activeServer?.name || 'Loading...'}</b>
            </div>
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-mono pt-1 border-t border-slate-100 dark:border-slate-700/60">
              <span>SID: {activeServer?.sid || '-'}</span>
              <span>{t('sidebar.client')}: {activeServer?.client || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
