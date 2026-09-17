import React, { useState, useEffect } from 'react';
import {
  Clock, Send, Plus, Trash2, CheckCircle2, AlertCircle, Play,
  Shield, Server, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getSchedules, saveSchedule, deleteSchedule, runSchedule, getQueries } from '../../services/api';

export const ScheduleManager = () => {
  const { servers, showNotification } = useAppStore();
  const [schedules, setSchedules] = useState([]);
  const [queries, setQueries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [runningId, setRunningId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [queryId, setQueryId] = useState('');
  const [serverId, setServerId] = useState(servers[0]?.id || 1);
  const [cronExpression, setCronExpression] = useState('0 8 * * *');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [anonymize, setAnonymize] = useState(true);
  const [deduplicate, setDeduplicate] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedRes, qRes] = await Promise.all([getSchedules(), getQueries()]);
      setSchedules(schedRes.data || []);
      setQueries(qRes.data || []);
      if (qRes.data?.length > 0 && !queryId) {
        setQueryId(qRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !queryId) {
      showNotification('Nama jadwal dan query wajib diisi.', 'warning');
      return;
    }

    try {
      await saveSchedule({
        query_id: parseInt(queryId),
        server_id: parseInt(serverId),
        name: name.trim(),
        cron_expression: cronExpression.trim(),
        channel: 'telegram',
        telegram_chat_id: telegramChatId.trim() || null,
        telegram_bot_token: telegramBotToken.trim() || null,
        anonymize,
        deduplicate,
        export_format: 'xlsx',
        is_active: true,
      });

      showNotification('Jadwal laporan berhasil didaftarkan ke APScheduler.', 'success');
      setIsModalOpen(false);
      setName('');
      await loadData();
    } catch (err) {
      showNotification('Gagal membuat jadwal: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id, sName) => {
    try {
      await deleteSchedule(id);
      showNotification(`Jadwal ${sName} dihapus.`, 'info');
      await loadData();
    } catch (err) {
      showNotification('Gagal menghapus jadwal: ' + err.message, 'error');
    }
  };

  const handleRunNow = async (id, sName) => {
    setRunningId(id);
    try {
      const res = await runSchedule(id);
      showNotification(`Jadwal ${sName} berhasil dieksekusi: Status ${res.data.status}`, 'success');
      await loadData();
    } catch (err) {
      showNotification('Gagal eksekusi jadwal: ' + err.message, 'error');
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-mono">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-sm text-slate-100">Auto-Blast Telegram & Scheduler</h2>
            <p className="text-[11px] text-slate-400">
              Otomasi eksekusi laporan berkala, masking finansial, dan blast Excel ke Telegram
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal Laporan</span>
        </button>
      </div>

      {/* Schedules Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-slate-800/80 text-slate-400 font-mono text-[11px] border-b border-slate-700">
              <tr>
                <th className="p-3">NAMA JADWAL</th>
                <th className="p-3">CRON / JADWAL</th>
                <th className="p-3">TARGET CHANNEL</th>
                <th className="p-3">KEAMANAN & FORMAT</th>
                <th className="p-3">TERAKHIR RUN</th>
                <th className="p-3">STATUS</th>
                <th className="p-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-semibold text-slate-200">
                    <div>{s.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Query ID: #{s.query_id}</div>
                  </td>
                  <td className="p-3 font-mono text-sky-400 font-bold">
                    {s.cron_expression}
                  </td>
                  <td className="p-3 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                      <span>Telegram</span>
                    </div>
                    {s.telegram_chat_id && (
                      <div className="text-[10px] text-slate-500 font-mono">Chat ID: {s.telegram_chat_id}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-[10px]">
                      {s.anonymize && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                          MASKED
                        </span>
                      )}
                      {s.deduplicate && (
                        <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded font-mono">
                          DEDUP
                        </span>
                      )}
                      <span className="bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono uppercase">
                        {s.export_format}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-400 font-mono text-[11px]">
                    {s.last_run_at ? new Date(s.last_run_at).toLocaleString('id-ID') : 'Belum pernah'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        s.last_status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : s.last_status === 'ERROR'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s.last_status || 'PENDING'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRunNow(s.id, s.name)}
                        disabled={runningId === s.id}
                        className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-400 text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <Play className={`w-3 h-3 ${runningId === s.id ? 'animate-spin' : ''}`} />
                        <span>{runningId === s.id ? 'Memproses...' : 'Blast Now'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 text-xs">
                    Belum ada jadwal laporan terdaftar. Klik tombol <b>Tambah Jadwal Laporan</b> di atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Daftarkan Jadwal Otomasi Laporan</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Jadwal:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Daily PO Price Variance Blast"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Pilih Query Laporan:</label>
                  <select
                    value={queryId}
                    onChange={(e) => setQueryId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {queries.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Server SAP:</label>
                  <select
                    value={serverId}
                    onChange={(e) => setServerId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.sid})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Ekspresi Cron (Menit Jam Hari Bulan HariMinggu):
                </label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 8 * * * (Setiap hari jam 08:00)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Contoh: <code className="text-sky-400">0 8 * * *</code> = Jam 8 pagi setiap hari, <code className="text-sky-400">0 */4 * * *</code> = Setiap 4 jam.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telegram Chat ID Penerima:</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="ID chat Telegram atau grup (contoh: 123456789 atau -100123456789)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={anonymize}
                    onChange={(e) => setAnonymize(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span>Masking Finansial Vendor (Rule 4)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deduplicate}
                    onChange={(e) => setDeduplicate(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>Deduplikasi Baris</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
              >
                Simpan & Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

