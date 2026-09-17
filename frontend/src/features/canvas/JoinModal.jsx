import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';

export const JoinModal = () => {
  const { joinModalOpen, setJoinModalOpen, activeEdgeForEdit } = useAppStore();
  const { updateEdgeData, removeEdge, nodes } = useCanvasStore();

  if (!joinModalOpen || !activeEdgeForEdit) return null;

  const sourceNode = nodes.find((n) => n.id === activeEdgeForEdit.source);
  const targetNode = nodes.find((n) => n.id === activeEdgeForEdit.target);

  const joinData = activeEdgeForEdit.data || {};
  const currentJoinType = joinData.joinType || 'INNER';

  const handleTypeChange = (newType) => {
    updateEdgeData(activeEdgeForEdit.id, { joinType: newType });
  };

  const handleDelete = () => {
    removeEdge(activeEdgeForEdit.id);
    setJoinModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <h3 className="font-bold text-sm text-slate-100 font-mono">
              Edit Relasi Join: {sourceNode?.data.table} ↔ {targetNode?.data.table}
            </h3>
          </div>
          <button
            onClick={() => setJoinModalOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Join Fields Info */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>Tabel Sumber:</span>
            <span className="font-mono font-bold text-slate-200">{sourceNode?.data.table}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Field Sumber:</span>
            <span className="font-mono text-sky-400 font-semibold">{joinData.sourceField || activeEdgeForEdit.sourceHandle}</span>
          </div>
          <div className="border-t border-slate-800/80 my-1"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Tabel Tujuan:</span>
            <span className="font-mono font-bold text-slate-200">{targetNode?.data.table}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Field Tujuan:</span>
            <span className="font-mono text-sky-400 font-semibold">{joinData.targetField || activeEdgeForEdit.targetHandle}</span>
          </div>
        </div>

        {/* Join Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Tipe Join (ABAP Open SQL):</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTypeChange('INNER')}
              className={`p-2.5 rounded-xl border text-xs font-medium text-left transition ${
                currentJoinType === 'INNER'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold">INNER JOIN</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Hanya baris dengan kecocokan di kedua tabel</div>
            </button>
            <button
              onClick={() => handleTypeChange('LEFT OUTER')}
              className={`p-2.5 rounded-xl border text-xs font-medium text-left transition ${
                currentJoinType === 'LEFT OUTER'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold">LEFT OUTER JOIN</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Semua baris tabel sumber + kecocokan tujuan</div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Relasi</span>
          </button>
          <button
            onClick={() => setJoinModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

