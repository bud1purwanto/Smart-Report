import React, { useEffect, useState } from 'react';
import {
  Play, Sparkles, Plus, Save, Server, FolderKanban,
  FilePlus2, ChevronDown, Check, Trash2, Sun, Moon, SlidersHorizontal
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { useGridStore } from '../store/useGridStore';
import { executeQuery, saveQuery, updateQuery, deleteQuery } from '../services/api';

export const Navbar = () => {
  const {
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
    theme,
    toggleTheme,
    showNotification,
  } = useAppStore();

  const { getQueryDefinition, filters } = useCanvasStore();
  const { setGridData, setIsExecuting, setError, anonymize, deduplicate, activeVariant, isExecuting } = useGridStore();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  useEffect(() => {
    loadSavedQueries();
  }, []);

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
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100">
          <span className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-mono text-xs shadow-sm">
            SR
          </span>
          <span className="bg-gradient-to-r from-sky-700 to-indigo-700 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent font-black tracking-tight text-base">
            SMART REPORT
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">/</span>

        {/* Project Selector Dropdown (PER PROJECT REPORT) */}
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
          className="bg-slate-100/70 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none w-60 transition font-medium focus:bg-white dark:focus:bg-slate-900"
          placeholder="Nama Laporan SAP..."
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
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

        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition shadow-2xs cursor-pointer"
          title={theme === 'dark' ? 'Beralih ke Light Mode ☀️' : 'Beralih ke Dark Mode 🌙'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* New Query / Clear Canvas Button (Per Project SQVI) */}
        <button
          onClick={createNewProject}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          title="Kosongkan kanvas untuk membuat query baru"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span>New Query</span>
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/40 dark:hover:to-indigo-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-2xs transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>AI Assistant</span>
        </button>

        {/* Add Table Button */}
        <button
          onClick={() => setTableCatalogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Tambah Tabel</span>
        </button>

        {/* Selection Parameters / Filter Button */}
        <button
          onClick={() => setFilterModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            filters.length > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
          }`}
          title="Atur Kriteria Seleksi / Parameter Query (WHERE clause)"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Parameter</span>
          {filters.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {filters.length}
            </span>
          )}
        </button>

        {/* Save Query Button */}
        <button
          onClick={handleSaveQuery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
        >
          <Save className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span>Simpan</span>
        </button>

        {/* Run Query Button */}
        <button
          onClick={handleRunQuery}
          disabled={isExecuting}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition ${
            isExecuting
              ? 'bg-sky-400 text-white cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isExecuting ? 'Menjalankan...' : 'Run Query'}</span>
        </button>
      </div>
    </header>
  );
};
