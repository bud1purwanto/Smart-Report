import React, { useEffect, useState } from 'react';
import {
  Play, Sparkles, Plus, Save, Server, FolderKanban,
  FilePlus2, ChevronDown, Check, Trash2, SlidersHorizontal,
  ArrowLeftRight, Layers, Columns2, Table2, Clock
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { useCompareStore } from '../store/useCompareStore';
import { useGridStore } from '../store/useGridStore';
import { executeQuery, saveQuery, updateQuery, deleteQuery } from '../services/api';

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
  } = useAppStore();

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

  const handleRunQuery = async () => {
    const queryDef = getQueryDefinition();
    if (!queryDef.tables || queryDef.tables.length === 0) {
      showNotification('Pilih atau tambahkan minimal satu tabel di kanvas terlebih dahulu.', 'warning');
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
      showNotification(`Query selesai: ${res.data.total_rows} baris (${res.data.execution_time_ms} ms)`, 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
      showNotification(`Gagal eksekusi query: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`, 'error');
    }
  };

  const handleRunCompare = async () => {
    if (compareNodes.length === 0) {
      showNotification('Tambahkan minimal satu tabel di kanvas komparasi terlebih dahulu.', 'warning');
      return;
    }
    if (serverAId === serverBId) {
      showNotification('Pilih dua server SAP yang berbeda untuk melakukan komparasi.', 'warning');
      return;
    }

    try {
      setCompareViewMode('split');
      await executeCompare();
      showNotification('Komparasi data antar-server SAP selesai.', 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      showNotification(`Gagal komparasi: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`, 'error');
    }
  };

  const handleSaveQuery = async () => {
    const queryDef = getQueryDefinition();
    if (!queryDef.tables || queryDef.tables.length === 0) {
      showNotification('Kanvas masih kosong, tidak ada yang dapat disimpan.', 'warning');
      return;
    }

    try {
      if (currentQueryId) {
        await updateQuery(currentQueryId, {
          name: currentQueryName,
          query_json: queryDef,
        });
        showNotification('Query berhasil disimpan.', 'success');
      } else {
        const res = await saveQuery({
          name: currentQueryName || 'QuickView Query Baru',
          query_json: queryDef,
        });
        setCurrentQuery(res.data.id, res.data.name);
        showNotification('Query baru berhasil dibuat dan disimpan.', 'success');
      }
      await loadSavedQueries();
    } catch (err) {
      showNotification('Gagal menyimpan query: ' + err.message, 'error');
    }
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (confirm('Yakin ingin menghapus query project ini?')) {
      try {
        await deleteQuery(id);
        showNotification('Query berhasil dihapus.', 'info');
        if (currentQueryId === id) {
          createNewProject();
        }
        await loadSavedQueries();
      } catch (err) {
        showNotification('Gagal menghapus: ' + err.message, 'error');
      }
    }
  };

  return (
    <header className="h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0 shadow-xs transition-colors duration-200">
      {/* ============================================================ */}
      {/* BRAND & CONTEXT TITLE (SEPARATED PER TAB)                     */}
      {/* ============================================================ */}
      <div className="flex items-center gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100">
          <span className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-mono text-xs shadow-sm ${
            activeTab === 'compare' ? 'bg-purple-600' : 'bg-sky-600'
          }`}>
            {activeTab === 'compare' ? <ArrowLeftRight className="w-4 h-4" /> : 'SR'}
          </span>
          <span className={`bg-clip-text text-transparent font-black tracking-tight text-base ${
            activeTab === 'compare'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-700 dark:from-purple-400 dark:to-indigo-400'
              : 'bg-gradient-to-r from-sky-700 to-indigo-700 dark:from-sky-400 dark:to-indigo-400'
          }`}>
            SMART REPORT
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">/</span>

        {/* QUERY STUDIO CONTEXT */}
        {activeTab === 'studio' && (
          <div className="flex items-center gap-2.5">
            {/* Project Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                <FolderKanban className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="max-w-[160px] truncate">
                  {currentQueryId ? currentQueryName : 'Project Baru (Belum Disimpan)'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {projectDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Daftar Project Report
                    </span>
                    <button
                      onClick={() => {
                        createNewProject();
                        setProjectDropdownOpen(false);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>+ Buat Baru</span>
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
                              {q.description || 'Tidak ada deskripsi'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCurrent && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                            <button
                              onClick={(e) => handleDeleteProject(q.id, e)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded transition"
                              title="Hapus Project"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {savedQueries.length === 0 && (
                      <div className="p-3 text-center text-slate-400 text-xs">Belum ada project tersimpan</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Editable Query Title */}
            <input
              type="text"
              value={currentQueryName}
              onChange={(e) => setCurrentQuery(currentQueryId, e.target.value)}
              className="bg-slate-100/70 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none w-56 transition font-medium focus:bg-white dark:focus:bg-slate-900"
              placeholder="Nama Laporan SAP..."
            />
          </div>
        )}

        {/* CROSS-SERVER DIFF CONTEXT */}
        {activeTab === 'compare' && (
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Cross-Server Diff
            </span>
            <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md font-mono font-bold hidden sm:inline">
              PARALEL MULTI-SERVER
            </span>
          </div>
        )}

        {/* AUTO-BLAST TELEGRAM CONTEXT */}
        {activeTab === 'schedules' && (
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Auto-Blast Telegram & Scheduler
            </span>
            <span className="text-[10px] bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md font-mono font-bold hidden sm:inline">
              OTOMASI
            </span>
          </div>
        )}

        {/* SERVER PROFILES CONTEXT */}
        {activeTab === 'servers' && (
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Profil Server SAP
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-mono font-bold">
              {servers.length} SERVER
            </span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RIGHT ACTION TOOLBAR (SEPARATED PER TAB)                     */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2">
        {/* ==================== QUERY STUDIO TOOLBAR ==================== */}
        {activeTab === 'studio' && (
          <>
            {/* Active Server Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
              <Server className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <select
                value={activeServer?.id || ''}
                onChange={(e) => {
                  const s = servers.find((srv) => srv.id === parseInt(e.target.value));
                  if (s) setActiveServer(s);
                }}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-semibold cursor-pointer"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {s.name} ({s.sid})
                  </option>
                ))}
              </select>
              {activeServer?.environment === 'production' && (
                <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-1.5 py-0.2 rounded font-mono font-bold">
                  PRD
                </span>
              )}
            </div>

            {/* New Query / Clear Canvas Button */}
            <button
              onClick={createNewProject}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Kosongkan kanvas untuk membuat query baru"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden sm:inline">New Query</span>
            </button>

            {/* AI Assistant Button */}
            <button
              onClick={() => setAiModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/40 dark:hover:to-indigo-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>

            {/* Add Table Button */}
            <button
              onClick={() => setTableCatalogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Tambah Tabel</span>
            </button>

            {/* Selection Parameters / Filter Button (QUERY STUDIO) */}
            <button
              onClick={() => setFilterModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                canvasFilters.length > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Atur Kriteria Seleksi / Parameter Query (WHERE clause)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Parameter</span>
              {canvasFilters.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {canvasFilters.length}
                </span>
              )}
            </button>

            {/* Save Query Button */}
            <button
              onClick={handleSaveQuery}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden sm:inline">Simpan</span>
            </button>

            {/* Run Query Button */}
            <button
              onClick={handleRunQuery}
              disabled={isExecuting}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer ${
                isExecuting
                  ? 'bg-sky-400 text-white cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecuting ? 'Menjalankan...' : 'Run Query'}</span>
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
                  SERVER A
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
                  SERVER B
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
              title="Atur Kriteria Seleksi / Parameter WHERE untuk Komparasi"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Parameter</span>
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
                  title="Tampilan Kanvas Penuh"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Kanvas</span>
                </button>
                <button
                  onClick={() => setCompareViewMode('split')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    compareViewMode === 'split'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Tampilan Split (Kanvas + Hasil Diff)"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Split</span>
                </button>
                <button
                  onClick={() => setCompareViewMode('results')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    compareViewMode === 'results'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Tampilan Hasil Komparasi Penuh"
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Hasil Diff</span>
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
              <span>{isComparing ? 'Membandingkan...' : 'Jalankan Komparasi'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
