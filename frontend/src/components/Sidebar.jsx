import React from 'react';
import { LayoutGrid, ArrowLeftRight, Clock, Server, Sun, Moon, Languages, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../locales/useTranslation';

export const Sidebar = () => {
  const { activeTab, setActiveTab, activeServer, theme, toggleTheme, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const { t, language, toggleLanguage } = useTranslation();

  const navItems = [
    { id: 'studio', label: t('sidebar.queryStudio'), icon: LayoutGrid, desc: t('sidebar.queryStudioDesc') },
    { id: 'compare', label: t('sidebar.crossServerDiff'), icon: ArrowLeftRight, desc: t('sidebar.crossServerDiffDesc') },
    { id: 'schedules', label: t('sidebar.autoBlast'), icon: Clock, desc: t('sidebar.autoBlastDesc') },
    { id: 'servers', label: t('sidebar.serverProfiles'), icon: Server, desc: t('sidebar.serverProfilesDesc') },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-72 md:w-60
          transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          transition-transform duration-200 ease-in-out
          border-r border-slate-200/90 dark:border-slate-800
          bg-white dark:bg-slate-900 md:bg-slate-50/80 md:dark:bg-slate-900/80
          backdrop-blur-md flex flex-col justify-between p-3.5 select-none shrink-0 shadow-2xl md:shadow-none
        `}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('sidebar.moduleHeader')}
            </span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden cursor-pointer"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
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

      {/* Bottom Section: Theme & Language Controls + SAP Status Card */}
      <div className="space-y-2.5">
        {/* Simple Theme & Language Controls */}
        <div className="grid grid-cols-2 gap-2">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:bg-slate-100/80 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title={theme === 'dark' ? t('sidebar.switchToLight') : t('sidebar.switchToDark')}
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400/20" />
                <span>Light</span>
              </>
            )}
          </button>

          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:bg-slate-100/80 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title={language === 'en' ? 'Ganti ke Bahasa Indonesia' : 'Switch to English'}
          >
            <Languages className="w-3.5 h-3.5 text-sky-500" />
            <span className="font-mono font-bold uppercase">{language}</span>
          </button>
        </div>

        {/* SAP System Status Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${activeServer?.is_active ? 'bg-sky-500 ring-4 ring-sky-100 dark:ring-sky-950/60' : 'bg-slate-400'}`}></span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Profil SAP</span>
            </div>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
              {activeServer?.is_active ? 'AKTIF' : 'NONAKTIF'}
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
    </>
  );
};
