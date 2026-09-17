import React, { useState, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key, Trash2, Search, CheckSquare, Square } from 'lucide-react';
import { useCompareStore } from '../../store/useCompareStore';

export const CompareTableNode = memo(({ id, data }) => {
  const { table, fields = [] } = data;
  const [filterText, setFilterText] = useState('');
  const { removeNode, selectedFields, toggleFieldSelection } = useCompareStore();

  const isFieldSelected = (fieldName) => {
    return selectedFields.some((f) => f.tableId === id && f.field === fieldName);
  };

  const filteredFields = fields.filter(
    (f) =>
      f.fieldname.toLowerCase().includes(filterText.toLowerCase()) ||
      (f.fieldtext && f.fieldtext.toLowerCase().includes(filterText.toLowerCase()))
  );

  const selectedCount = fields.filter((f) => isFieldSelected(f.fieldname)).length;

  return (
    <div className="w-68 rounded-2xl border border-purple-200 bg-white shadow-lg shadow-purple-100/40 overflow-hidden font-sans transition-all duration-150 hover:border-purple-300">
      {/* Node Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50/50 border-b border-purple-100 px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center text-[11px] font-mono font-black shadow-xs">
            C
          </span>
          <div>
            <div className="font-extrabold text-xs text-slate-800 font-mono tracking-wide">{table}</div>
            <div className="text-[10px] text-slate-400 font-medium">
              {selectedCount} / {fields.length} kolom komparasi
            </div>
          </div>
        </div>
        <button
          onClick={() => removeNode(id)}
          className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition"
          title="Hapus Tabel Komparasi"
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
            className="w-full bg-white border border-slate-200 rounded-lg px-2 pl-7 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-purple-500 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Field List */}
      <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 text-[11px]">
        {filteredFields.map((field) => {
          const isSelected = isFieldSelected(field.fieldname);
          const isKey = field.keyflag === 'X';

          return (
            <div
              key={field.fieldname}
              className={`relative px-3.5 py-1.5 flex items-center justify-between group transition ${
                isSelected ? 'bg-purple-50/80 text-purple-950 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {/* Target Handle (Left Port for Joins) */}
              <Handle
                type="target"
                position={Position.Left}
                id={field.fieldname}
                className="!bg-purple-500 !w-2.5 !h-2.5 !border-white"
              />

              <div
                className="flex items-center gap-2 cursor-pointer select-none overflow-hidden"
                onClick={() => toggleFieldSelection(id, table, field.fieldname, isKey, field.datatype)}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 shrink-0" />
                )}
                <span className="font-mono text-slate-700 truncate">{field.fieldname}</span>
                {isKey && (
                  <span title="Primary Key">
                    <Key className="w-3 h-3 text-amber-500 shrink-0" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
                <span className="font-mono">{field.datatype}</span>
              </div>

              {/* Source Handle (Right Port for Joins) */}
              <Handle
                type="source"
                position={Position.Right}
                id={field.fieldname}
                className="!bg-purple-500 !w-2.5 !h-2.5 !border-white"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
