import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight, Play, CheckCircle2, AlertCircle,
  Eye, RefreshCw, Layers, ChevronDown, ChevronUp, Sparkles, X
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

  const [showCanvas, setShowCanvas] = useState(true);

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
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Compare Setup Bar */}
      <div className="p-3.5 border-b border-slate-200 bg-white shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-mono shadow-2xs">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-extrabold text-sm text-slate-800">Cross-Server Data Compare</h2>
              <p className="text-[11px] text-slate-400">Komparasi data paralel multi-server SAP secara visual</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 px-2.5 shadow-2xs">
            {/* Server A */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-sky-700 font-mono uppercase bg-sky-100 px-1.5 py-0.5 rounded">
                SERVER A
              </span>
              <select
                value={serverAId || ''}
                onChange={(e) => setServers(parseInt(e.target.value), serverBId)}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white text-slate-800">
                    {s.name} ({s.sid})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-300 font-black text-xs">VS</span>

            {/* Server B */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-purple-700 font-mono uppercase bg-purple-100 px-1.5 py-0.5 rounded">
                SERVER B
              </span>
              <select
                value={serverBId || ''}
                onChange={(e) => setServers(serverAId, parseInt(e.target.value))}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white text-slate-800">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Muat Sampel EKKO/EKPO</span>
            </button>
          )}

          <button
            onClick={() => setShowCanvas(!showCanvas)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showCanvas ? 'Tutup Kanvas' : 'Buka Kanvas'}</span>
            {showCanvas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleRunCompare}
            disabled={isComparing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isComparing ? 'animate-spin' : ''}`} />
            <span>{isComparing ? 'Membandingkan...' : 'Jalankan Komparasi'}</span>
          </button>
        </div>
      </div>

      {/* Dedicated Independent Compare Canvas */}
      {showCanvas && (
        <div className="h-[280px] border-b border-slate-200 relative shrink-0">
          <CompareCanvas />
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3 border-b border-slate-200 bg-white">
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 shadow-2xs">
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Total Server A</span>
            <span className="text-base font-mono font-black text-sky-800">{summary.total_a.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block truncate">{summary.server_a_name}</span>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 shadow-2xs">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Total Server B</span>
            <span className="text-base font-mono font-black text-purple-800">{summary.total_b.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block truncate">{summary.server_b_name}</span>
          </div>
          <div
            onClick={() => setFilterStatus('IDENTICAL')}
            className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
              filterStatus === 'IDENTICAL' ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300' : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Identik</span>
            <span className="text-base font-mono font-black text-emerald-800">{summary.identical_count.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Tidak ada selisih</span>
          </div>
          <div
            onClick={() => setFilterStatus('MODIFIED')}
            className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
              filterStatus === 'MODIFIED' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300' : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/60'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Dimodifikasi</span>
            <span className="text-base font-mono font-black text-amber-800">{summary.modified_count.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Nilai berbeda</span>
          </div>
          <div
            onClick={() => setFilterStatus('ADDED_IN_B')}
            className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
              filterStatus === 'ADDED_IN_B' ? 'bg-sky-100 border-sky-400 ring-2 ring-sky-300' : 'border-sky-200 bg-sky-50/50 hover:bg-sky-100/60'
            }`}
          >
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Baru di B</span>
            <span className="text-base font-mono font-black text-sky-800">{summary.added_count.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Hanya di Server B</span>
          </div>
          <div
            onClick={() => setFilterStatus('DELETED_IN_B')}
            className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
              filterStatus === 'DELETED_IN_B' ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-300' : 'border-rose-200 bg-rose-50/50 hover:bg-rose-100/60'
            }`}
          >
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Hilang di B</span>
            <span className="text-base font-mono font-black text-rose-800">{summary.deleted_count.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Hanya di Server A</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {compareResult && (
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {['ALL', 'MODIFIED', 'ADDED_IN_B', 'DELETED_IN_B', 'IDENTICAL'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition shadow-2xs ${
                  filterStatus === status
                    ? 'bg-white text-purple-700 border border-purple-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Waktu Paralel: <b>{compareResult.execution_time_ms} ms</b> · Menampilkan {filteredRows.length} baris
          </div>
        </div>
      )}

      {/* Diff Table */}
      <div className="flex-1 overflow-auto p-3">
        {compareResult ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-28">STATUS</th>
                  <th className="p-2.5 w-48">COMPOSITE KEY</th>
                  <th className="p-2.5">DETAIL PERUBAHAN / NILAI</th>
                  <th className="p-2.5 w-20 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r, idx) => {
                  let badge = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (r.diff_status === 'MODIFIED') badge = 'bg-amber-100 text-amber-800 border-amber-300';
                  if (r.diff_status === 'ADDED_IN_B') badge = 'bg-sky-100 text-sky-800 border-sky-300';
                  if (r.diff_status === 'DELETED_IN_B') badge = 'bg-rose-100 text-rose-800 border-rose-300';
                  if (r.diff_status === 'IDENTICAL') badge = 'bg-emerald-100 text-emerald-800 border-emerald-300';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badge}`}>
                          {r.diff_status}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-800">
                        {r.key_value}
                      </td>
                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                        {r.diff_status === 'MODIFIED' ? (
                          <div className="space-y-1">
                            {Object.entries(r.changed_fields).map(([field, diff]) => (
                              <div key={field} className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{field}:</span>
                                <span className="line-through text-rose-600 bg-rose-50 px-1 rounded">{String(diff.old_val)}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">{String(diff.new_val)}</span>
                              </div>
                            ))}
                          </div>
                        ) : r.diff_status === 'ADDED_IN_B' ? (
                          <span className="text-sky-700 font-medium">Data baru ditambahkan di Server B</span>
                        ) : r.diff_status === 'DELETED_IN_B' ? (
                          <span className="text-rose-700 font-medium">Data terhapus / tidak ditemukan di Server B</span>
                        ) : (
                          <span className="text-slate-400">Semua nilai kolom cocok persis</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => setInspectRow(r)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-purple-600 transition"
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
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 bg-white rounded-xl border border-slate-200 m-2">
            <ArrowLeftRight className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <p className="font-semibold text-slate-600">Belum ada hasil komparasi</p>
            <p className="text-[11px] text-slate-400 max-w-sm text-center">
              Tambahkan tabel di kanvas komparasi di atas, pilih Server A dan Server B, lalu klik <b>Jalankan Komparasi</b>.
            </p>
          </div>
        )}
      </div>

      {/* Inspect Row Modal */}
      {inspectRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 font-mono">
                Inspeksi Perbedaan Baris: {inspectRow.key_value}
              </h3>
              <button
                onClick={() => setInspectRow(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="rounded-xl bg-sky-50/40 border border-sky-200 p-3 space-y-2">
                <span className="text-sky-800 font-bold block border-b border-sky-200 pb-1">
                  SERVER A ({summary?.server_a_name})
                </span>
                <pre className="text-[11px] text-slate-700 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(inspectRow.data_a, null, 2)}
                </pre>
              </div>
              <div className="rounded-xl bg-purple-50/40 border border-purple-200 p-3 space-y-2">
                <span className="text-purple-800 font-bold block border-b border-purple-200 pb-1">
                  SERVER B ({summary?.server_b_name})
                </span>
                <pre className="text-[11px] text-slate-700 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(inspectRow.data_b, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectRow(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
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
