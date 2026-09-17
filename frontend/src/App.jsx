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
import { CrossServerCompare } from './features/compare/CrossServerCompare';
import { ScheduleManager } from './features/schedule/ScheduleManager';
import { ServerManager } from './features/servers/ServerManager';
import { useAppStore } from './store/useAppStore';
import { useCanvasStore } from './store/useCanvasStore';
import { getQuery } from './services/api';

export const App = () => {
  const {
    activeTab,
    loadServers,
    loadSavedQueries,
    setCurrentQuery,
    notification,
  } = useAppStore();
  const { loadQueryDefinition } = useCanvasStore();

  useEffect(() => {
    loadServers();
    loadSavedQueries();
    // Load initial seed query (PO Price Variance Analysis)
    const initQuery = async () => {
      try {
        const res = await getQuery(1);
        if (res.data && res.data.query_json) {
          await loadQueryDefinition(res.data.query_json);
          setCurrentQuery(res.data.id, res.data.name);
        }
      } catch (e) {
        console.warn('Could not load initial query:', e);
      }
    };
    initQuery();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Global Toast Notification */}
      {notification && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-700'
              : notification.type === 'warning'
              ? 'bg-amber-50/95 border-amber-200 text-amber-700'
              : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50'
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
        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
          {activeTab === 'studio' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Top Viewport: Visual Query Canvas (React Flow) */}
              <div className="flex-1 relative border-b border-slate-200 flex flex-col min-h-[340px]">
                <div className="flex-1 relative">
                  <VisualCanvas />
                </div>
                <AbapValidatorPanel />
              </div>

              {/* Bottom Viewport: Next-Gen ALV Grid (AG Grid) */}
              <div className="h-[380px] flex flex-col bg-white shrink-0 border-t border-slate-200">
                <ExportToolbar />
                <div className="flex-1 relative">
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
      <CustomColumnModal />
      <VariantManagerModal />
      <AiAssistantModal />
    </div>
  );
};

export default App;

