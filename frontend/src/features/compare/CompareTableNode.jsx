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
    <div className="w-84 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 shadow-xl shadow-purple-100/40 dark:shadow-black/60 overflow-hidden font-sans transition-all duration-150 hover:border-purple-300 dark:hover:border-purple-500 nowheel">
      {/* Node Header */}
      <div className="bg-gradient-to-r from-purple-50 dark:from-slate-800 to-indigo-50/50 dark:to-purple-950/40 border-b border-purple-100 dark:border-purple-900/60 px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center text-[11px] font-mono font-black shadow-xs">
            C
          </span>
          <div>
            <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100 font-mono tracking-wide">{table}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {selectedCount} / {fields.length} kolom dipilih
            </div>
          </div>
        </div>
        <button
          onClick={() => removeNode(id)}
          className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
          title="Hapus Tabel Komparasi"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Field Filter Input */}
      <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Cari kolom atau deskripsi..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 pl-7 py-1 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-purple-500 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Field List (Scrollable, nowheel enabled, no horizontal scrollbar cutoff) */}
      <div
        className="max-h-80 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 dark:divide-slate-800 text-[11px] nowheel select-none"
        onWheel={(e) => e.stopPropagation()}
      >
        {filteredFields.map((field) => {
          const isSelected = isFieldSelected(field.fieldname);
          const isKey = field.keyflag === 'X';
          const fullLabel = field.fieldtext ? `${field.fieldname} - ${field.fieldtext}` : field.fieldname;

          return (
            <div
              key={field.fieldname}
              className={`relative pl-6 pr-6 py-1.5 flex items-center justify-between group transition ${
                isSelected ? 'bg-purple-50/80 dark:bg-purple-950/50 text-purple-950 dark:text-purple-200 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {/* Target Handle (Left Port for Joins) */}
              <Handle
                type="target"
                position={Position.Left}
                id={field.fieldname}
                className="!w-3 !h-3 !rounded-full !bg-purple-500 hover:!bg-amber-400 hover:!scale-150 !border-2 !border-white dark:!border-slate-900 transition-all cursor-crosshair shadow-sm z-20"
                style={{ left: '6px', top: '50%', transform: 'translateY(-50%)' }}
                title={`Tarik garis relasi join (Drag & Drop) dari/ke kolom ${field.fieldname}`}
              />

              <div
                className="flex items-center gap-2 cursor-pointer select-none overflow-hidden flex-1 min-w-0 mr-2"
                onClick={() => toggleFieldSelection(id, table, field.fieldname, isKey, field.datatype, field.fieldtext || '')}
                title={fullLabel}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-400" />
                )}

                <div className="flex items-center gap-1.5 truncate min-w-0">
                  {isKey && <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  <span className={`font-mono text-xs shrink-0 ${isKey ? 'font-bold text-amber-800 dark:text-amber-400' : ''}`}>
                    {field.fieldname}
                  </span>
                  {field.fieldtext && field.fieldtext !== field.fieldname && (
                    <span className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate font-sans font-normal ml-0.5" title={field.fieldtext}>
                      {field.fieldtext}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0 ml-auto whitespace-nowrap">
                {field.datatype || 'CHAR'}{field.leng ? ` ${field.leng}` : ''}
              </span>

              {/* Source Handle (Right Port for Joins) */}
              <Handle
                type="source"
                position={Position.Right}
                id={field.fieldname}
                className="!w-3 !h-3 !rounded-full !bg-purple-500 hover:!bg-amber-400 hover:!scale-150 !border-2 !border-white dark:!border-slate-900 transition-all cursor-crosshair shadow-sm z-20"
                style={{ right: '6px', top: '50%', transform: 'translateY(-50%)' }}
                title={`Tarik garis relasi join (Drag & Drop) dari/ke kolom ${field.fieldname}`}
              />
            </div>
          );
        })}
        {filteredFields.length === 0 && (
          <div className="p-3 text-center text-slate-400 dark:text-slate-500 text-[11px]">Kolom tidak ditemukan</div>
        )}
      </div>

      {/* Node Footer */}
      <div className="bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 px-3.5 py-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <button
          onClick={handleSelectAll}
          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold cursor-pointer"
        >
          {selectedCount === fields.length ? 'Batal Semua' : 'Pilih Semua'}
        </button>
        <span className="font-mono text-slate-400 dark:text-slate-500">Total {fields.length}</span>
      </div>
    </div>
  );
});

