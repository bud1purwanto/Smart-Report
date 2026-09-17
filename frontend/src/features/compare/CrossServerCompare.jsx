import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight, Play, CheckCircle2, AlertCircle,
  Eye, RefreshCw, Layers, ChevronDown, ChevronUp, Sparkles, X,
  Columns2, Table2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useCompareStore } from '../../store/useCompareStore';
import { CompareCanvas } from './CompareCanvas';

export const CrossServerCompare = () => {
  const { servers, showNotification } = useAppStore();
  const {
    nodes,
    serverAId,
    serverBId,
    setServers,
    filterStatus,
    setFilterStatus,
    isComparing,
    compareResult,
    inspectRow,
    setInspectRow,
    executeCompare,
    addTableNode,
  } = useCompareStore();

  // View mode: 'canvas' (Full Canvas) | 'split' (Canvas + Results) | 'results' (Full Results)
  const [compareViewMode, setCompareViewMode] = useState('canvas');

  // Initialize servers if not set
  useEffect(() => {
    if (servers.length > 0 && (!serverAId || !serverBId)) {
      const defaultA = servers[6]?.id || servers[0]?.id || 1;
      const defaultB = servers[0]?.id || 1;
      setServers(defaultA, defaultB);
    }
  }, [servers, serverAId, serverBId, setServers]);

  const handleRunCompare = async () => {
    if (nodes.length === 0) {
      showNotification('Tambahkan minimal satu tabel di kanvas komparasi terlebih dahulu.', 'warning');
      return;
    }
    if (serverAId === serverBId) {
      showNotification('Pilih dua server SAP yang berbeda untuk melakukan komparasi.', 'warning');
      return;
    }

    try {
      setCompareViewMode('split'); // Reveal split diff results automatically
      await executeCompare();
      showNotification('Komparasi data antar-server SAP selesai.', 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      showNotification(`Gagal komparasi: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`, 'error');
    }
  };

  const handleLoadSample = async () => {
    await addTableNode('EKKO');
    await addTableNode('EKPO');
    showNotification('Tabel EKKO & EKPO dimuat ke kanvas komparasi.', 'info');
  };

  const filteredRows = compareResult?.diff_rows.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.diff_status === filterStatus;
  }) || [];

  const summary = compareResult?.summary;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* Compare Setup Bar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center font-mono shadow-2xs">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Cross-Server Data Compare</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">Komparasi data paralel multi-server SAP secara visual</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-1 px-2.5 shadow-2xs">
            {/* Server A */}
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

            {/* Server B */}
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
        </div>

        <div className="flex items-center gap-2">
          {nodes.length === 0 && (
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Muat Sampel EKKO/EKPO</span>
            </button>
          )}

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
                <span className="hidden sm:inline">Kanvas</span>
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
                <span className="hidden sm:inline">Split</span>
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
                <span className="hidden sm:inline">Hasil Diff</span>
                <span className="bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {filteredRows.length}
                </span>
              </button>
            </div>
          )}

          <button
            onClick={handleRunCompare}
            disabled={isComparing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isComparing ? 'animate-spin' : ''}`} />
            <span>{isComparing ? 'Membandingkan...' : 'Jalankan Komparasi'}</span>
          </button>
        </div>
      </div>

      {/* Compare Canvas Viewport */}
      <div
        className={`relative transition-all duration-300 ${
          compareViewMode === 'canvas'
            ? 'flex-1 h-full'
            : compareViewMode === 'split'
            ? 'h-[320px] shrink-0 border-b border-slate-200 dark:border-slate-800'
            : 'hidden'
        }`}
      >
        <CompareCanvas />

        {/* Floating button when in full canvas mode and results exist */}
        {compareResult && compareViewMode === 'canvas' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => setCompareViewMode('split')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-purple-900/20 border border-purple-400/30 transition transform hover:-translate-y-0.5 cursor-pointer backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Buka Hasil Komparasi Diff ({filteredRows.length} baris)</span>
            </button>
          </div>
        )}
      </div>

      {/* Results Viewport (Summary Cards + Tabs + Diff Table) - Revealed on query run */}
      {(compareResult || isComparing) && compareViewMode !== 'canvas' && (
        <div className={`flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 ${
          compareViewMode === 'results' ? 'flex-1 h-full' : 'flex-1 overflow-auto'
        }`}>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 p-2.5 shadow-2xs">
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">Total Server A</span>
                <span className="text-base font-mono font-black text-sky-800 dark:text-sky-200">{summary.total_a.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{summary.server_a_name}</span>
              </div>
              <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 p-2.5 shadow-2xs">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Total Server B</span>
                <span className="text-base font-mono font-black text-purple-800 dark:text-purple-200">{summary.total_b.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{summary.server_b_name}</span>
              </div>
              <div
                onClick={() => setFilterStatus('IDENTICAL')}
                className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
                  filterStatus === 'IDENTICAL'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-300 dark:ring-emerald-700'
                    : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30'
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Identik</span>
                <span className="text-base font-mono font-black text-emerald-800 dark:text-emerald-200">{summary.identical_count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Tidak ada selisih</span>
              </div>
              <div
                onClick={() => setFilterStatus('MODIFIED')}
                className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
                  filterStatus === 'MODIFIED'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 ring-2 ring-amber-300 dark:ring-amber-700'
                    : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30'
                }`}
              >
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Dimodifikasi</span>
                <span className="text-base font-mono font-black text-amber-800 dark:text-amber-200">{summary.modified_count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Nilai berbeda</span>
              </div>
              <div
                onClick={() => setFilterStatus('ADDED_IN_B')}
                className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
                  filterStatus === 'ADDED_IN_B'
                    ? 'bg-sky-100 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 ring-2 ring-sky-300 dark:ring-sky-700'
                    : 'border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100/60 dark:hover:bg-sky-900/30'
                }`}
              >
                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block">Baru di B</span>
                <span className="text-base font-mono font-black text-sky-800 dark:text-sky-200">{summary.added_count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Hanya di Server B</span>
              </div>
              <div
                onClick={() => setFilterStatus('DELETED_IN_B')}
                className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
                  filterStatus === 'DELETED_IN_B'
                    ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 ring-2 ring-rose-300 dark:ring-rose-700'
                    : 'border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/30'
                }`}
              >
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Hilang di B</span>
                <span className="text-base font-mono font-black text-rose-800 dark:text-rose-200">{summary.deleted_count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Hanya di Server A</span>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          {compareResult && (
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                {['ALL', 'MODIFIED', 'ADDED_IN_B', 'DELETED_IN_B', 'IDENTICAL'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition shadow-2xs cursor-pointer ${
                      filterStatus === status
                        ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Waktu Paralel: <b>{compareResult.execution_time_ms} ms</b> · Menampilkan {filteredRows.length} baris
              </div>
            </div>
          )}

          {/* Diff Table */}
          <div className="flex-1 overflow-auto p-3">
            {compareResult && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5 w-28">STATUS</th>
                      <th className="p-2.5 w-48">COMPOSITE KEY</th>
                      <th className="p-2.5">DETAIL PERUBAHAN / NILAI</th>
                      <th className="p-2.5 w-20 text-center">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredRows.map((r, idx) => {
                      let badge = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                      if (r.diff_status === 'MODIFIED') badge = 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
                      if (r.diff_status === 'ADDED_IN_B') badge = 'bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700';
                      if (r.diff_status === 'DELETED_IN_B') badge = 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
                      if (r.diff_status === 'IDENTICAL') badge = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="p-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badge}`}>
                              {r.diff_status}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {r.key_value}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {r.diff_status === 'MODIFIED' ? (
                              <div className="space-y-1">
                                {Object.entries(r.changed_fields).map(([field, diff]) => (
                                  <div key={field} className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{field}:</span>
                                    <span className="line-through text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 rounded">{String(diff.old_val)}</span>
                                    <span className="text-slate-400 dark:text-slate-500">→</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded">{String(diff.new_val)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : r.diff_status === 'ADDED_IN_B' ? (
                              <span className="text-sky-700 dark:text-sky-400 font-medium">Data baru ditambahkan di Server B</span>
                            ) : r.diff_status === 'DELETED_IN_B' ? (
                              <span className="text-rose-700 dark:text-rose-400 font-medium">Data terhapus / tidak ditemukan di Server B</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">Semua nilai kolom cocok persis</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => setInspectRow(r)}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer"
                              title="Inspeksi Baris"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspect Row Modal */}
      {inspectRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 font-mono">
                Inspeksi Perbedaan Baris: {inspectRow.key_value}
              </h3>
              <button
                onClick={() => setInspectRow(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="rounded-xl bg-sky-50/40 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 p-3 space-y-2">
                <span className="text-sky-800 dark:text-sky-300 font-bold block border-b border-sky-200 dark:border-sky-800/60 pb-1">
                  SERVER A ({summary?.server_a_name})
                </span>
                <pre className="text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(inspectRow.data_a, null, 2)}
                </pre>
              </div>
              <div className="rounded-xl bg-purple-50/40 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 p-3 space-y-2">
                <span className="text-purple-800 dark:text-purple-300 font-bold block border-b border-purple-200 dark:border-purple-800/60 pb-1">
                  SERVER B ({summary?.server_b_name})
                </span>
                <pre className="text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(inspectRow.data_b, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectRow(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
