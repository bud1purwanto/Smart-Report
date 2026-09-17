import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
} from '@xyflow/react';
import { TableNode } from './TableNode';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useAppStore } from '../../store/useAppStore';
import { useGridStore } from '../../store/useGridStore';
import { useTranslation } from '../../locales/useTranslation';
import { Plus, Trash2, Maximize2, Sparkles, Layers, SlidersHorizontal, Table2, GitFork, Link2 } from 'lucide-react';

export const VisualCanvas = () => {
  const { t } = useTranslation();
  const {
    nodes,
    edges,
    filters,
    pendingConnection,
    setPendingConnection,
    onNodesChange,
    onEdgesChange,
    onConnect,
    clearCanvas,
  } = useCanvasStore();

  const { setTableCatalogOpen, setAiModalOpen, setFilterModalOpen, setJoinModalOpen, theme } = useAppStore();
  const { totalRows, viewMode, setViewMode } = useGridStore();

  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && pendingConnection) {
        setPendingConnection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingConnection, setPendingConnection]);

  const onEdgeClick = useCallback(
    (_, edge) => {
      setJoinModalOpen(true, edge);
    },
    [setJoinModalOpen]
  );

  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full relative bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        connectionMode="loose"
        fitView
        className="bg-slate-50 dark:bg-slate-950"
      >
        <Background color={isDark ? '#1e293b' : '#cbd5e1'} gap={20} size={1.5} />
        <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !shadow-md !rounded-xl !overflow-hidden !text-slate-700 dark:!text-slate-300" />
        <MiniMap
          nodeColor="#0284c7"
          maskColor={isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(241, 245, 249, 0.75)'}
          className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 rounded-xl shadow-md"
        />

        {/* Top Floating Action Panel */}
        <Panel position="top-left" className="flex items-center gap-2 m-3">
          <button
            onClick={() => setTableCatalogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs backdrop-blur-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{t('nav.addTable')}</span>
          </button>
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50/95 dark:from-indigo-950/80 to-purple-50/95 dark:to-purple-950/80 hover:from-indigo-100 dark:hover:from-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-xs backdrop-blur-sm transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('nav.aiPrompt')}</span>
          </button>
          <button
            onClick={() => setFilterModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs backdrop-blur-sm transition cursor-pointer ${
              filters.length > 0
                ? 'bg-amber-50/95 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                : 'bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t('nav.params')}</span>
            {filters.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {filters.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setJoinModalOpen(true, null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs backdrop-blur-sm transition cursor-pointer ${
              edges.length > 0
                ? 'bg-sky-50/95 dark:bg-sky-950/80 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300'
                : 'bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title={t('join.modalTitle')}
          >
            <GitFork className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{t('canvas.joins')}</span>
            {edges.length > 0 && (
              <span className="bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {edges.length}
              </span>
            )}
          </button>
          {nodes.length > 0 && (
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-red-50 dark:hover:bg-red-950/50 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs shadow-xs transition cursor-pointer"
              title={t('canvas.resetCanvas')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </Panel>

        {/* Pending Connection Banner */}
        {pendingConnection && (
          <Panel position="top-center" className="mt-3 z-30">
            <div className="flex items-center gap-3 bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-2xl shadow-xl border border-amber-300 animate-pulse text-xs">
              <Link2 className="w-4 h-4" />
              <span>
                {t('canvas.pendingRelBanner')} <strong>{pendingConnection.table}.{pendingConnection.field}</strong>
              </span>
              <button
                onClick={() => setPendingConnection(null)}
                className="ml-2 px-2.5 py-1 bg-black/20 hover:bg-black/40 rounded-lg text-xs font-bold text-white cursor-pointer transition"
              >
                {t('canvas.cancelPending')}
              </button>
            </div>
          </Panel>
        )}

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

        {/* Canvas Status Indicator */}
        <Panel position="bottom-left" className="m-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs backdrop-blur-sm">
          {nodes.length} {t('canvas.tables')} · {edges.length} {t('canvas.joins')} ({t('canvas.autoJoinActive')})
        </Panel>

        {/* Floating Open ALV Button when Canvas is Full */}
        {totalRows > 0 && viewMode === 'canvas' && (
          <Panel position="bottom-center" className="mb-4">
            <button
              onClick={() => setViewMode('split')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-sky-900/20 border border-sky-400/30 transition transform hover:-translate-y-0.5 cursor-pointer backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
            >
              <Table2 className="w-4 h-4" />
              <span>{t('grid.openAlvResult', { count: totalRows.toLocaleString() })}</span>
            </button>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

