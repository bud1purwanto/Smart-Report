import React, { useState, useEffect } from 'react';
import { X, Columns3, Check, RotateCcw, HelpCircle, ArrowRight, Info } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useGridStore } from '../../store/useGridStore';
import { useTranslation } from '../../locales/useTranslation';

export const PivotModal = () => {
  const { t } = useTranslation();
  const { pivotModalOpen, setPivotModalOpen, showNotification } = useAppStore();
  const {
    columns,
    rawColumns,
    isPivoted,
    pivotConfig,
    applyPivot,
    resetPivot,
    totalRows,
    rawTotalRows,
  } = useGridStore();

  // All available base columns (use rawColumns if already pivoted)
  const availableColumns = isPivoted && rawColumns.length > 0 ? rawColumns : columns;

  const [selectedIndices, setSelectedIndices] = useState([]);
  const [pivotCol, setPivotCol] = useState('');
  const [valueCol, setValueCol] = useState('');
  const [aggFunc, setAggFunc] = useState('first');
  const [searchTerm, setSearchTerm] = useState('');

  // Sync state when modal opens
  useEffect(() => {
    if (pivotModalOpen) {
      if (pivotConfig) {
        setSelectedIndices(pivotConfig.indexColumns || []);
        setPivotCol(pivotConfig.pivotColumn || '');
        setValueCol(pivotConfig.valueColumn || '');
        setAggFunc(pivotConfig.aggFunc || 'first');
      } else {
        // Auto-select initial heuristics (e.g. first 2 columns as index)
        if (availableColumns.length > 0 && selectedIndices.length === 0) {
          const autoIndices = availableColumns.slice(0, Math.min(2, availableColumns.length));
          setSelectedIndices(autoIndices);
          // Try to detect ATNAM/ATWRT or characteristic columns
          const possiblePivot = availableColumns.find(
            (c) => c.toUpperCase().includes('ATNAM') || c.toUpperCase().includes('ATINN') || c.toUpperCase().includes('CHAR')
          ) || (availableColumns.length > 2 ? availableColumns[2] : '');
          const possibleVal = availableColumns.find(
            (c) => c.toUpperCase().includes('ATWRT') || c.toUpperCase().includes('VAL') || c.toUpperCase().includes('VALUE')
          ) || (availableColumns.length > 3 ? availableColumns[3] : '');

          setPivotCol(possiblePivot || '');
          setValueCol(possibleVal || '');
        }
      }
    }
  }, [pivotModalOpen, pivotConfig, availableColumns]);

  if (!pivotModalOpen) return null;

  const toggleIndexCol = (col) => {
    if (selectedIndices.includes(col)) {
      setSelectedIndices(selectedIndices.filter((c) => c !== col));
    } else {
      setSelectedIndices([...selectedIndices, col]);
    }
  };

  const selectAllIndices = () => {
    // Select all except pivotCol and valueCol
    const valid = availableColumns.filter((c) => c !== pivotCol && c !== valueCol);
    setSelectedIndices(valid);
  };

  const clearIndices = () => {
    setSelectedIndices([]);
  };

  const handleApply = () => {
    if (selectedIndices.length === 0) {
      showNotification(t('pivot.errorNoIndex') || 'Pilih minimal 1 kolom baris tetap (Index Group).', 'warning');
      return;
    }
    if (!pivotCol) {
      showNotification(t('pivot.errorNoPivot') || 'Pilih kolom yang akan menjadi Header Pivot.', 'warning');
      return;
    }
    if (!valueCol) {
      showNotification(t('pivot.errorNoValue') || 'Pilih kolom yang akan mengisi Nilai Sel (Value).', 'warning');
      return;
    }
    if (selectedIndices.includes(pivotCol) || selectedIndices.includes(valueCol)) {
      showNotification(
        t('pivot.errorOverlap') || 'Kolom Pivot Header dan Value tidak boleh dimasukkan ke dalam Baris Tetap.',
        'warning'
      );
      return;
    }

    const res = applyPivot({
      indexColumns: selectedIndices,
      pivotColumn: pivotCol,
      valueColumn: valueCol,
      aggFunc,
    });

    if (res.success) {
      showNotification(
        t('pivot.applySuccess', { rows: res.count, cols: res.newColsCount }) ||
          `Pivot berhasil! ${res.count} baris digabungkan dengan +${res.newColsCount} kolom baru ke kanan.`,
        'success'
      );
      setPivotModalOpen(false);
    } else {
      showNotification(res.message || 'Gagal menerapkan pivot.', 'error');
    }
  };

  const handleReset = () => {
    resetPivot();
    showNotification(t('pivot.resetSuccess') || 'Tampilan ALV Grid dikembalikan ke baris tabular asli.', 'info');
    setPivotModalOpen(false);
  };

  const filteredColumns = availableColumns.filter((c) =>
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Columns3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{t('pivot.title') || 'Pivot / Transpose Column (Flatten EAV & AUSP)'}</span>
                {isPivoted && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold">
                    {t('pivot.activeBadge') || 'PIVOT AKTIF'}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('pivot.subtitle') ||
                  'Ubah baris karakteristik vertikal (AUSP / CABN / Batch) menjadi kolom-kolom horizontal ke kanan.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setPivotModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {/* Info Banner for SAP AUSP Case */}
          <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 flex items-start gap-2.5 text-purple-900 dark:text-purple-300 text-[11px]">
            <Info className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">
                {t('pivot.tipTitle') || 'Contoh Penggunaan SAP Batch Classification (MCH1 + AUSP):'}
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('pivot.tipDesc') ||
                  'Pilih MATNR dan CHARG sebagai Baris Tetap. Pilih ATNAM (Nama Karakteristik) sebagai Header Kolom, dan ATWRT (Nilai Karakteristik) sebagai Nilai Sel. Semua nilai karakteristik batch otomatis menjadi kolom tersendiri ke samping!'}
              </p>
            </div>
          </div>

          {/* Grid Layout Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Index Columns */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                    1
                  </span>
                  <span>{t('pivot.rowGroupCols') || 'Baris Tetap (Index Group)'}</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={selectAllIndices}
                    className="text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                  >
                    {t('common.selectAll') || 'Pilih Semua'}
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={clearIndices}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    {t('common.clear') || 'Kosongkan'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('pivot.rowGroupDesc') || 'Kolom identitas unik per baris (misal: MATNR, CHARG, WERKS).'}
              </p>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('common.search') || 'Cari kolom...'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500"
              />

              <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900">
                {filteredColumns.map((col) => {
                  const isChecked = selectedIndices.includes(col);
                  const isPivotOrVal = col === pivotCol || col === valueCol;
                  return (
                    <label
                      key={col}
                      className={`flex items-center gap-2 p-1.5 rounded-md transition cursor-pointer text-[11px] font-mono ${
                        isPivotOrVal
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 text-slate-400'
                          : isChecked
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isPivotOrVal}
                        onChange={() => toggleIndexCol(col)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>{col}</span>
                      {isPivotOrVal && (
                        <span className="text-[9px] font-sans text-amber-600 dark:text-amber-400 ml-auto">
                          ({col === pivotCol ? 'Pivot Col' : 'Value Col'})
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 2 & 3: Pivot Column, Value Column, & Aggregation */}
            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              {/* Step 2: Pivot Header Column */}
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                    2
                  </span>
                  <span>{t('pivot.pivotHeaderCol') || 'Header Kolom ke Kanan (Pivot Column)'}</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('pivot.pivotHeaderDesc') || 'Nilai unik kolom ini akan menjadi header kolom baru (misal: ATNAM / ATINN).'}
                </p>
                <select
                  value={pivotCol}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPivotCol(val);
                    if (selectedIndices.includes(val)) {
                      setSelectedIndices(selectedIndices.filter((c) => c !== val));
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">-- {t('pivot.selectCol') || 'Pilih Kolom Header'} --</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col} disabled={col === valueCol}>
                      {col} {col === valueCol ? '(Digunakan sbg Value)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Value Column */}
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                    3
                  </span>
                  <span>{t('pivot.valueCol') || 'Nilai Sel Data (Value Column)'}</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('pivot.valueDesc') || 'Kolom yang nilainya mengisi sel hasil perpotongan (misal: ATWRT / ATFLV).'}
                </p>
                <select
                  value={valueCol}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValueCol(val);
                    if (selectedIndices.includes(val)) {
                      setSelectedIndices(selectedIndices.filter((c) => c !== val));
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">-- {t('pivot.selectVal') || 'Pilih Kolom Nilai'} --</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col} disabled={col === pivotCol}>
                      {col} {col === pivotCol ? '(Digunakan sbg Pivot Header)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 4: Aggregation Function */}
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                    4
                  </span>
                  <span>{t('pivot.aggFunc') || 'Metode Agregasi (Jika Ada Duplikasi)'}</span>
                </label>
                <select
                  value={aggFunc}
                  onChange={(e) => setAggFunc(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 text-[11px] focus:outline-none focus:border-purple-500 cursor-pointer font-medium"
                >
                  <option value="first">
                    {t('pivot.aggFirst') || 'First Value (Ambil Nilai Teks Pertama - Rekomendasi Karakteristik)'}
                  </option>
                  <option value="last">{t('pivot.aggLast') || 'Last Value (Ambil Nilai Terakhir)'}</option>
                  <option value="concat">{t('pivot.aggConcat') || 'Concatenate / Gabung Teks (Dipisah Koma)'}</option>
                  <option value="sum">{t('pivot.aggSum') || 'Sum (Penjumlahan Angka/Numerik)'}</option>
                  <option value="count">{t('pivot.aggCount') || 'Count (Jumlah Kemunculan)'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transformation Summary Preview */}
          {selectedIndices.length > 0 && pivotCol && valueCol && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">[{selectedIndices.join(', ')}]</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="text-purple-700 dark:text-purple-300 font-bold">
                  {pivotCol} ➔ {valueCol} ({aggFunc})
                </span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] font-sans">
                {isPivoted ? `Raw: ${rawTotalRows} baris` : `Total Data: ${totalRows} baris`}
              </span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            {isPivoted && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('pivot.resetBtn') || 'Reset ke Baris Asli (Unpivot)'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPivotModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition cursor-pointer"
            >
              {t('common.cancel') || 'Batal'}
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isPivoted ? t('pivot.updateBtn') || 'Perbarui Pivot' : t('pivot.applyBtn') || 'Terapkan Pivot Matrix'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
