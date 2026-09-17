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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-slate-100">Katalog Kamus Data SAP (DDIC)</h3>
          </div>
          <button
            onClick={() => setTableCatalogOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live SAP Table Fetcher */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 space-y-2">
          <label className="text-[11px] font-semibold text-slate-400">
            Sinkronkan Tabel Apapun dari SAP (DD03L / DD08L):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTableInput}
              onChange={(e) => setCustomTableInput(e.target.value)}
              placeholder="Misal: BKPF, BSEG, VBRK, VBRP, MARC..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500 uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleLiveSync()}
            />
            <button
              onClick={handleLiveSync}
              disabled={isSyncing || !customTableInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinkron...' : 'Tarik dari SAP'}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tabel SAP..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
          {filteredTables.map((t) => (
            <div
              key={t.tablename}
              className="p-2.5 rounded-lg hover:bg-slate-800/50 flex items-center justify-between group transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-100">{t.tablename}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    {t.field_count} kolom
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono truncate max-w-sm">
                  Keys: {t.key_fields.join(', ') || 'None'}
                </div>
              </div>
              <button
                onClick={() => handleAddTable(t.tablename)}
                className="px-2.5 py-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>
          ))}
          {filteredTables.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-xs">
              Tabel tidak ditemukan di cache lokal. Gunakan form di atas untuk menarik langsung dari SAP.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

