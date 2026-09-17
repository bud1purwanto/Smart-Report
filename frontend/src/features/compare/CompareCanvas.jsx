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
import { useAppStore } from '../../store/useAppStore';
import { Plus, Trash2, Database, Sparkles, SlidersHorizontal } from 'lucide-react';

export const CompareCanvas = () => {
  const {
    nodes,
    edges,
    filters,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addTableNode,
    clearCanvas,
  } = useCompareStore();
  const { theme, setFilterModalOpen } = useAppStore();

  const [inputTable, setInputTable] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const nodeTypes = useMemo(() => ({ compareTableNode: CompareTableNode }), []);
  const isDark = theme === 'dark';

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

        {/* Top Floating Control Panel */}
        <Panel position="top-left" className="flex items-center gap-2 m-3 flex-wrap">
          {/* Custom Table Input */}
          <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-xs backdrop-blur-sm">
            <input
              type="text"
              value={inputTable}
              onChange={(e) => setInputTable(e.target.value)}
              placeholder="Nama tabel SAP..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 uppercase font-mono w-32 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleAddTable()}
              disabled={isAdding || !inputTable.trim()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Menambah...' : 'Tambah'}</span>
            </button>
          </div>

          {/* Quick Add Pills */}
          <div className="hidden sm:flex items-center gap-1 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-xs backdrop-blur-sm">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1 font-mono uppercase">Quick:</span>
            {quickTables.map((tbl) => (
              <button
                key={tbl}
                onClick={() => handleAddTable(tbl)}
                className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-700 dark:hover:text-purple-300 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800 transition cursor-pointer"
              >
                +{tbl}
              </button>
            ))}
          </div>

          {/* Selection Parameter Button */}
          <button
            onClick={() => setFilterModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs backdrop-blur-sm transition cursor-pointer ${
              filters.length > 0
                ? 'bg-amber-50/95 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                : 'bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title="Atur kriteria filter / parameter WHERE untuk komparasi multi-server"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Parameter</span>
            {filters.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {filters.length}
              </span>
            )}
          </button>

          {nodes.length > 0 && (
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs shadow-xs transition cursor-pointer"
              title="Bersihkan Kanvas Komparasi"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Kanvas</span>
            </button>
          )}
        </Panel>

        {/* Active Filters Pill Bar (Top Right) */}
        {filters.length > 0 && (
          <Panel position="top-right" className="m-3 max-w-lg">
            <div className="flex items-center gap-1.5 flex-wrap bg-white/95 dark:bg-slate-900/95 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-1.5 px-3 shadow-lg backdrop-blur-md text-[11px]">
              <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                <span>WHERE:</span>
              </span>
              {filters.map((f, idx) => (
                <span
                  key={idx}
                  onClick={() => setFilterModalOpen(true)}
                  className="font-mono text-[10px] bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs"
                  title={`${f.field}${f.fieldtext ? ` (${f.fieldtext})` : ''}: Klik untuk ubah parameter ini`}
                >
                  {f.field}{f.fieldtext ? ` (${f.fieldtext})` : ''} {f.operator} '{f.value}'{f.valueTo ? `..${f.valueTo}` : ''}
                </span>
              ))}
            </div>
          </Panel>
        )}

        {/* Status Indicator */}
        <Panel position="bottom-left" className="m-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs backdrop-blur-sm">
          <span className="font-bold text-purple-700 dark:text-purple-400">Cross-Server Canvas:</span> {nodes.length} Tabel · {edges.length} Relasi Join
        </Panel>
      </ReactFlow>
    </div>
  );
};

