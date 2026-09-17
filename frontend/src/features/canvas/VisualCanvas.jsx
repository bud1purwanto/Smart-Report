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
import { Plus, Trash2, Maximize2, Sparkles, Layers } from 'lucide-react';

export const VisualCanvas = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    clearCanvas,
  } = useCanvasStore();

  const { setTableCatalogOpen, setAiModalOpen, setJoinModalOpen } = useAppStore();

  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

  const onEdgeClick = useCallback(
    (_, edge) => {
      setJoinModalOpen(true, edge);
    },
    [setJoinModalOpen]
  );

  return (
    <div className="w-full h-full relative bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50"
      >
        <Background color="#cbd5e1" gap={20} size={1.5} />
        <Controls className="!bg-white !border-slate-200 !shadow-md !rounded-xl !overflow-hidden" />
        <MiniMap
          nodeColor="#0284c7"
          maskColor="rgba(241, 245, 249, 0.75)"
          className="!bg-white !border-slate-200 rounded-xl shadow-md"
        />

        {/* Top Floating Action Panel */}
        <Panel position="top-left" className="flex items-center gap-2 m-3">
          <button
            onClick={() => setTableCatalogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs backdrop-blur-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600" />
            <span>Tambah Tabel</span>
          </button>
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50/95 to-purple-50/95 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-xs backdrop-blur-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Query Builder</span>
          </button>
          {nodes.length > 0 && (
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 text-xs shadow-xs transition"
              title="Bersihkan Kanvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </Panel>

        {/* Canvas Status Indicator */}
        <Panel position="bottom-left" className="m-3 text-[11px] text-slate-500 font-mono bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs backdrop-blur-sm">
          {nodes.length} Tabel · {edges.length} Relasi Join (Auto-Join Aktif)
        </Panel>
      </ReactFlow>
    </div>
  );
};

