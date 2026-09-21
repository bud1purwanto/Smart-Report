import React, { useEffect, useState } from 'react';
import {
  Play, Sparkles, Plus, Save, Server, FolderKanban,
  FilePlus2, ChevronDown, Check, Trash2, SlidersHorizontal,
  ArrowLeftRight, Layers, Columns2, Table2, Clock, Menu
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { useCompareStore } from '../store/useCompareStore';
import { useGridStore } from '../store/useGridStore';
import { useTranslation } from '../locales/useTranslation';
import { executeQuery, saveQuery, updateQuery, deleteQuery } from '../services/api';
import { ConfirmDialog } from './ui/ConfirmDialog';

export const Navbar = () => {
  const {
    activeTab,
    activeServer,
    servers,
    setActiveServer,
    savedQueries,
    loadSavedQueries,
    currentQueryId,
    currentQueryName,
    setCurrentQuery,
    createNewProject,
    selectProject,
    setAiModalOpen,
    setTableCatalogOpen,
    setFilterModalOpen,
    showNotification,
    toggleMobileSidebar,
  } = useAppStore();

  const { t } = useTranslation();

  const { getQueryDefinition, filters: canvasFilters } = useCanvasStore();
  const { setGridData, setIsExecuting, setError, anonymize, deduplicate, activeVariant, isExecuting } = useGridStore();
  const {
    serverAId,
    serverBId,
    setServers,
    nodes: compareNodes,
    filters: compareFilters,
    isComparing,
    compareResult,
    compareViewMode,
    setCompareViewMode,
    executeCompare,
  } = useCompareStore();

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [productionConfirmOpen, setProductionConfirmOpen] = useState(false);

  useEffect(() => {
    loadSavedQueries();
  }, []);

  // Initialize Compare Servers if not set
  useEffect(() => {
    if (servers.length > 0 && (!serverAId || !serverBId)) {
      const defaultA = servers[6]?.id || servers[0]?.id || 1;
      const defaultB = servers[0]?.id || 1;
      setServers(defaultA, defaultB);
    }
  }, [servers, serverAId, serverBId, setServers]);

  const executeStudioQuery = async () => {
    const queryDef = getQueryDefinition();
    if (!queryDef.tables || queryDef.tables.length === 0) {
      showNotification(t('filter.noTablesWarning'), 'warning');
      return;
    }

    setIsExecuting(true);
    try {
      const res = await executeQuery({
        server_id: activeServer?.id,
        query: queryDef,
        apply_variant_id: activeVariant?.id,
        anonymize,
        deduplicate,
      });
      setGridData(res.data);
      showNotification(`${t('nav.querySuccess')}: ${res.data.total_rows} ${t('common.rows')} (${res.data.execution_time_ms} ms)`, 'success');
    } catch (err) {
      const msg = err.normalized?.message || err.message || 'Terjadi kesalahan pada eksekusi query.';
      setError(msg);
      showNotification(`${t('common.error')}: ${msg}`, 'error');
    }
  };

  const handleRunQuery = () => {
    if (activeServer?.environment === 'production') {
      setProductionConfirmOpen(true);
      return;
    }
    executeStudioQuery();
  };

  const handleRunCompare = async () => {
    if (compareNodes.length === 0) {
      showNotification(t('filter.noTablesWarning'), 'warning');
      return;
    }
    if (serverAId === serverBId) {
      showNotification(t('common.warning'), 'warning');
      return;
    }

    try {
      setCompareViewMode('split');
      await executeCompare();
      showNotification(t('nav.compareSuccess'), 'success');
    } catch (err) {
      const msg = err.normalized?.message || err.message;
      showNotification(`${t('common.error')}: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`, 'error');
    }
  };

  const handleSaveQuery = async () => {
    const queryDef = getQueryDefinition();
    if (!queryDef.tables || queryDef.tables.length === 0) {
      showNotification(t('filter.noTablesWarning'), 'warning');
      return;
    }

    try {
      if (currentQueryId) {
        await updateQuery(currentQueryId, {
          name: currentQueryName,
          query_json: queryDef,
        });
        showNotification(t('common.success'), 'success');
      } else {
        const res = await saveQuery({
          name: currentQueryName || 'QuickView Query Baru',
          query_json: queryDef,
        });
        setCurrentQuery(res.data.id, res.data.name);
        showNotification(t('common.success'), 'success');
      }
      await loadSavedQueries();
    } catch (err) {
      showNotification(err.normalized?.message || err.message, 'error');
    }
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (confirm(t('common.confirmDelete'))) {
      try {
        await deleteQuery(id);
        showNotification(t('common.success'), 'info');
        if (currentQueryId === id) {
          createNewProject();
        }
        await loadSavedQueries();
      } catch (err) {
        showNotification(err.normalized?.message || err.message, 'error');
      }
    }
  };

  return (
    <>
    <header className="h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between z-30 shrink-0 shadow-xs transition-colors duration-200 gap-2">
      {/* ============================================================ */}
      {/* BRAND & CONTEXT TITLE (SEPARATED PER TAB)                     */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Button */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 md:hidden cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0"
          title="Buka Menu Modul"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100 shrink-0">
          <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white flex items-center justify-center font-mono text-xs shadow-sm ${
            activeTab === 'compare' ? 'bg-purple-600' : 'bg-sky-600'
          }`}>
            {activeTab === 'compare' ? <ArrowLeftRight className="w-4 h-4" /> : 'SR'}
          </span>
          <span className={`bg-clip-text text-transparent font-black tracking-tight text-sm sm:text-base hidden xs:inline ${
            activeTab === 'compare'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-700 dark:from-purple-400 dark:to-indigo-400'
              : 'bg-gradient-to-r from-sky-700 to-indigo-700 dark:from-sky-400 dark:to-indigo-400'
          }`}>
            {t('nav.brand')}
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>

        {/* QUERY STUDIO CONTEXT */}
        {activeTab === 'studio' && (
          <div className="flex items-center gap-2 min-w-0">
            {/* Project Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shrink-0"
              >
                <FolderKanban className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="max-w-[100px] sm:max-w-[150px] truncate">
                  {currentQueryId ? currentQueryName : t('nav.unsavedProject')}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {projectDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('nav.projectReportList')}
                    </span>
                    <button
                      onClick={() => {
                        createNewProject();
                        setProjectDropdownOpen(false);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>{t('nav.newProject')}</span>
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50 dark:divide-slate-800">
                    {savedQueries.map((q) => {
                      const isCurrent = currentQueryId === q.id;
                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            selectProject(q.id);
                            setProjectDropdownOpen(false);
                          }}
                          className={`px-3 py-2 flex items-center justify-between hover:bg-sky-50/60 dark:hover:bg-slate-800 cursor-pointer text-xs transition ${
                            isCurrent ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="truncate">{q.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {q.description || '-'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCurrent && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                            <button
                              onClick={(e) => handleDeleteProject(q.id, e)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded transition"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {savedQueries.length === 0 && (
                      <div className="p-3 text-center text-slate-400 text-xs">{t('nav.noSavedProjects')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Editable Query Title (Hidden on small mobile screens) */}
            <input
              type="text"
              value={currentQueryName}
              onChange={(e) => setCurrentQuery(currentQueryId, e.target.value)}
              className="bg-slate-100/70 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none w-36 sm:w-48 transition font-medium focus:bg-white dark:focus:bg-slate-900 hidden md:block"
              placeholder={t('nav.reportNamePlaceholder')}
            />
          </div>
        )}

        {/* CROSS-SERVER DIFF CONTEXT */}
        {activeTab === 'compare' && (
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate">
              {t('nav.crossServerDiff')}
            </span>
            <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md font-mono font-bold hidden sm:inline">
              {t('nav.parallelBadge')}
            </span>
          </div>
        )}

        {/* AUTO-BLAST TELEGRAM CONTEXT */}
        {activeTab === 'schedules' && (
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate">
              {t('nav.schedulesTitle')}
            </span>
            <span className="text-[10px] bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md font-mono font-bold hidden sm:inline">
              {t('nav.schedulesBadge')}
            </span>
          </div>
        )}

        {/* SERVER PROFILES CONTEXT */}
        {activeTab === 'servers' && (
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate">
              {t('nav.serversTitle')}
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-mono font-bold">
              {servers.length} {t('nav.serversBadge')}
            </span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RIGHT ACTION TOOLBAR (SEPARATED PER TAB)                     */}
      {/* ============================================================ */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* ==================== QUERY STUDIO TOOLBAR ==================== */}
        {activeTab === 'studio' && (
          <>
            {/* Active Server Dropdown */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 sm:px-2.5 py-1">
              <Server className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <select
                value={activeServer?.id || ''}
                onChange={(e) => {
                  const s = servers.find((srv) => srv.id === parseInt(e.target.value));
                  if (s) setActiveServer(s);
                }}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-semibold cursor-pointer max-w-[90px] sm:max-w-[140px] truncate"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {s.name} ({s.sid})
                  </option>
                ))}
              </select>
              {activeServer?.environment === 'production' && (
                <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-1.5 py-0.2 rounded font-mono font-bold hidden sm:inline">
                  PRD
                </span>
              )}
            </div>

            {/* Selection Parameters / Filter Button (QUERY STUDIO) */}
            <button
              onClick={() => setFilterModalOpen(true)}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                canvasFilters.length > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Atur Kriteria Seleksi / Parameter Query (WHERE clause)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline">{t('nav.parameter')}</span>
              {canvasFilters.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {canvasFilters.length}
                </span>
              )}
            </button>

            {/* Save Query Button */}
            <button
              onClick={handleSaveQuery}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
              title={t('nav.save')}
            >
              <Save className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
              <span className="hidden md:inline">{t('nav.save')}</span>
            </button>

            {/* Run Query Button */}
            <button
              onClick={handleRunQuery}
              disabled={isExecuting}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer shrink-0 ${
                isExecuting
                  ? 'bg-sky-400 text-white cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span className="font-extrabold">{isExecuting ? t('nav.running') : t('nav.runQuery')}</span>
            </button>
          </>
        )}

        {/* ==================== CROSS-SERVER DIFF TOOLBAR ==================== */}
        {activeTab === 'compare' && (
          <>
            {/* Server A vs Server B Selector */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-1 px-2.5 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-sky-700 dark:text-sky-300 font-mono uppercase bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 rounded">
                  {t('nav.serverA')}
                </span>
                <select
                  value={serverAId || ''}
                  onChange={(e) => setServers(parseInt(e.target.value), serverBId)}
                  className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {s.name} ({s.sid})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-300 dark:text-slate-600 font-black text-xs">VS</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 font-mono uppercase bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
                  {t('nav.serverB')}
                </span>
                <select
                  value={serverBId || ''}
                  onChange={(e) => setServers(serverAId, parseInt(e.target.value))}
                  className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {s.name} ({s.sid})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selection Parameters / Filter Button (COMPARE) */}
            <button
              onClick={() => setFilterModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                compareFilters.length > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title={t('nav.selectionParamTooltip')}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{t('nav.parameter')}</span>
              {compareFilters.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {compareFilters.length}
                </span>
              )}
            </button>

            {/* View Mode Controls when Results are Available */}
            {compareResult && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setCompareViewMode('canvas')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    compareViewMode === 'canvas'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title={t('nav.canvasView')}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t('nav.canvasView')}</span>
                </button>
                <button
                  onClick={() => setCompareViewMode('split')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    compareViewMode === 'split'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title={t('nav.splitView')}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t('nav.splitView')}</span>
                </button>
                <button
                  onClick={() => setCompareViewMode('results')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    compareViewMode === 'results'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title={t('nav.diffResultsView')}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t('nav.diffResultsView')}</span>
                  <span className="bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {compareResult.diff_rows?.length || 0}
                  </span>
                </button>
              </div>
            )}

            {/* Jalankan Komparasi Button */}
            <button
              onClick={handleRunCompare}
              disabled={isComparing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isComparing ? 'animate-spin' : ''}`} />
              <span>{isComparing ? t('nav.comparing') : t('nav.runCompare')}</span>
            </button>
          </>
        )}
      </div>
    </header>
    <ConfirmDialog
      open={productionConfirmOpen}
      title="Jalankan query di sistem produksi?"
      description={`Query akan membaca SAP ${activeServer?.sid || 'PRD'} client ${activeServer?.client || '-'}. Pastikan filter dan batas baris sudah sesuai sebelum melanjutkan.`}
      confirmLabel="Ya, jalankan di PRD"
      onCancel={() => setProductionConfirmOpen(false)}
      onConfirm={() => {
        setProductionConfirmOpen(false);
        executeStudioQuery();
      }}
    />
    </>
  );
};
