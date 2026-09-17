import React, { useState, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key, Trash2, Search, CheckSquare, Square } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

export const TableNode = memo(({ id, data }) => {
  const { table, fields = [] } = data;
  const [filterText, setFilterText] = useState('');
  const { removeNode, selectedFields, toggleFieldSelection } = useCanvasStore();

  const isFieldSelected = (fieldName) => {
    return selectedFields.some((f) => f.tableId === id && f.field === fieldName);
  };

  const filteredFields = fields.filter(
    (f) =>
      f.fieldname.toLowerCase().includes(filterText.toLowerCase()) ||
      (f.fieldtext && f.fieldtext.toLowerCase().includes(filterText.toLowerCase()))
  );

  const selectedCount = fields.filter((f) => isFieldSelected(f.fieldname)).length;

  const handleSelectAll = () => {
    const allSelected = fields.every((f) => isFieldSelected(f.fieldname));
    fields.forEach((f) => {
      const selected = isFieldSelected(f.fieldname);
      if (allSelected && selected) {
        toggleFieldSelection(id, table, f.fieldname, f.keyflag === 'X', f.datatype);
      } else if (!allSelected && !selected) {
        toggleFieldSelection(id, table, f.fieldname, f.keyflag === 'X', f.datatype);
      }
    });
  };

  return (
    <div className="w-64 rounded-xl border border-slate-700/80 bg-slate-900/95 shadow-2xl overflow-hidden backdrop-blur font-sans">
      {/* Node Header */}
      <div className="bg-slate-800/90 border-b border-slate-700/80 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center text-xs font-mono font-bold">
            T
          </span>
          <div>
            <div className="font-bold text-xs text-slate-100 font-mono tracking-wide">{table}</div>
            <div className="text-[10px] text-slate-400">
              {selectedCount} / {fields.length} terpilih
            </div>
          </div>
        </div>
        <button
          onClick={() => removeNode(id)}
          className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-700/50 transition"
          title="Hapus Tabel"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Field Filter Input */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-950/40">
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Cari field..."
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded px-2 pl-6 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500 transition"
          />
        </div>
      </div>

      {/* Field List */}
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/40 text-[11px]">
        {filteredFields.map((field) => {
          const isSelected = isFieldSelected(field.fieldname);
          const isKey = field.keyflag === 'X';

          return (
            <div
              key={field.fieldname}
              className={`relative px-3 py-1.5 flex items-center justify-between group transition ${
                isSelected ? 'bg-sky-500/10 text-sky-200' : 'text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              {/* Target Handle (Left Port for Joins) */}
              <Handle
                type="target"
                position={Position.Left}
                id={field.fieldname}
                className="!bg-sky-400 !w-2.5 !h-2.5 !border-slate-900"
              />

              <div
                className="flex items-center gap-2 cursor-pointer select-none overflow-hidden"
                onClick={() => toggleFieldSelection(id, table, field.fieldname, isKey, field.datatype)}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-600 shrink-0 group-hover:text-slate-400" />
                )}

                <div className="flex items-center gap-1.5 truncate">
                  {isKey && <Key className="w-3 h-3 text-amber-400 shrink-0" />}
                  <span className={`font-mono ${isKey ? 'font-bold text-amber-300' : ''}`}>
                    {field.fieldname}
                  </span>
                </div>
              </div>

              <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                {field.datatype || 'CHAR'} {field.leng ? field.leng : ''}
              </span>

              {/* Source Handle (Right Port for Joins) */}
              <Handle
                type="source"
                position={Position.Right}
                id={field.fieldname}
                className="!bg-sky-400 !w-2.5 !h-2.5 !border-slate-900"
              />
            </div>
          );
        })}
        {filteredFields.length === 0 && (
          <div className="p-3 text-center text-slate-500 text-[11px]">Tidak ada field cocok</div>
        )}
      </div>

      {/* Node Footer */}
      <div className="bg-slate-800/60 border-t border-slate-800 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400">
        <button
          onClick={handleSelectAll}
          className="text-sky-400 hover:underline font-medium"
        >
          {selectedCount === fields.length ? 'Batal Semua' : 'Pilih Semua'}
        </button>
        <span>DDIC: {fields.length} fields</span>
      </div>
    </div>
  );
});

