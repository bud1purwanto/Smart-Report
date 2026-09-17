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
    <div className="w-full h-full relative bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-950"
      >
        <Background color="#1e293b" gap={20} size={1.5} />
        <Controls className="!bg-slate-900 !border-slate-800 !shadow-xl" />
        <MiniMap
          nodeColor="#0284c7"
          maskColor="rgba(15, 23, 42, 0.7)"
          className="!bg-slate-900 !border-slate-800 rounded-lg shadow-xl"
        />

        {/* Top Floating Action Panel */}
        <Panel position="top-left" className="flex items-center gap-2 m-3">
          <button
            onClick={() => setTableCatalogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold shadow-lg backdrop-blur transition"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Tambah Tabel</span>
          </button>
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-300 text-xs font-semibold shadow-lg backdrop-blur transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Query Builder</span>
          </button>
          {nodes.length > 0 && (
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-red-950/80 border border-slate-800 hover:border-red-800/80 text-slate-400 hover:text-red-300 text-xs transition"
              title="Bersihkan Kanvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </Panel>

        {/* Canvas Status Indicator */}
        <Panel position="bottom-left" className="m-3 text-[11px] text-slate-400 font-mono bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 backdrop-blur">
          {nodes.length} Tabel · {edges.length} Relasi Join (Auto-Join Aktif)
        </Panel>
      </ReactFlow>
    </div>
  );
};

