import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';

export const JoinModal = () => {
  const { joinModalOpen, setJoinModalOpen, activeEdgeForEdit, showNotification } = useAppStore();
  const { updateEdgeData, removeEdge, nodes, edges, addJoinEdge } = useCanvasStore();

  const [srcNodeId, setSrcNodeId] = React.useState('');
  const [srcField, setSrcField] = React.useState('');
  const [tgtNodeId, setTgtNodeId] = React.useState('');
  const [tgtField, setTgtField] = React.useState('');
  const [newJoinType, setNewJoinType] = React.useState('INNER');

  React.useEffect(() => {
    if (!activeEdgeForEdit && nodes.length >= 2) {
      const n1 = nodes[0];
      const n2 = nodes[1];
      setSrcNodeId(n1.id);
      setSrcField(n1.data.fields?.[0]?.fieldname || '');
      setTgtNodeId(n2.id);
      setTgtField(n2.data.fields?.[0]?.fieldname || '');
    }
  }, [nodes, activeEdgeForEdit, joinModalOpen]);

  if (!joinModalOpen) return null;

  // Edit Mode
  if (activeEdgeForEdit) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 dark:bg-sky-400"></span>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 font-mono">
              Edit Relasi Join: {sourceNode?.data.table} ↔ {targetNode?.data.table}
            </h3>
          </div>
          <button
            onClick={() => setJoinModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Join Fields Info */}
        {(() => {
          const srcFieldName = joinData.sourceField || activeEdgeForEdit.sourceHandle;
          const tgtFieldName = joinData.targetField || activeEdgeForEdit.targetHandle;
          const srcFieldObj = sourceNode?.data?.fields?.find((f) => f.fieldname === srcFieldName);
          const tgtFieldObj = targetNode?.data?.fields?.find((f) => f.fieldname === tgtFieldName);
          return (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Tabel Sumber:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{sourceNode?.data.table}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Field Sumber:</span>
                <span className="font-mono text-sky-700 dark:text-sky-400 font-bold">
                  {srcFieldName} {srcFieldObj?.fieldtext && srcFieldObj.fieldtext !== srcFieldName ? `(${srcFieldObj.fieldtext})` : ''}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Tabel Tujuan:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{targetNode?.data.table}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Field Tujuan:</span>
                <span className="font-mono text-sky-700 dark:text-sky-400 font-bold">
                  {tgtFieldName} {tgtFieldObj?.fieldtext && tgtFieldObj.fieldtext !== tgtFieldName ? `(${tgtFieldObj.fieldtext})` : ''}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Join Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipe Join (ABAP Open SQL):</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTypeChange('INNER')}
              className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                currentJoinType === 'INNER'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 text-sky-800 dark:text-sky-200 ring-2 ring-sky-200 dark:ring-sky-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <div className="font-bold">INNER JOIN</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Hanya baris dengan kecocokan di kedua tabel</div>
            </button>
            <button
              onClick={() => handleTypeChange('LEFT OUTER')}
              className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                currentJoinType === 'LEFT OUTER'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 text-sky-800 dark:text-sky-200 ring-2 ring-sky-200 dark:ring-sky-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <div className="font-bold">LEFT OUTER JOIN</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Semua baris tabel sumber + kecocokan tujuan</div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Relasi</span>
          </button>
          <button
            onClick={() => setJoinModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

  // Create / Manage Joins Mode
  const activeSourceNode = nodes.find((n) => n.id === srcNodeId) || nodes[0];
  const activeTargetNode =
    nodes.find((n) => n.id === tgtNodeId && n.id !== activeSourceNode?.id) ||
    nodes.find((n) => n.id !== activeSourceNode?.id) ||
    nodes[1];

  const sourceFields = activeSourceNode?.data?.fields || [];
  const targetFields = activeTargetNode?.data?.fields || [];

  const handleCreateJoin = () => {
    if (!activeSourceNode || !activeTargetNode || activeSourceNode.id === activeTargetNode.id) {
      showNotification('Pilih dua tabel yang berbeda untuk membuat relasi join.', 'warning');
      return;
    }
    const sFld = srcField || sourceFields[0]?.fieldname;
    const tFld = tgtField || targetFields[0]?.fieldname;
    if (!sFld || !tFld) {
      showNotification('Pilih kolom sumber dan tujuan terlebih dahulu.', 'warning');
      return;
    }

    const ok = addJoinEdge(activeSourceNode.id, sFld, activeTargetNode.id, tFld, newJoinType);
    if (ok) {
      showNotification(
        `Relasi join berhasil dibuat: ${activeSourceNode.data.table}.${sFld} ↔ ${activeTargetNode.data.table}.${tFld}`,
        'success'
      );
      setJoinModalOpen(false);
    } else {
      showNotification('Relasi join tersebut sudah ada di kanvas.', 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 dark:bg-sky-400"></span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                Kelola Relasi Join Antar Tabel
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                Tentukan relasi join manual atau hapus relasi yang sudah ada
              </p>
            </div>
          </div>
          <button
            onClick={() => setJoinModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {nodes.length < 2 ? (
            <div className="p-6 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              Tambahkan minimal 2 tabel pada kanvas untuk membuat relasi join.
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-3">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                Buat Relasi Join Baru
              </div>

              {/* Table & Field Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source */}
                <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-sky-700 dark:text-sky-300 text-[11px] block">
                    1. Tabel Sumber:
                  </span>
                  <select
                    value={activeSourceNode?.id || ''}
                    onChange={(e) => {
                      setSrcNodeId(e.target.value);
                      const n = nodes.find((node) => node.id === e.target.value);
                      setSrcField(n?.data?.fields?.[0]?.fieldname || '');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 font-mono text-xs"
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.data.table}
                      </option>
                    ))}
                  </select>

                  <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px] block mt-1">
                    Kolom Sumber:
                  </span>
                  <select
                    value={srcField || sourceFields[0]?.fieldname || ''}
                    onChange={(e) => setSrcField(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 font-mono text-xs"
                  >
                    {sourceFields.map((f) => (
                      <option key={f.fieldname} value={f.fieldname}>
                        {f.fieldname} {f.fieldtext && f.fieldtext !== f.fieldname ? `— ${f.fieldtext}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target */}
                <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300 text-[11px] block">
                    2. Tabel Tujuan:
                  </span>
                  <select
                    value={activeTargetNode?.id || ''}
                    onChange={(e) => {
                      setTgtNodeId(e.target.value);
                      const n = nodes.find((node) => node.id === e.target.value);
                      setTgtField(n?.data?.fields?.[0]?.fieldname || '');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 font-mono text-xs"
                  >
                    {nodes
                      .filter((n) => n.id !== activeSourceNode?.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.data.table}
                        </option>
                      ))}
                  </select>

                  <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px] block mt-1">
                    Kolom Tujuan:
                  </span>
                  <select
                    value={tgtField || targetFields[0]?.fieldname || ''}
                    onChange={(e) => setTgtField(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 font-mono text-xs"
                  >
                    {targetFields.map((f) => (
                      <option key={f.fieldname} value={f.fieldname}>
                        {f.fieldname} {f.fieldtext && f.fieldtext !== f.fieldname ? `— ${f.fieldtext}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Join Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Tipe Join:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewJoinType('INNER')}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-left transition cursor-pointer ${
                      newJoinType === 'INNER'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 text-sky-800 dark:text-sky-200 ring-2 ring-sky-200 dark:ring-sky-800'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold">INNER JOIN</div>
                    <div className="text-[10px] text-slate-400">Hanya baris dengan kecocokan di kedua tabel</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewJoinType('LEFT OUTER')}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-left transition cursor-pointer ${
                      newJoinType === 'LEFT OUTER'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 text-sky-800 dark:text-sky-200 ring-2 ring-sky-200 dark:ring-sky-800'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold">LEFT OUTER JOIN</div>
                    <div className="text-[10px] text-slate-400">Semua baris tabel sumber + kecocokan tujuan</div>
                  </button>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateJoin}
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Buat Relasi Join
                </button>
              </div>
            </div>
          )}

          {/* Active Joins List */}
          {edges.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                Relasi Aktif di Kanvas ({edges.length})
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                {edges.map((e) => {
                  const sNode = nodes.find((n) => n.id === e.source);
                  const tNode = nodes.find((n) => n.id === e.target);
                  return (
                    <div
                      key={e.id}
                      className="p-2.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                          {sNode?.data.table}.{e.sourceHandle || e.data?.sourceField}
                        </span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                          {e.data?.joinType || 'INNER'} ↔
                        </span>
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          {tNode?.data.table}.{e.targetHandle || e.data?.targetField}
                        </span>
                      </div>
                      <button
                        onClick={() => removeEdge(e.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Hapus Relasi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0">
          <button
            onClick={() => setJoinModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
