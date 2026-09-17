import React, { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { VisualCanvas } from './features/canvas/VisualCanvas';
import { AlvGrid } from './features/grid/AlvGrid';
import { ExportToolbar } from './features/grid/ExportToolbar';
import { AbapValidatorPanel } from './features/validator/AbapValidatorPanel';
import { JoinModal } from './features/canvas/JoinModal';
import { TableCatalogModal } from './features/canvas/TableCatalogModal';
import { CustomColumnModal } from './features/grid/CustomColumnModal';
import { VariantManagerModal } from './features/grid/VariantManagerModal';
import { AiAssistantModal } from './features/chat/AiAssistantModal';
import { FilterManagerModal } from './features/canvas/FilterManagerModal';
import { CrossServerCompare } from './features/compare/CrossServerCompare';
import { ScheduleManager } from './features/schedule/ScheduleManager';
import { ServerManager } from './features/servers/ServerManager';
import { useAppStore } from './store/useAppStore';
import { useCanvasStore } from './store/useCanvasStore';
import { useGridStore } from './store/useGridStore';
import { Database } from 'lucide-react';
import { getQueries, getQuery } from './services/api';

export const App = () => {
  const {
    activeTab,
    loadServers,
    loadSavedQueries,
    setCurrentQuery,
    notification,
    initTheme,
  } = useAppStore();
  const { loadQueryDefinition } = useCanvasStore();
  const { viewMode, rowData, setViewMode } = useGridStore();

  useEffect(() => {
    initTheme();
    loadServers();
    loadSavedQueries();
    // Load initial query if available
    const initQuery = async () => {
      try {
        const res = await getQueries();
        if (res.data && res.data.length > 0) {
          const first = res.data[0];
          const queryRes = await getQuery(first.id);
          if (queryRes.data && queryRes.data.query_json) {
            await loadQueryDefinition(queryRes.data.query_json);
            setCurrentQuery(queryRes.data.id, queryRes.data.name);
          }
        }
      } catch (e) {
        // Silently continue if no queries exist yet
      }
    };
    initQuery();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar />

      {/* Global Toast Notification */}
      {notification && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-700 dark:bg-red-950/90 dark:border-red-800 dark:text-red-200'
              : notification.type === 'warning'
              ? 'bg-amber-50/95 border-amber-200 text-amber-700 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200'
              : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50 dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-950">
          {activeTab === 'studio' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {/* Visual Query Canvas (React Flow) */}
              <div
                className={`relative flex flex-col transition-all duration-300 ${
                  viewMode === 'canvas'
                    ? 'flex-1 h-full'
                    : viewMode === 'split'
                    ? 'flex-1 min-h-0'
                    : 'hidden'
                }`}
              >
                <div className="flex-1 relative h-full">
                  <VisualCanvas />
                  <AbapValidatorPanel />

                  {/* Floating button when ALV has data and user is in Canvas Full view */}
                  {rowData.length > 0 && viewMode === 'canvas' && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                      <button
                        onClick={() => setViewMode('split')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-sky-900/20 border border-sky-400/30 transition transform hover:-translate-y-0.5 cursor-pointer backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
                      >
                        <Database className="w-4 h-4" />
                        <span>Buka Hasil ALV Grid ({rowData.length} baris)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Next-Gen ALV Grid (AG Grid) - Visible only on query execution or when toggled */}
              <div
                className={`flex flex-col bg-white dark:bg-slate-900 transition-all duration-300 ${
                  viewMode === 'canvas'
                    ? 'hidden'
                    : viewMode === 'split'
                    ? 'flex-1 min-h-0 border-t border-slate-200 dark:border-slate-800 shadow-xl z-10'
                    : 'flex-1 h-full'
                }`}
              >
                <ExportToolbar />
                <div className="flex-1 relative min-h-0">
                  <AlvGrid />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compare' && <CrossServerCompare />}
          {activeTab === 'schedules' && <ScheduleManager />}
          {activeTab === 'servers' && <ServerManager />}
        </main>
      </div>

      {/* Reusable Modals */}
      <JoinModal />
      <TableCatalogModal />
      <FilterManagerModal />
      <CustomColumnModal />
      <VariantManagerModal />
      <AiAssistantModal />
    </div>
  );
};

export default App;

