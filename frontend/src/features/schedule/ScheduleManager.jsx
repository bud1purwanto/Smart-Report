import React, { useState, useEffect } from 'react';
import {
  Clock, Send, Plus, Trash2, CheckCircle2, AlertCircle, Play,
  Shield, Server, FileSpreadsheet, RefreshCw, X
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
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 bg-white shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center font-mono shadow-2xs">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-extrabold text-sm text-slate-800">Auto-Blast Telegram & Scheduler</h2>
            <p className="text-[11px] text-slate-400">
              Otomasi eksekusi laporan berkala, masking finansial, dan blast Excel ke Telegram
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal Laporan</span>
        </button>
      </div>

      {/* Schedules Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-semibold text-slate-800">
                    <div>{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Query ID: #{s.query_id}</div>
                  </td>
                  <td className="p-3 font-mono text-sky-700 font-bold">
                    {s.cron_expression}
                  </td>
                  <td className="p-3 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-sky-600" />
                      <span className="font-semibold">Telegram</span>
                    </div>
                    {s.telegram_chat_id && (
                      <div className="text-[10px] text-slate-400 font-mono">Chat ID: {s.telegram_chat_id}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-[10px]">
                      {s.anonymize && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-md font-mono font-bold">
                          MASKED
                        </span>
                      )}
                      {s.deduplicate && (
                        <span className="bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.2 rounded-md font-mono font-bold">
                          DEDUP
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md font-mono uppercase font-bold">
                        {s.export_format}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-500 font-mono text-[11px]">
                    {s.last_run_at ? new Date(s.last_run_at).toLocaleString('id-ID') : 'Belum pernah'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                        s.last_status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : s.last_status === 'ERROR'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
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
                        className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <Play className={`w-3 h-3 ${runningId === s.id ? 'animate-spin' : ''}`} />
                        <span>{runningId === s.id ? 'Memproses...' : 'Blast Now'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 text-xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>Daftarkan Jadwal Otomasi Laporan</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Jadwal:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Daily PO Price Variance Blast"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pilih Query Laporan:</label>
                  <select
                    value={queryId}
                    onChange={(e) => setQueryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {queries.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Server SAP:</label>
                  <select
                    value={serverId}
                    onChange={(e) => setServerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
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
                <label className="block text-slate-700 font-bold mb-1">
                  Ekspresi Cron (Menit Jam Hari Bulan HariMinggu):
                </label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 8 * * * (Setiap hari jam 08:00)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Contoh: <code className="text-sky-600 font-bold">0 8 * * *</code> = Jam 8 pagi setiap hari, <code className="text-sky-600 font-bold">0 */4 * * *</code> = Setiap 4 jam.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Telegram Chat ID Penerima:</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="ID chat Telegram atau grup (contoh: 123456789 atau -100123456789)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={anonymize}
                    onChange={(e) => setAnonymize(e.target.checked)}
                    className="rounded border-slate-300 text-amber-500 focus:ring-0"
                  />
                  <span>Masking Finansial Vendor (Rule 4)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={deduplicate}
                    onChange={(e) => setDeduplicate(e.target.checked)}
                    className="rounded border-slate-300 text-sky-500 focus:ring-0"
                  />
                  <span>Deduplikasi Baris</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 font-semibold transition"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition"
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
