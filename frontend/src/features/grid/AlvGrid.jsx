import React, { useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { useGridStore } from '../../store/useGridStore';
import { Play, Database, ShieldAlert } from 'lucide-react';

export const AlvGrid = () => {
  const gridRef = useRef(null);
  const {
    rowData,
    columnDefs,
    isExecuting,
    error,
  } = useGridStore();

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
    }),
    []
  );

  // Track column reordering (RULE 2 COMPLIANCE)
  const onColumnMoved = useCallback(() => {
    if (!gridRef.current?.api) return;
    const allCols = gridRef.current.api.getAllGridColumns();
    const newOrder = allCols.map((col) => col.getColId());
    // Store in grid store
  }, []);

  return (
    <div className="w-full h-full relative bg-white dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {/* Loading Overlay */}
      {isExecuting && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xs space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-600 dark:border-sky-400 border-t-transparent animate-spin"></div>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold tracking-wide">
            Mengambil data dari SAP via MCP Gateway...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="m-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Grid or Empty State */}
      {rowData.length > 0 ? (
        <div className="ag-theme-quartz flex-1 w-full">
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowBuffer={20}
            animateRows={true}
            suppressMovableColumns={false}
            onColumnMoved={onColumnMoved}
            pagination={true}
            paginationPageSize={100}
            paginationPageSizeSelector={[50, 100, 200, 500]}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs space-y-2 select-none bg-slate-50/50 dark:bg-slate-950/50">
          <Database className="w-10 h-10 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">Belum ada data untuk ditampilkan</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm text-center">
            Klik tombol <b className="text-sky-600 dark:text-sky-400 font-bold">Run Query</b> di kanan atas untuk mengeksekusi visual query ke SAP.
          </p>
        </div>
      )}
    </div>
  );
};

