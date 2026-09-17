import React, { useState } from 'react';
import {
  Download, Shield, CopySlash, Calculator, Bookmark, Check,
  Clock, Database, EyeOff, FileSpreadsheet
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
      link.setAttribute('download', `Smart_SQVI_Export_${Date.now()}.xlsx`);
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
    <div className="h-11 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between select-none text-xs shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-sky-400" />
          <span>ALV Live Data</span>
        </span>
        <span className="text-slate-600">|</span>

        {/* Total rows & latency */}
        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <span>{totalRows.toLocaleString()} baris</span>
          {executionTimeMs > 0 && (
            <span className="flex items-center gap-1 text-slate-500">
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
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 font-semibold text-[11px] transition"
          title="Tambah Kolom Kalkulasi Dinamis"
        >
          <Calculator className="w-3.5 h-3.5 text-indigo-400" />
          <span>+ fx Formula</span>
        </button>

        {/* Anonymize Sensitive Data Toggle (RULE 4) */}
        <button
          onClick={() => setAnonymize(!anonymize)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-semibold transition ${
            anonymize
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Masking data sensitif vendor (Nominal finansial & No Rekening) sebelum export"
        >
          <Shield className={`w-3.5 h-3.5 ${anonymize ? 'text-amber-400' : 'text-slate-500'}`} />
          <span>Masking Finansial {anonymize ? 'ON' : 'OFF'}</span>
        </button>

        {/* Deduplicate Toggle */}
        <button
          onClick={() => setDeduplicate(!deduplicate)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-semibold transition ${
            deduplicate
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Hapus baris ganda (misal invoice berulang)"
        >
          <CopySlash className={`w-3.5 h-3.5 ${deduplicate ? 'text-sky-400' : 'text-slate-500'}`} />
          <span>Dedup {deduplicate ? 'ON' : 'OFF'}</span>
        </button>

        {/* Variant Manager Button */}
        <button
          onClick={() => setVariantModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold transition"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeVariant ? `Layout: ${activeVariant.name}` : 'Variants / Layout'}</span>
        </button>

        {/* Export Excel Button */}
        <button
          onClick={handleExportExcel}
          disabled={isExporting || totalRows === 0}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[11px] shadow-sm transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Mengekspor...' : 'Export Excel'}</span>
        </button>
      </div>
    </div>
  );
};

