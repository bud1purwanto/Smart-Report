import React, { useState } from 'react';
import {
  Download, Shield, CopySlash, Calculator, Bookmark, Check,
  Clock, Database, EyeOff, FileSpreadsheet, Maximize2, Minimize2, Columns2, X
} from 'lucide-react';
import { useGridStore } from '../../store/useGridStore';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { exportQuery } from '../../services/api';

export const ExportToolbar = () => {
  const {
    anonymize,
    setAnonymize,
    deduplicate,
    setDeduplicate,
    totalRows,
    executionTimeMs,
    variants,
    activeVariant,
    applyVariant,
    viewMode,
    setViewMode,
  } = useGridStore();

  const { setFormulaModalOpen, setVariantModalOpen, activeServer, showNotification } = useAppStore();
  const { getQueryDefinition } = useCanvasStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    const queryDef = getQueryDefinition();
    if (!queryDef.tables || queryDef.tables.length === 0) {
      showNotification('Tidak ada query untuk diekspor.', 'warning');
      return;
    }

    setIsExporting(true);
    try {
      const response = await exportQuery({
        server_id: activeServer?.id,
        query: queryDef,
        apply_variant_id: activeVariant?.id,
        anonymize,
        deduplicate,
      });

      // Trigger browser download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Smart_Report_Export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('Export Excel berhasil diunduh.', 'success');
    } catch (err) {
      showNotification('Gagal export Excel: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-11 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between select-none text-xs shrink-0 shadow-2xs transition-colors duration-200">
      <div className="flex items-center gap-3">
        <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>ALV Live Data</span>
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>

        {/* Total rows & latency */}
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          <span>{totalRows.toLocaleString()} baris</span>
          {executionTimeMs > 0 && (
            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{executionTimeMs} ms</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Custom Column Formula Button */}
        <button
          onClick={() => setFormulaModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition shadow-2xs"
          title="Tambah Kolom Kalkulasi Dinamis"
        >
          <Calculator className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>+ fx Formula</span>
        </button>

        {/* Anonymize Sensitive Data Toggle (RULE 4) */}
        <button
          onClick={() => setAnonymize(!anonymize)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
            anonymize
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Masking data sensitif vendor (Nominal finansial & No Rekening) sebelum export"
        >
          <Shield className={`w-3.5 h-3.5 ${anonymize ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
          <span>Masking Finansial {anonymize ? 'ON' : 'OFF'}</span>
        </button>

        {/* Deduplicate Toggle */}
        <button
          onClick={() => setDeduplicate(!deduplicate)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
            deduplicate
              ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700 shadow-2xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Hapus baris ganda (misal invoice berulang)"
        >
          <CopySlash className={`w-3.5 h-3.5 ${deduplicate ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
          <span>Dedup {deduplicate ? 'ON' : 'OFF'}</span>
        </button>

        {/* Variant Manager Button */}
        <button
          onClick={() => setVariantModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>{activeVariant ? `Layout: ${activeVariant.name}` : 'Variants / Layout'}</span>
        </button>

        {/* Export Excel Button */}
        <button
          onClick={handleExportExcel}
          disabled={isExporting || totalRows === 0}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[11px] shadow-xs transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Mengekspor...' : 'Export Excel'}</span>
        </button>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        {/* View Mode Controls: Split, Full ALV, Close ALV */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('split')}
            className={`p-1 rounded text-[11px] transition ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Tampilan Split (Kanvas + ALV Grid)"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'split' : 'grid')}
            className={`p-1 rounded text-[11px] transition ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title={viewMode === 'grid' ? 'Kembali ke Split' : 'Layar Penuh ALV Grid'}
          >
            {viewMode === 'grid' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setViewMode('canvas')}
            className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition"
            title="Tutup ALV (Kembali ke Kanvas Penuh)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

