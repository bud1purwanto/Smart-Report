import React, { useState, useEffect } from 'react';
import { X, Search, Plus, RefreshCw, Database } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useCompareStore } from '../../store/useCompareStore';
import { useTranslation } from '../../locales/useTranslation';
import { getTables, syncTableMetadata } from '../../services/api';

export const TableCatalogModal = () => {
  const { t } = useTranslation();
  const { tableCatalogOpen, setTableCatalogOpen, activeServer, showNotification, activeTab } = useAppStore();
  const isCompare = activeTab === 'compare';
  const canvasStore = useCanvasStore();
  const compareStore = useCompareStore();
  const addTableNode = isCompare ? compareStore.addTableNode : canvasStore.addTableNode;

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
    showNotification(`Tabel ${tableName} ditambahkan ke kanvas ${isCompare ? 'komparasi' : 'studio'}.`, 'success');
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
      const msg = err.normalized?.message || err.message;
      showNotification(`Gagal sinkronisasi ${tbl}: ${msg}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{t('catalog.title')}</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {isCompare ? 'Tambahkan tabel untuk dikomparasikan antar-server SAP' : t('catalog.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTableCatalogOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live SAP Table Fetcher */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-2">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {t('catalog.liveSyncTitle')} (DD03L / DD08L):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTableInput}
              onChange={(e) => setCustomTableInput(e.target.value)}
              placeholder={t('catalog.syncPlaceholder')}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleLiveSync()}
            />
            <button
              onClick={handleLiveSync}
              disabled={isSyncing || !customTableInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? t('catalog.syncing') : t('catalog.syncBtn')}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('catalog.searchTable')}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
          {filteredTables.map((tItem) => (
            <div
              key={tItem.tablename}
              className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center justify-between group transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{tItem.tablename}</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-mono">
                    {tItem.field_count} {t('canvas.selectedColumns').split(' ')[1] || 'kolom'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono truncate max-w-sm">
                  Keys: {tItem.key_fields.join(', ') || 'None'}
                </div>
              </div>
              <button
                onClick={() => handleAddTable(tItem.tablename)}
                className="px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('catalog.addToCanvas')}</span>
              </button>
            </div>
          ))}
          {filteredTables.length === 0 && (
            <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
              {t('canvas.noFieldsFound')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
