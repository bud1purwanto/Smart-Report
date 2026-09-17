import React, { useState, useEffect } from 'react';
import { X, Bookmark, Plus, Trash2, Check, Star } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useGridStore } from '../../store/useGridStore';
import { getVariants, saveVariant, deleteVariant } from '../../services/api';

export const VariantManagerModal = () => {
  const { variantModalOpen, setVariantModalOpen, currentQueryId, showNotification } = useAppStore();
  const {
    columns,
    columnDefs,
    customColumns,
    variants,
    setVariants,
    activeVariant,
    applyVariant,
  } = useGridStore();

  const [newVariantName, setNewVariantName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (variantModalOpen && currentQueryId) {
      loadVariants();
    }
  }, [variantModalOpen, currentQueryId]);

  const loadVariants = async () => {
    setIsLoading(true);
    try {
      const res = await getVariants(currentQueryId);
      setVariants(res.data || []);
    } catch (err) {
      console.error('Failed to load variants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!variantModalOpen) return null;

  const handleSaveCurrentLayout = async () => {
    if (!newVariantName.trim()) {
      showNotification('Nama variant wajib diisi.', 'warning');
      return;
    }

    const colOrder = columnDefs.map((c) => c.field);
    const hiddenCols = columnDefs.filter((c) => c.hide).map((c) => c.field);

    try {
      const res = await saveVariant({
        query_id: currentQueryId,
        name: newVariantName.trim(),
        column_order: colOrder,
        hidden_columns: hiddenCols,
        filter_parameters: {},
        sort_parameters: [],
        custom_columns: customColumns,
        is_default: isDefault,
      });

      showNotification(`Variant ${newVariantName} berhasil disimpan.`, 'success');
      setNewVariantName('');
      setIsDefault(false);
      await loadVariants();
      applyVariant(res.data);
    } catch (err) {
      showNotification('Gagal menyimpan variant: ' + err.message, 'error');
    }
  };

  const handleDeleteVariant = async (variantId, name) => {
    try {
      await deleteVariant(variantId);
      showNotification(`Variant ${name} dihapus.`, 'info');
      await loadVariants();
    } catch (err) {
      showNotification('Gagal menghapus variant: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-100">SAP ALV Variant Manager (Save/Load Layout)</h3>
          </div>
          <button
            onClick={() => setVariantModalOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save New Variant Form */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-semibold text-slate-300">Simpan Tampilan Grid Saat Ini:</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="Nama Layout (misal: /PO_OVERVIEW, /VENDOR_VIEW)..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500 uppercase"
            />
            <button
              onClick={handleSaveCurrentLayout}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simpan Layout</span>
            </button>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span>Jadikan Layout Default untuk Query Ini</span>
          </label>
        </div>

        {/* Saved Variants List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400">Daftar Layout Tersimpan:</div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/40">
            {variants.map((v) => {
              const isActive = activeVariant?.id === v.id;
              return (
                <div
                  key={v.id}
                  className={`p-2.5 flex items-center justify-between text-xs transition ${
                    isActive ? 'bg-amber-500/10' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {v.is_default && <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />}
                    <span className={`font-mono font-bold ${isActive ? 'text-amber-300' : 'text-slate-200'}`}>
                      {v.name}
                    </span>
                    {isActive && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        applyVariant(v);
                        showNotification(`Layout ${v.name} dimuat.`, 'success');
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                    >
                      Terapkan
                    </button>
                    <button
                      onClick={() => handleDeleteVariant(v.id, v.name)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                      title="Hapus Variant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {variants.length === 0 && (
              <div className="p-4 text-center text-slate-500 text-xs">Belum ada layout tersimpan.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setVariantModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

