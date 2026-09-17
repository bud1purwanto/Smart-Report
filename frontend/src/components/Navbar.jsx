import React from 'react';
import { Play, Sparkles, Plus, Save, Server, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { useGridStore } from '../store/useGridStore';
import { executeQuery, saveQuery, updateQuery } from '../services/api';

export const Navbar = () => {
  const {
    activeServer,
    servers,
    setActiveServer,
    setAiModalOpen,
    setTableCatalogOpen,
    currentQueryId,
    currentQueryName,
    setCurrentQuery,
    showNotification,
  } = useAppStore();

  const { getQueryDefinition } = useCanvasStore();
  const { setGridData, setIsExecuting, setError, anonymize, deduplicate, activeVariant, isExecuting } = useGridStore();

  const handleRunQuery = async () => {
    const queryDef = getQueryDefinition();
    if (!queryDef.tables || queryDef.tables.length === 0) {
      showNotification('Pilih minimal satu tabel di kanvas terlebih dahulu.', 'warning');
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
    try {
      if (currentQueryId) {
        await updateQuery(currentQueryId, {
          name: currentQueryName,
          query_json: queryDef,
        });
        showNotification('Query berhasil diperbarui.', 'success');
      } else {
        const res = await saveQuery({
          name: currentQueryName || 'New SAP Query',
          query_json: queryDef,
        });
        setCurrentQuery(res.data.id, res.data.name);
        showNotification('Query baru berhasil disimpan.', 'success');
      }
    } catch (err) {
      showNotification('Gagal menyimpan query: ' + err.message, 'error');
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">
          <span className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 text-sm font-mono">
            SQ
          </span>
          <span>SMART SQVI</span>
        </div>
        <span className="text-slate-600">/</span>
        <input
          type="text"
          value={currentQueryName}
          onChange={(e) => setCurrentQuery(currentQueryId, e.target.value)}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 focus:border-sky-500 rounded px-2.5 py-1 text-sm text-slate-200 focus:outline-none w-64 transition font-medium"
          placeholder="Nama Laporan SAP..."
        />
      </div>

      <div className="flex items-center gap-2.5">
        {/* Active Server Dropdown */}
        <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 rounded-lg px-2.5 py-1">
          <Server className="w-4 h-4 text-sky-400" />
          <select
            value={activeServer?.id || ''}
            onChange={(e) => {
              const s = servers.find((srv) => srv.id === parseInt(e.target.value));
              if (s) setActiveServer(s);
            }}
            className="bg-transparent text-xs text-slate-200 focus:outline-none font-medium cursor-pointer"
          >
            {servers.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                {s.name} ({s.sid} / {s.environment.toUpperCase()})
              </option>
            ))}
          </select>
          {activeServer?.environment === 'production' && (
            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
              PRD
            </span>
          )}
        </div>

        {/* AI Assistant Button */}
        <button
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Assistant</span>
        </button>

        {/* Add Table Button */}
        <button
          onClick={() => setTableCatalogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
        >
          <Plus className="w-3.5 h-3.5 text-slate-400" />
          <span>Tambah Tabel</span>
        </button>

        {/* Save Query Button */}
        <button
          onClick={handleSaveQuery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
        >
          <Save className="w-3.5 h-3.5 text-slate-400" />
          <span>Simpan</span>
        </button>

        {/* Run Query Button */}
        <button
          onClick={handleRunQuery}
          disabled={isExecuting}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition ${
            isExecuting
              ? 'bg-sky-700 text-slate-300 cursor-not-allowed'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isExecuting ? 'Menjalankan...' : 'Run Query'}</span>
        </button>
      </div>
    </header>
  );
};

