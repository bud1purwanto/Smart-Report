import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
} from '@xyflow/react';
import { CompareTableNode } from './CompareTableNode';
import { useCompareStore } from '../../store/useCompareStore';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../locales/useTranslation';
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react';

export const CompareCanvas = () => {
  const { t } = useTranslation();
  const {
    nodes,
    edges,
    filters,
    onNodesChange,
    onEdgesChange,
    onConnect,
    clearCanvas,
  } = useCompareStore();
  const { theme, setFilterModalOpen, setTableCatalogOpen } = useAppStore();

  const nodeTypes = useMemo(() => ({ compareTableNode: CompareTableNode }), []);
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full relative bg-slate-50 dark:bg-slate-950 min-h-[300px] transition-colors duration-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode="loose"
        fitView
        className="bg-slate-50 dark:bg-slate-950"
      >
        <Background color={isDark ? '#1e293b' : '#cbd5e1'} gap={20} size={1.5} />
        <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !shadow-md !rounded-xl !overflow-hidden !text-slate-700 dark:!text-slate-300" />
        <MiniMap
          nodeColor="#9333ea"
          maskColor={isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(241, 245, 249, 0.75)'}
          className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 rounded-xl shadow-md"
        />

        {/* Top Floating Action Panel */}
        <Panel position="top-left" className="flex items-center gap-2 m-3 flex-wrap">
          <button
            onClick={() => setTableCatalogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs backdrop-blur-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{t('nav.addTable')}</span>
          </button>

          {nodes.length > 0 && (
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs shadow-xs transition cursor-pointer"
              title={t('canvas.resetCanvas')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </Panel>

        {/* Active Filters Pill Bar (Top Right) */}
        {filters.length > 0 && (
          <Panel position="top-right" className="m-3 max-w-lg">
            <div className="flex items-center gap-1.5 flex-wrap bg-white/95 dark:bg-slate-900/95 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-1.5 px-3 shadow-lg backdrop-blur-md text-[11px]">
              <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                <span>{t('canvas.whereClause')}</span>
              </span>
              {filters.map((f, idx) => (
                <span
                  key={idx}
                  onClick={() => setFilterModalOpen(true)}
                  className="font-mono text-[10px] bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs"
                  title={`${f.field}${f.fieldtext ? ` (${f.fieldtext})` : ''}: ${t('canvas.clickToEditFilter')}`}
                >
                  {f.field}{f.fieldtext ? ` (${f.fieldtext})` : ''} {f.operator} '{f.value}'{f.valueTo ? `..${f.valueTo}` : ''}
                </span>
              ))}
            </div>
          </Panel>
        )}

        {/* Status Indicator */}
        <Panel position="bottom-left" className="m-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs backdrop-blur-sm">
          <span className="font-bold text-purple-700 dark:text-purple-400">Cross-Server Canvas:</span> {nodes.length} {t('canvas.tables')} · {edges.length} {t('canvas.joins')}
        </Panel>
      </ReactFlow>
    </div>
  );
};
