import React, { useState, useEffect } from 'react';
import { X, Search, Plus, RefreshCw, Database } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { getTables, syncTableMetadata } from '../../services/api';

export const TableCatalogModal = () => {
  const { tableCatalogOpen, setTableCatalogOpen, activeServer, showNotification } = useAppStore();
  const { addTableNode } = useCanvasStore();

  const [tables, setTables] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customTableInput, setCustomTableInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (tableCatalogOpen) {
      loadTables();
    }
  }, [tableCatalogOpen]);

  const loadTables = async () => {
    try {
      const res = await getTables();
      setTables(res.data || []);
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  };

  if (!tableCatalogOpen) return null;

  const filteredTables = tables.filter((t) =>
    t.tablename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTable = async (tableName) => {
    await addTableNode(tableName);
    showNotification(`Tabel ${tableName} ditambahkan ke kanvas.`, 'success');
    setTableCatalogOpen(false);
  };

  const handleLiveSync = async () => {
    const tbl = customTableInput.trim().toUpperCase();
    if (!tbl) return;
    setIsSyncing(true);
    try {
      const res = await syncTableMetadata(tbl, activeServer?.id);
      showNotification(`Berhasil menyinkronkan tabel ${tbl} dari SAP: ${res.data.synced_fields} fields.`, 'success');
      setCustomTableInput('');
      await loadTables();
      // Auto add to canvas
      await addTableNode(tbl);
      setTableCatalogOpen(false);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      showNotification(`Gagal sinkronisasi ${tbl}: ${msg}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Katalog Kamus Data SAP (DDIC)</h3>
          </div>
          <button
            onClick={() => setTableCatalogOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live SAP Table Fetcher */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-2">
          <label className="text-[11px] font-bold text-slate-600">
            Sinkronkan Tabel Apapun dari SAP (DD03L / DD08L):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTableInput}
              onChange={(e) => setCustomTableInput(e.target.value)}
              placeholder="Misal: BKPF, BSEG, VBRK, VBRP, MARC..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-sky-500 uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleLiveSync()}
            />
            <button
              onClick={handleLiveSync}
              disabled={isSyncing || !customTableInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinkron...' : 'Tarik dari SAP'}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tabel di database lokal..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {filteredTables.map((t) => (
            <div
              key={t.tablename}
              className="p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900">{t.tablename}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono">
                    {t.field_count} kolom
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono truncate max-w-sm">
                  Keys: {t.key_fields.join(', ') || 'None'}
                </div>
              </div>
              <button
                onClick={() => handleAddTable(t.tablename)}
                className="px-3 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>
          ))}
          {filteredTables.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs">
              Tabel tidak ditemukan di cache lokal. Gunakan form di atas untuk menarik langsung dari SAP.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
