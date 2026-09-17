import React from 'react';
import { ArrowLeftRight, Eye, X } from 'lucide-react';
import { useCompareStore } from '../../store/useCompareStore';
import { useTranslation } from '../../locales/useTranslation';
import { CompareCanvas } from './CompareCanvas';

export const CrossServerCompare = () => {
  const { t } = useTranslation();
  const {
    filterStatus,
    setFilterStatus,
    isComparing,
    compareResult,
    inspectRow,
    setInspectRow,
    compareViewMode,
    setCompareViewMode,
  } = useCompareStore();

  const filteredRows = compareResult?.diff_rows.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.diff_status === filterStatus;
  }) || [];

  const summary = compareResult?.summary;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* Compare Canvas Viewport */}
      <div
        className={`relative transition-all duration-300 ${
          compareViewMode === 'canvas'
            ? 'flex-1 h-full'
            : compareViewMode === 'split'
            ? 'flex-1 min-h-[380px] border-b border-slate-200 dark:border-slate-800'
            : 'hidden'
        }`}
      >
        <CompareCanvas />

        {/* Floating button when in full canvas mode and results exist */}
        {compareResult && compareViewMode === 'canvas' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => setCompareViewMode('split')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-purple-900/20 border border-purple-400/30 transition transform hover:-translate-y-0.5 cursor-pointer backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{t('compare.openDiffButton', { count: filteredRows.length })}</span>
            </button>
          </div>
        )}
      </div>

      {/* Results Viewport (Summary Cards + Tabs + Diff Table) - Revealed on query run */}
      {(compareResult || isComparing) && compareViewMode !== 'canvas' && (
        <div className={`flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 ${
          compareViewMode === 'results' ? 'flex-1 h-full' : 'flex-1 min-h-[320px] overflow-auto'
        }`}>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 p-2.5 shadow-2xs">
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">{t('compare.summaryServerA')}</span>
                <span className="text-base font-mono font-black text-sky-800 dark:text-sky-200">{summary.total_a.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{summary.server_a_name}</span>
              </div>
              <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 p-2.5 shadow-2xs">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">{t('compare.summaryServerB')}</span>
                <span className="text-base font-mono font-black text-purple-800 dark:text-purple-200">{summary.total_b.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{summary.server_b_name}</span>
              </div>
              <div
                onClick={() => setFilterStatus('IDENTICAL')}
                className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
                  filterStatus === 'IDENTICAL'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-300 dark:ring-emerald-700'
                    : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30'
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">{t('compare.identical')}</span>
                <span className="text-base font-mono font-black text-emerald-800 dark:text-emerald-200">{summary.identical_count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('compare.identicalDesc')}</span>
              </div>
              <div
                onClick={() => setFilterStatus('MODIFIED')}
                className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
                  filterStatus === 'MODIFIED'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 ring-2 ring-amber-300 dark:ring-amber-700'
                    : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30'
                }`}
              >
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">{t('compare.modified')}</span>
                <span className="text-base font-mono font-black text-amber-800 dark:text-amber-200">{summary.modified_count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('compare.modifiedDesc')}</span>
              </div>
              <div
                onClick={() => setFilterStatus('ADDED_IN_B')}
                className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
                  filterStatus === 'ADDED_IN_B'
                    ? 'bg-sky-100 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 ring-2 ring-sky-300 dark:ring-sky-700'
                    : 'border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100/60 dark:hover:bg-sky-900/30'
                }`}
              >
                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block">{t('compare.addedInB')}</span>
                <span className="text-base font-mono font-black text-sky-800 dark:text-sky-200">{summary.added_count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('compare.addedInBDesc')}</span>
              </div>
              <div
                onClick={() => setFilterStatus('DELETED_IN_B')}
                className={`rounded-xl border p-2.5 cursor-pointer transition shadow-2xs ${
                  filterStatus === 'DELETED_IN_B'
                    ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 ring-2 ring-rose-300 dark:ring-rose-700'
                    : 'border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/30'
                }`}
              >
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">{t('compare.deletedInB')}</span>
                <span className="text-base font-mono font-black text-rose-800 dark:text-rose-200">{summary.deleted_count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('compare.deletedInBDesc')}</span>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          {compareResult && (
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                {[
                  { key: 'ALL', label: t('compare.allTab') },
                  { key: 'MODIFIED', label: t('compare.modifiedTab') },
                  { key: 'ADDED_IN_B', label: t('compare.addedTab') },
                  { key: 'DELETED_IN_B', label: t('compare.deletedTab') },
                  { key: 'IDENTICAL', label: t('compare.identicalTab') },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key)}
                    className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition shadow-2xs cursor-pointer ${
                      filterStatus === key
                        ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {t('compare.parallelTime')} <b>{compareResult.execution_time_ms} ms</b> · {t('compare.showingRows', { count: filteredRows.length })}
              </div>
            </div>
          )}

          {/* Diff Table */}
          <div className="flex-1 overflow-auto p-3">
            {compareResult && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5 w-28">{t('compare.colStatus')}</th>
                      <th className="p-2.5 w-48">{t('compare.colKey')}</th>
                      <th className="p-2.5">{t('compare.colDetail')}</th>
                      <th className="p-2.5 w-20 text-center">{t('compare.colAction')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredRows.map((r, idx) => {
                      let badge = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                      if (r.diff_status === 'MODIFIED') badge = 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
                      if (r.diff_status === 'ADDED_IN_B') badge = 'bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700';
                      if (r.diff_status === 'DELETED_IN_B') badge = 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
                      if (r.diff_status === 'IDENTICAL') badge = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="p-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badge}`}>
                              {r.diff_status}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {r.key_value}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {r.diff_status === 'MODIFIED' ? (
                              <div className="space-y-1">
                                {Object.entries(r.changed_fields).map(([field, diff]) => (
                                  <div key={field} className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{field}:</span>
                                    <span className="line-through text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 rounded">{String(diff.old_val)}</span>
                                    <span className="text-slate-400 dark:text-slate-500">→</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded">{String(diff.new_val)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : r.diff_status === 'ADDED_IN_B' ? (
                              <span className="text-sky-700 dark:text-sky-400 font-medium">{t('compare.addedDetail')}</span>
                            ) : r.diff_status === 'DELETED_IN_B' ? (
                              <span className="text-rose-700 dark:text-rose-400 font-medium">{t('compare.deletedDetail')}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">{t('compare.identicalValueMatch')}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => setInspectRow(r)}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer"
                              title={t('compare.inspectRow')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspect Row Modal */}
      {inspectRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 font-mono">
                {t('compare.inspectTitle', { key: inspectRow.key_value })}
              </h3>
              <button
                onClick={() => setInspectRow(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="rounded-xl bg-sky-50/40 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 p-3 space-y-2">
                <span className="text-sky-800 dark:text-sky-300 font-bold block border-b border-sky-200 dark:border-sky-800/60 pb-1">
                  SERVER A ({summary?.server_a_name})
                </span>
                <pre className="text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(inspectRow.data_a, null, 2)}
                </pre>
              </div>
              <div className="rounded-xl bg-purple-50/40 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 p-3 space-y-2">
                <span className="text-purple-800 dark:text-purple-300 font-bold block border-b border-purple-200 dark:border-purple-800/60 pb-1">
                  SERVER B ({summary?.server_b_name})
                </span>
                <pre className="text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(inspectRow.data_b, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectRow(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
