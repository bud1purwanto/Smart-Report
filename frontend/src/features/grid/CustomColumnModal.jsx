import React, { useState } from 'react';
import { X, Calculator, Plus, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useGridStore } from '../../store/useGridStore';

export const CustomColumnModal = () => {
  const { formulaModalOpen, setFormulaModalOpen, showNotification } = useAppStore();
  const { columns, addCustomColumn } = useGridStore();

  const [columnName, setColumnName] = useState('');
  const [formula, setFormula] = useState('');

  if (!formulaModalOpen) return null;

  const handleAdd = () => {
    if (!columnName.trim() || !formula.trim()) {
      showNotification('Nama kolom dan formula wajib diisi.', 'warning');
      return;
    }
    addCustomColumn(columnName.trim().toUpperCase(), formula.trim());
    showNotification(`Kolom formula ${columnName} berhasil ditambahkan ke grid ALV.`, 'success');
    setColumnName('');
    setFormula('');
    setFormulaModalOpen(false);
  };

  const insertField = (f) => {
    setFormula((prev) => `${prev} row.${f} `);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Tambah Kolom Kalkulasi Dinamis (Custom Formula)</h3>
          </div>
          <button
            onClick={() => setFormulaModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Kolom Baru:</label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Contoh: TOTAL_AMOUNT, PPN_11, MARGIN_PCT..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 uppercase font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Formula Ekspresi (Javascript / Pandas):</label>
            <textarea
              rows={3}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Contoh: row.MENGE * row.NETPR  atau  row.NETPR * 0.11"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Gunakan sintaks <code className="text-indigo-600 font-bold">row.NamaKolom</code> untuk mengakses nilai baris data.
            </p>
          </div>

          {/* Quick Insert Tokens */}
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">Klik kolom untuk memasukkan ke formula:</span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {columns.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => insertField(c)}
                  className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold transition"
                >
                  +{c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setFormulaModalOpen(false)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 font-semibold transition"
          >
            Batal
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Terapkan Kolom</span>
          </button>
        </div>
      </div>
    </div>
  );
};
