import React, { useMemo, useCallback } from 'react';
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
import { Plus, Trash2, Maximize2, Sparkles, Layers, SlidersHorizontal } from 'lucide-react';

export const VisualCanvas = () => {
  const {
    nodes,
    edges,
    filters,
    onNodesChange,
    onEdgesChange,
    onConnect,
    clearCanvas,
  } = useCanvasStore();

  const { setTableCatalogOpen, setAiModalOpen, setFilterModalOpen, setJoinModalOpen, theme } = useAppStore();

  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs backdrop-blur-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Tambah Tabel</span>
          </button>
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50/95 dark:from-indigo-950/80 to-purple-50/95 dark:to-purple-950/80 hover:from-indigo-100 dark:hover:from-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-xs backdrop-blur-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI Query Builder</span>
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
            <span>Kriteria Parameter</span>
            {filters.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {filters.length}
              </span>
            )}
          </button>
          {nodes.length > 0 && (
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-red-50 dark:hover:bg-red-950/50 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs shadow-xs transition"
              title="Bersihkan Kanvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </Panel>

        {/* Canvas Status Indicator */}
        <Panel position="bottom-left" className="m-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs backdrop-blur-sm">
          {nodes.length} Tabel · {edges.length} Relasi Join (Auto-Join Aktif)
        </Panel>
      </ReactFlow>
    </div>
  );
};

