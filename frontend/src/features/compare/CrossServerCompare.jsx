import React, { useState } from 'react';
import {
  ArrowLeftRight, Server, Play, Clock, CheckCircle2, AlertCircle,
  PlusCircle, MinusCircle, Eye, RefreshCw, Layers
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { compareServers } from '../../services/api';

export const CrossServerCompare = () => {
  const { servers, showNotification } = useAppStore();
  const { getQueryDefinition } = useCanvasStore();

  const [serverAId, setServerAId] = useState(servers[6]?.id || servers[0]?.id || 1); // Sandbox New Company
  const [serverBId, setServerBId] = useState(servers[0]?.id || 1); // Development AIX
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'MODIFIED' | 'ADDED_IN_B' | 'DELETED_IN_B' | 'IDENTICAL'
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [inspectRow, setInspectRow] = useState(null);

  const handleRunCompare = async () => {
    const queryDef = getQueryDefinition();
    if (!queryDef.tables || queryDef.tables.length === 0) {
      showNotification('Definisikan query minimal satu tabel di tab Query Studio terlebih dahulu.', 'warning');
      return;
    }

    if (serverAId === serverBId) {
      showNotification('Pilih dua server SAP yang berbeda untuk melakukan komparasi.', 'warning');
      return;
    }

    setIsComparing(true);
    try {
      const res = await compareServers({
        server_a_id: serverAId,
        server_b_id: serverBId,
        query: queryDef,
        rowcount: 100,
      });
      setCompareResult(res.data);
      showNotification('Komparasi data antar-server SAP selesai.', 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      showNotification(`Gagal komparasi: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`, 'error');
    } finally {
      setIsComparing(false);
    }
  };

  const filteredRows = compareResult?.diff_rows.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.diff_status === filterStatus;
  }) || [];

  const summary = compareResult?.summary;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Compare Setup Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-mono">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Cross-Server Data Compare</h2>
              <p className="text-[11px] text-slate-400">Komparasi data multi-server paralel via asyncio.gather</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 px-3">
            {/* Server A */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 font-mono">SERVER A:</span>
              <select
                value={serverAId}
                onChange={(e) => setServerAId(parseInt(e.target.value))}
                className="bg-transparent text-xs text-sky-400 font-semibold focus:outline-none cursor-pointer"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                    {s.name} ({s.sid})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-600 font-bold">VS</span>

            {/* Server B */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 font-mono">SERVER B:</span>
              <select
                value={serverBId}
                onChange={(e) => setServerBId(parseInt(e.target.value))}
                className="bg-transparent text-xs text-purple-400 font-semibold focus:outline-none cursor-pointer"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                    {s.name} ({s.sid})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunCompare}
          disabled={isComparing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg transition"
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isComparing ? 'animate-spin' : ''}`} />
          <span>{isComparing ? 'Membandingkan...' : 'Jalankan Komparasi Paralel'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-6 gap-3 p-4 border-b border-slate-800 bg-slate-950/80">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Server A</span>
            <span className="text-lg font-mono font-extrabold text-sky-400">{summary.total_a.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block truncate">{summary.server_a_name}</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Server B</span>
            <span className="text-lg font-mono font-extrabold text-purple-400">{summary.total_b.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block truncate">{summary.server_b_name}</span>
          </div>
          <div
            onClick={() => setFilterStatus('IDENTICAL')}
            className={`rounded-xl border p-3 cursor-pointer transition ${
              filterStatus === 'IDENTICAL' ? 'bg-slate-800 border-slate-600' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Identik</span>
            <span className="text-lg font-mono font-extrabold text-emerald-400">{summary.identical_count.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Tidak ada selisih</span>
          </div>
          <div
            onClick={() => setFilterStatus('MODIFIED')}
            className={`rounded-xl border p-3 cursor-pointer transition ${
              filterStatus === 'MODIFIED' ? 'bg-amber-950/40 border-amber-600' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Dimodifikasi</span>
            <span className="text-lg font-mono font-extrabold text-amber-400">{summary.modified_count.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Nilai field berbeda</span>
          </div>
          <div
            onClick={() => setFilterStatus('ADDED_IN_B')}
            className={`rounded-xl border p-3 cursor-pointer transition ${
              filterStatus === 'ADDED_IN_B' ? 'bg-sky-950/40 border-sky-600' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Baru di B</span>
            <span className="text-lg font-mono font-extrabold text-sky-400">{summary.added_count.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Hanya ada di Server B</span>
          </div>
          <div
            onClick={() => setFilterStatus('DELETED_IN_B')}
            className={`rounded-xl border p-3 cursor-pointer transition ${
              filterStatus === 'DELETED_IN_B' ? 'bg-red-950/40 border-red-600' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
            }`}
          >
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Hilang di B</span>
            <span className="text-lg font-mono font-extrabold text-red-400">{summary.deleted_count.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Hanya ada di Server A</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {compareResult && (
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {['ALL', 'MODIFIED', 'ADDED_IN_B', 'DELETED_IN_B', 'IDENTICAL'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  filterStatus === status
                    ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Waktu Eksekusi Paralel: <b>{compareResult.execution_time_ms} ms</b> · Menampilkan {filteredRows.length} baris
          </div>
        </div>
      )}

      {/* Diff Table */}
      <div className="flex-1 overflow-auto p-4">
        {compareResult ? (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-800/80 text-slate-400 font-mono text-[11px] border-b border-slate-700">
                <tr>
                  <th className="p-3 w-28">STATUS</th>
                  <th className="p-3 w-40">COMPOSITE KEY</th>
                  <th className="p-3">DETAIL PERUBAHAN / NILAI</th>
                  <th className="p-3 w-20 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRows.map((r, idx) => {
                  let badge = 'bg-slate-800 text-slate-400 border-slate-700';
                  if (r.diff_status === 'MODIFIED') badge = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                  if (r.diff_status === 'ADDED_IN_B') badge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  if (r.diff_status === 'DELETED_IN_B') badge = 'bg-red-500/20 text-red-300 border-red-500/30';

                  const changesCount = Object.keys(r.changed_fields || {}).length;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badge}`}>
                          {r.diff_status}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-200">
                        {r.key_value}
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {r.diff_status === 'MODIFIED' ? (
                          <div className="space-y-1">
                            {Object.entries(r.changed_fields).map(([field, diff]) => (
                              <div key={field} className="flex items-center gap-2">
                                <span className="font-bold text-slate-300">{field}:</span>
                                <span className="line-through text-red-400">{String(diff.old_val)}</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-emerald-400 font-bold">{String(diff.new_val)}</span>
                              </div>
                            ))}
                          </div>
                        ) : r.diff_status === 'ADDED_IN_B' ? (
                          <span className="text-emerald-400">Data baru ditambahkan di Server B</span>
                        ) : r.diff_status === 'DELETED_IN_B' ? (
                          <span className="text-red-400">Data terhapus / tidak ditemukan di Server B</span>
                        ) : (
                          <span className="text-slate-500">Semua nilai kolom cocok persis</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setInspectRow(r)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition"
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
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
            <ArrowLeftRight className="w-8 h-8 text-slate-700" />
            <p>Pilih Server A dan Server B, lalu klik <b>Jalankan Komparasi Paralel</b>.</p>
          </div>
        )}
      </div>

      {/* Inspect Row Modal */}
      {inspectRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 font-mono">
                Inspeksi Perbedaan Baris: {inspectRow.key_value}
              </h3>
              <button
                onClick={() => setInspectRow(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2">
                <span className="text-sky-400 font-bold block border-b border-slate-800 pb-1">
                  SERVER A ({summary?.server_a_name})
                </span>
                <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(inspectRow.data_a, null, 2)}
                </pre>
              </div>
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2">
                <span className="text-purple-400 font-bold block border-b border-slate-800 pb-1">
                  SERVER B ({summary?.server_b_name})
                </span>
                <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(inspectRow.data_b, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectRow(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
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

