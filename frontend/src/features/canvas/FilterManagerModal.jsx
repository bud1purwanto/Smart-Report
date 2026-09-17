import React, { useState, useEffect } from 'react';
import { X, Filter, Plus, Trash2, Check, SlidersHorizontal, Info } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useCompareStore } from '../../store/useCompareStore';

export const FilterManagerModal = () => {
  const { filterModalOpen, setFilterModalOpen, filterTarget, showNotification, activeTab } = useAppStore();
  const isCompare = activeTab === 'compare';
  const canvasStore = useCanvasStore();
  const compareStore = useCompareStore();
  const { nodes, filters, addFilter, removeFilter, clearFilters } = isCompare ? compareStore : canvasStore;

  const [selectedTable, setSelectedTable] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [operator, setOperator] = useState('EQ');
  const [value, setValue] = useState('');
  const [valueTo, setValueTo] = useState('');

  useEffect(() => {
    if (filterTarget?.table) setSelectedTable(filterTarget.table);
    if (filterTarget?.field) setSelectedField(filterTarget.field);
  }, [filterTarget, filterModalOpen]);

  if (!filterModalOpen) return null;

  // Available tables from canvas
  const availableTables = nodes.map((n) => n.data.table);

  // Active table node
  const currentTable = selectedTable || availableTables[0] || '';
  const activeNode = nodes.find((n) => n.data.table === currentTable);
  const fields = activeNode?.data.fields || [];

  const handleAdd = () => {
    const tbl = currentTable;
    const fld = selectedField || fields[0]?.fieldname || '';
    if (!tbl || !fld) {
      showNotification('Pilih tabel dan kolom terlebih dahulu.', 'warning');
      return;
    }
    if (!value.trim()) {
      showNotification('Nilai parameter / filter wajib diisi.', 'warning');
      return;
    }

    const activeFieldObj = fields.find((f) => f.fieldname === fld);
    const newFilter = {
      field: `${tbl}.${fld}`,
      fieldtext: activeFieldObj?.fieldtext && activeFieldObj.fieldtext !== fld ? activeFieldObj.fieldtext : '',
      operator,
      value: value.trim(),
      valueTo: operator === 'BETWEEN' ? valueTo.trim() : undefined,
    };

    addFilter(newFilter);
    showNotification(`Parameter ${tbl}.${fld} ${operator} '${value}' ditambahkan.`, 'success');
    setValue('');
    setValueTo('');
  };

  const operatorLabels = {
    EQ: '= (Sama dengan)',
    NE: '<> (Tidak sama dengan)',
    GT: '> (Lebih besar dari)',
    LT: '< (Lebih kecil dari)',
    GE: '>= (Lebih besar atau sama)',
    LE: '<= (Lebih kecil atau sama)',
    LIKE: 'LIKE (Cocok pola / wildcard)',
    IN: 'IN (Kumpulan nilai koma)',
    BETWEEN: 'BETWEEN (Rentang Dari .. Sampai)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-mono shadow-2xs">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                {isCompare
                  ? 'Kriteria Parameter Seleksi (Cross-Server Diff)'
                  : 'Kriteria Seleksi & Parameter Query (SQVI Selection Screen)'}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                {isCompare
                  ? 'Kondisi WHERE ini diterapkan secara paralel ke Server A dan Server B sebelum komparasi diff'
                  : 'Tentukan kondisi pembatas data (WHERE clause) sebelum query ditarik ke ALV Grid'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {/* Form Tambah Parameter Baru */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-3">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Tambah Parameter Seleksi Baru</span>
            </div>

            {availableTables.length === 0 ? (
              <div className="text-slate-400 text-[11px]">
                Tambahkan tabel di kanvas terlebih dahulu untuk memilih field kriteria seleksi.
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Table Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Tabel SAP:
                    </label>
                    <select
                      value={currentTable}
                      onChange={(e) => {
                        setSelectedTable(e.target.value);
                        setSelectedField('');
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    >
                      {availableTables.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Kolom / Field:
                    </label>
                    <select
                      value={selectedField || fields[0]?.fieldname || ''}
                      onChange={(e) => setSelectedField(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    >
                      {fields.map((f) => (
                        <option key={f.fieldname} value={f.fieldname}>
                          {f.fieldname} {f.fieldtext && f.fieldtext !== f.fieldname ? `— ${f.fieldtext}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Operator */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Operator Logika:
                    </label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      {Object.entries(operatorLabels).map(([op, label]) => (
                        <option key={op} value={op}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Values Input */}
                <div className="flex gap-2 items-center flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {operator === 'BETWEEN' ? 'Nilai Dari (From):' : 'Nilai Parameter:'}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={
                        operator === 'LIKE'
                          ? 'Contoh: 450% atau NB*'
                          : operator === 'IN'
                          ? 'Contoh: 1000, 2000, 3000'
                          : 'Contoh: 9701, F, NB, 20240101...'
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {operator === 'BETWEEN' && (
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Sampai (To):
                      </label>
                      <input
                        type="text"
                        value={valueTo}
                        onChange={(e) => setValueTo(e.target.value)}
                        placeholder="Contoh: 20241231"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  <div className="self-end">
                    <button
                      onClick={handleAdd}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Terapkan</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Daftar Parameter Aktif */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Parameter Aktif ({filters.length})</span>
              </span>
              {filters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              {filters.map((f, idx) => (
                <div
                  key={idx}
                  className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                      {f.field}
                    </span>
                    {f.fieldtext && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate max-w-[200px]" title={f.fieldtext}>
                        ({f.fieldtext})
                      </span>
                    )}
                    <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-[11px]">
                      {f.operator}
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      '{f.value}'{f.valueTo ? ` AND '${f.valueTo}'` : ''}
                    </span>
                  </div>

                  <button
                    onClick={() => removeFilter(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Hapus Parameter"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {filters.length === 0 && (
                <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Belum ada parameter kriteria seleksi. Tambahkan parameter di atas untuk membatasi data query.
                </div>
              )}
            </div>
          </div>

          {/* SQVI Info Tip Box */}
          <div className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/30 p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-bold text-sky-900 dark:text-sky-200">
                Cara Kerja Parameter & Output ALV (ala SAP SQVI):
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>
                  <b>Parameter / Kriteria Seleksi:</b> Menyaring data pada level query database SAP menggunakan klausa WHERE Open SQL (misal: hanya PO dengan tipe <code>BSTYP = 'F'</code> atau Company Code <code>BUKRS = '1000'</code>).
                </li>
                <li>
                  <b>Output ALV Grid:</b> Kolom-kolom yang dicentang pada setiap kartu tabel di kanvas visual akan menjadi kolom output data ALV Grid setelah tombol <b>Jalankan Query (F8)</b> diklik.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setFilterModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

