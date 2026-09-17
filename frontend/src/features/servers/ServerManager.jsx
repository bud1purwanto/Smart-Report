import React, { useState } from 'react';
import { Server, Activity, ShieldAlert, CheckCircle2, RefreshCw, Plus, Key } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { testServer } from '../../services/api';

export const ServerManager = () => {
  const { servers, loadServers, activeServer, setActiveServer, showNotification } = useAppStore();
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});

  const handleTestConnection = async (id, sName) => {
    setTestingId(id);
    try {
      const res = await testServer(id);
      setTestResults((prev) => ({ ...prev, [id]: res.data }));
      if (res.data.success) {
        showNotification(`Koneksi LIVE ke server ${sName} berhasil terhubung!`, 'success');
      } else {
        showNotification(`Koneksi ke ${sName} gagal: ${res.data.error || 'Timeout'}`, 'error');
      }
    } catch (err) {
      showNotification(`Gagal test koneksi ${sName}: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center justify-center font-mono shadow-2xs">
            <Server className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Profil Server SAP (Multi-Server Catalog)</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-400">
              Koneksi dinamis tersimpan di PostgreSQL smart_report dengan enkripsi AES-Fernet (Rule 3 & 4)
            </p>
          </div>
        </div>

        <button
          onClick={loadServers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Server Grid Cards */}
      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((s) => {
          const isSelected = activeServer?.id === s.id;
          const result = testResults[s.id];
          const isProd = s.environment === 'production';

          return (
            <div
              key={s.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between space-y-4 transition ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-sky-500 shadow-md ring-2 ring-sky-200 dark:ring-sky-900'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                        isProd
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                      }`}
                    >
                      {s.sid}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">{s.name}</h3>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {s.host} : {s.instance}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-md border ${
                      isProd
                        ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : s.environment === 'qa'
                        ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {s.environment}
                  </span>
                </div>

                {/* Details */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>SAP Client:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{s.client}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Username:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{s.username}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Password:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      <span>AES Terenkripsi</span>
                    </span>
                  </div>
                </div>

                {/* Live Test Result Badge */}
                {result && (
                  <div
                    className={`rounded-xl p-2 text-[10px] font-mono border ${
                      result.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {result.success ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>LIVE: RFC_SYSTEM_INFO Responded</span>
                        </div>
                        {result.system_info && (
                          <div className="text-slate-500 dark:text-slate-400 text-[9px]">
                            DB: {result.system_info.RFCDBSYS || 'N/A'} · Kernel: {result.system_info.RFCKERNRL || 'N/A'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        <span>Koneksi Gagal: {result.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setActiveServer(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isSelected ? 'Server Aktif' : 'Set Aktif'}
                </button>

                <button
                  onClick={() => handleTestConnection(s.id, s.name)}
                  disabled={testingId === s.id}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Activity className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${testingId === s.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === s.id ? 'Menguji...' : 'Test LIVE RFC'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
