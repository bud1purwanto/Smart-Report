import React, { useState } from 'react';
import {
  Download, Shield, CopySlash, Calculator, Bookmark, Check,
  Clock, Database, EyeOff, FileSpreadsheet, Maximize2, Minimize2, Columns2, Columns3, RotateCcw, X
} from 'lucide-react';
import { useGridStore } from '../../store/useGridStore';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useTranslation } from '../../locales/useTranslation';
import { exportQuery } from '../../services/api';

export const ExportToolbar = () => {
  const { t } = useTranslation();
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
    isPivoted,
    pivotConfig,
    resetPivot,
    rowData,
    columnDefs,
  } = useGridStore();

  const { setFormulaModalOpen, setVariantModalOpen, setPivotModalOpen, activeServer, showNotification } = useAppStore();
  const { getQueryDefinition } = useCanvasStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    const queryDef = getQueryDefinition();
    if (!queryDef.tables || queryDef.tables.length === 0) {
      showNotification(t('grid.noQueryToExport'), 'warning');
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

      showNotification(t('grid.exportSuccess'), 'success');
    } catch (err) {
      showNotification(`${t('grid.exportFailed')}: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    if (isPivoted) {
      // Direct client-side CSV export of current pivoted rows & columns
      try {
        const visibleCols = columnDefs.filter((c) => !c.hide).map((c) => c.field);
        const headerRow = visibleCols.map((c) => `"${c}"`).join(',');
        const dataRows = rowData.map((row) =>
          visibleCols
            .map((c) => {
              const val = row[c] ?? '';
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(',')
        );
        const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Smart_Report_Pivoted_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showNotification(t('pivot.exportCsvSuccess') || 'Data hasil pivot berhasil diekspor ke CSV.', 'success');
      } catch (err) {
        showNotification(`${t('grid.exportFailed')}: ${err.message}`, 'error');
      }
      return;
    }

    // Standard backend Excel export
    await handleExportExcel();
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
          <span className="flex items-center gap-1">
            <span>{t('grid.totalRowsCount', { count: totalRows.toLocaleString() })}</span>
            {isPivoted && (
              <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                (Pivoted)
              </span>
            )}
          </span>
          {executionTimeMs > 0 && (
            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{executionTimeMs} ms</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Pivot / Transpose Button */}
        <div className="flex items-center">
          <button
            onClick={() => setPivotModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
              isPivoted
                ? 'bg-purple-100 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200 shadow-2xs'
                : 'bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
            }`}
            title={t('pivot.tooltip') || 'Pivot / Transpose baris karakteristik (AUSP) menjadi kolom horizontal'}
          >
            <Columns3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>{isPivoted ? `${t('pivot.buttonLabel') || 'Pivot'}: ${pivotConfig?.pivotColumn || 'ON'}` : `+ ${t('pivot.buttonLabel') || 'Pivot'}`}</span>
          </button>
          {isPivoted && (
            <button
              onClick={() => {
                resetPivot();
                showNotification(t('pivot.resetSuccess') || 'Tampilan ALV Grid dikembalikan ke baris tabular asli.', 'info');
              }}
              title={t('pivot.resetTooltip') || 'Kembalikan ke data asli (Unpivot)'}
              className="ml-1 p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Custom Column Formula Button */}
        <button
          onClick={() => setFormulaModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition shadow-2xs cursor-pointer"
          title={t('grid.customColTooltip')}
        >
          <Calculator className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>+ {t('grid.customColumn')}</span>
        </button>

        {/* Anonymize Sensitive Data Toggle (RULE 4) */}
        <button
          onClick={() => setAnonymize(!anonymize)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
            anonymize
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title={t('grid.maskingTooltip')}
        >
          <Shield className={`w-3.5 h-3.5 ${anonymize ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
          <span>{t('grid.masking')} {anonymize ? t('grid.on') : t('grid.off')}</span>
        </button>

        {/* Deduplicate Toggle */}
        <button
          onClick={() => setDeduplicate(!deduplicate)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
            deduplicate
              ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700 shadow-2xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title={t('grid.dedupTooltip')}
        >
          <CopySlash className={`w-3.5 h-3.5 ${deduplicate ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
          <span>{t('grid.dedup')} {deduplicate ? t('grid.on') : t('grid.off')}</span>
        </button>

        {/* Variant Manager Button */}
        <button
          onClick={() => setVariantModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition cursor-pointer"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>{activeVariant ? `${t('grid.layoutPrefix')}: ${activeVariant.name}` : t('grid.variants')}</span>
        </button>

        {/* Export Excel / CSV Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || totalRows === 0}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{isExporting ? t('grid.exporting') : isPivoted ? t('grid.exportCsv') || 'Export CSV' : t('grid.exportExcel')}</span>
        </button>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        {/* View Mode Controls: Split, Full ALV, Close ALV */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title={t('grid.splitTooltip')}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('grid.split')}</span>
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'split' : 'grid')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title={viewMode === 'grid' ? t('grid.backToSplitTooltip') : t('grid.fullAlvTooltip')}
          >
            {viewMode === 'grid' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{viewMode === 'grid' ? t('grid.split') : t('grid.fullAlv')}</span>
          </button>
          <button
            onClick={() => setViewMode('canvas')}
            className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
            title={t('grid.closeAlvTooltip')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

