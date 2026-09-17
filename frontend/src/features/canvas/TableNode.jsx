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
    <div className="w-68 rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/40 overflow-hidden font-sans transition-all duration-150 hover:border-sky-300">
      {/* Node Header */}
      <div className="bg-gradient-to-r from-slate-50 to-sky-50/50 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-sky-600 text-white flex items-center justify-center text-[11px] font-mono font-black shadow-xs">
            T
          </span>
          <div>
            <div className="font-extrabold text-xs text-slate-800 font-mono tracking-wide">{table}</div>
            <div className="text-[10px] text-slate-400 font-medium">
              {selectedCount} / {fields.length} kolom dipilih
            </div>
          </div>
        </div>
        <button
          onClick={() => removeNode(id)}
          className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition"
          title="Hapus Tabel"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Field Filter Input */}
      <div className="p-2 border-b border-slate-100 bg-slate-50/60">
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Cari kolom..."
            className="w-full bg-white border border-slate-200 rounded-lg px-2 pl-7 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-sky-500 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Field List */}
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-[11px]">
        {filteredFields.map((field) => {
          const isSelected = isFieldSelected(field.fieldname);
          const isKey = field.keyflag === 'X';

          return (
            <div
              key={field.fieldname}
              className={`relative px-3.5 py-1.5 flex items-center justify-between group transition ${
                isSelected ? 'bg-sky-50/80 text-sky-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {/* Target Handle (Left Port for Joins) */}
              <Handle
                type="target"
                position={Position.Left}
                id={field.fieldname}
                className="!bg-sky-500 !w-2.5 !h-2.5 !border-white"
              />

              <div
                className="flex items-center gap-2 cursor-pointer select-none overflow-hidden"
                onClick={() => toggleFieldSelection(id, table, field.fieldname, isKey, field.datatype)}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300 shrink-0 group-hover:text-slate-400" />
                )}

                <div className="flex items-center gap-1.5 truncate">
                  {isKey && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
                  <span className={`font-mono text-xs ${isKey ? 'font-bold text-amber-800' : ''}`}>
                    {field.fieldname}
                  </span>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                {field.datatype || 'CHAR'} {field.leng ? field.leng : ''}
              </span>

              {/* Source Handle (Right Port for Joins) */}
              <Handle
                type="source"
                position={Position.Right}
                id={field.fieldname}
                className="!bg-sky-500 !w-2.5 !h-2.5 !border-white"
              />
            </div>
          );
        })}
        {filteredFields.length === 0 && (
          <div className="p-3 text-center text-slate-400 text-[11px]">Kolom tidak ditemukan</div>
        )}
      </div>

      {/* Node Footer */}
      <div className="bg-slate-50/80 border-t border-slate-100 px-3.5 py-1.5 flex items-center justify-between text-[10px] text-slate-500">
        <button
          onClick={handleSelectAll}
          className="text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
        >
          {selectedCount === fields.length ? 'Batal Semua' : 'Pilih Semua'}
        </button>
        <span className="font-mono text-slate-400">Total {fields.length}</span>
      </div>
    </div>
  );
});
