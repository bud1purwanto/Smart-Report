import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
} from '@xyflow/react';
import { CompareTableNode } from './CompareTableNode';
import { useCompareStore } from '../../store/useCompareStore';
import { Plus, Trash2, Database, Sparkles } from 'lucide-react';

export const CompareCanvas = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addTableNode,
    clearCanvas,
  } = useCompareStore();

  const [inputTable, setInputTable] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const nodeTypes = useMemo(() => ({ compareTableNode: CompareTableNode }), []);

  const handleAddTable = async (tableName) => {
    const tbl = (tableName || inputTable).trim().toUpperCase();
    if (!tbl) return;
    setIsAdding(true);
    try {
      await addTableNode(tbl);
      setInputTable('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const quickTables = ['EKKO', 'EKPO', 'BKPF', 'BSEG', 'MARC', 'LFA1'];

  return (
    <div className="w-full h-full relative bg-slate-50 min-h-[300px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50"
      >
        <Background color="#cbd5e1" gap={20} size={1.5} />
        <Controls className="!bg-white !border-slate-200 !shadow-md !rounded-xl !overflow-hidden" />
        <MiniMap
          nodeColor="#9333ea"
          maskColor="rgba(241, 245, 249, 0.75)"
          className="!bg-white !border-slate-200 rounded-xl shadow-md"
        />

        {/* Top Floating Control Panel */}
        <Panel position="top-left" className="flex items-center gap-2 m-3 flex-wrap">
          {/* Custom Table Input */}
          <div className="flex items-center gap-1.5 bg-white/95 border border-slate-200 rounded-xl p-1 shadow-xs backdrop-blur-sm">
            <input
              type="text"
              value={inputTable}
              onChange={(e) => setInputTable(e.target.value)}
              placeholder="Nama tabel SAP..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 uppercase font-mono w-32 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleAddTable()}
              disabled={isAdding || !inputTable.trim()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Menambah...' : 'Tambah'}</span>
            </button>
          </div>

          {/* Quick Add Pills */}
          <div className="hidden sm:flex items-center gap-1 bg-white/95 border border-slate-200 rounded-xl p-1 shadow-xs backdrop-blur-sm">
            <span className="text-[10px] font-bold text-slate-400 px-1 font-mono uppercase">Quick:</span>
            {quickTables.map((tbl) => (
              <button
                key={tbl}
                onClick={() => handleAddTable(tbl)}
                className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-600 font-mono text-[11px] font-bold border border-slate-200 hover:border-purple-200 transition"
              >
                +{tbl}
              </button>
            ))}
          </div>

          {nodes.length > 0 && (
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 text-xs shadow-xs transition"
              title="Bersihkan Kanvas Komparasi"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Kanvas</span>
            </button>
          )}
        </Panel>

        {/* Status Indicator */}
        <Panel position="bottom-left" className="m-3 text-[11px] text-slate-500 font-mono bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs backdrop-blur-sm">
          <span className="font-bold text-purple-700">Cross-Server Canvas:</span> {nodes.length} Tabel · {edges.length} Relasi Join
        </Panel>
      </ReactFlow>
    </div>
  );
};
