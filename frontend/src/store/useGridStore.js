import { create } from 'zustand';

export const useGridStore = create((set, get) => ({
  rowData: [],
  columnDefs: [],
  columns: [],
  customColumns: [], // [{ name: "TOTAL", formula: "row['NETPR'] * row['MENGE']" }]
  totalRows: 0,
  executionTimeMs: 0,
  abapSql: '',
  isExecuting: false,
  error: null,

  // Variants
  variants: [],
  activeVariant: null,

  // Anonymization & deduplication toggles
  anonymize: false,
  deduplicate: false,

  // Pivot / Transpose State
  isPivoted: false,
  pivotConfig: null, // { indexColumns: [], pivotColumn: '', valueColumn: '', aggFunc: 'first' }
  rawRowData: [],
  rawColumnDefs: [],
  rawColumns: [],
  rawTotalRows: 0,

  // Viewport display mode: 'canvas' (Full Canvas) | 'split' (Canvas + ALV) | 'grid' (Full ALV)
  viewMode: 'canvas',
  setViewMode: (val) => set({ viewMode: val }),

  setGridData: ({ columns, column_defs, rows, total_rows, execution_time_ms, abap_sql }) => {
    set({
      columns: columns || [],
      columnDefs: column_defs || [],
      rowData: rows || [],
      totalRows: total_rows || 0,
      executionTimeMs: execution_time_ms || 0,
      abapSql: abap_sql || '',
      isExecuting: false,
      error: null,
      viewMode: 'split', // Automatically open ALV results when query completes
      // Reset pivot state on fresh query execution
      isPivoted: false,
      pivotConfig: null,
      rawRowData: [],
      rawColumnDefs: [],
      rawColumns: [],
      rawTotalRows: 0,
    });
  },

  setIsExecuting: (val) => set({
    isExecuting: val,
    ...(val ? { viewMode: 'split' } : {})
  }),
  setError: (err) => set({ error: err, isExecuting: false }),
  setAnonymize: (val) => set({ anonymize: val }),
  setDeduplicate: (val) => set({ deduplicate: val }),

  addCustomColumn: (name, formula) => {
    const { customColumns, columnDefs, rowData } = get();
    const newCol = { name, formula, datatype: 'number' };
    const updatedCustom = [...customColumns.filter((c) => c.name !== name), newCol];

    // Compute preview value for rows
    const updatedRows = rowData.map((row) => {
      try {
        // Safe row evaluation
        const evalVal = Function('row', `try { return (${formula}); } catch(e) { return null; }`)(row);
        return { ...row, [name]: evalVal };
      } catch {
        return { ...row, [name]: null };
      }
    });

    const newColDef = {
      field: name,
      headerName: `fx: ${name}`,
      sortable: true,
      filter: true,
      cellClass: 'bg-indigo-950/30 text-indigo-300 font-mono font-semibold',
    };

    set({
      customColumns: updatedCustom,
      columnDefs: [...columnDefs, newColDef],
      columns: [...get().columns, name],
      rowData: updatedRows,
    });
  },

  removeCustomColumn: (name) => {
    set({
      customColumns: get().customColumns.filter((c) => c.name !== name),
      columnDefs: get().columnDefs.filter((cd) => cd.field !== name),
      columns: get().columns.filter((c) => c !== name),
    });
  },

  setVariants: (variants) => set({ variants }),
  setActiveVariant: (variant) => set({ activeVariant: variant }),

  applyVariant: (variant) => {
    if (!variant) return;
    const { columnDefs } = get();
    const order = variant.column_order || [];
    const hidden = new Set(variant.hidden_columns || []);

    let newDefs = [...columnDefs];
    // Reorder
    if (order.length > 0) {
      newDefs.sort((a, b) => {
        const idxA = order.indexOf(a.field);
        const idxB = order.indexOf(b.field);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    // Apply visibility
    newDefs = newDefs.map((col) => ({
      ...col,
      hide: hidden.has(col.field),
    }));

    set({
      columnDefs: newDefs,
      activeVariant: variant,
      customColumns: variant.custom_columns || [],
    });
  },

  // Pivot / Transpose Engine
  applyPivot: ({ indexColumns, pivotColumn, valueColumn, aggFunc = 'first' }) => {
    const { isPivoted, rowData, columnDefs, columns, totalRows, rawRowData, rawColumnDefs, rawColumns, rawTotalRows } = get();

    if (!indexColumns || indexColumns.length === 0 || !pivotColumn || !valueColumn) {
      return { success: false, message: 'Harap tentukan minimal 1 kolom baris tetap, 1 kolom pivot, dan 1 kolom nilai.' };
    }

    // Source data to pivot from (preserve raw data if first time pivoting)
    const sourceRows = isPivoted ? rawRowData : rowData;
    const sourceColDefs = isPivoted ? rawColumnDefs : columnDefs;
    const sourceCols = isPivoted ? rawColumns : columns;
    const sourceTotal = isPivoted ? rawTotalRows : totalRows;

    if (!sourceRows || sourceRows.length === 0) {
      return { success: false, message: 'Tidak ada data di ALV Grid untuk di-pivot.' };
    }

    // 1. Identify distinct values of pivotColumn (sorted alphabetically)
    const pivotHeaderSet = new Set();
    sourceRows.forEach((row) => {
      const val = row[pivotColumn];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        pivotHeaderSet.add(String(val).trim());
      }
    });

    const distinctPivotHeaders = Array.from(pivotHeaderSet).sort();
    if (distinctPivotHeaders.length === 0) {
      return { success: false, message: `Kolom '${pivotColumn}' tidak memiliki nilai unik untuk dijadikan header kolom.` };
    }

    // 2. Group by indexColumns composite key
    const groupedMap = new Map();

    sourceRows.forEach((row) => {
      const groupKey = indexColumns.map((c) => String(row[c] ?? '')).join('§§__§§');

      if (!groupedMap.has(groupKey)) {
        const initialObj = {};
        indexColumns.forEach((c) => {
          initialObj[c] = row[c] ?? null;
        });
        distinctPivotHeaders.forEach((h) => {
          initialObj[h] = null;
        });
        groupedMap.set(groupKey, initialObj);
      }

      const currentGroup = groupedMap.get(groupKey);
      const rawPivotVal = row[pivotColumn];
      if (rawPivotVal !== undefined && rawPivotVal !== null && String(rawPivotVal).trim() !== '') {
        const pivotHeader = String(rawPivotVal).trim();
        const cellVal = row[valueColumn];

        if (cellVal !== undefined && cellVal !== null) {
          const currentVal = currentGroup[pivotHeader];
          if (aggFunc === 'first') {
            if (currentVal === null || currentVal === undefined) {
              currentGroup[pivotHeader] = cellVal;
            }
          } else if (aggFunc === 'last') {
            currentGroup[pivotHeader] = cellVal;
          } else if (aggFunc === 'sum') {
            const numVal = Number(cellVal) || 0;
            currentGroup[pivotHeader] = (Number(currentVal) || 0) + numVal;
          } else if (aggFunc === 'count') {
            currentGroup[pivotHeader] = (Number(currentVal) || 0) + 1;
          } else if (aggFunc === 'concat') {
            currentGroup[pivotHeader] = currentVal ? `${currentVal}, ${cellVal}` : String(cellVal);
          } else {
            if (currentVal === null || currentVal === undefined) {
              currentGroup[pivotHeader] = cellVal;
            }
          }
        }
      }
    });

    const pivotedRows = Array.from(groupedMap.values());

    // 3. Build new columnDefs
    const indexColDefs = indexColumns.map((colName) => {
      const existing = sourceColDefs.find((cd) => cd.field === colName);
      if (existing) {
        return {
          ...existing,
          pinned: 'left',
        };
      }
      return {
        field: colName,
        headerName: colName,
        sortable: true,
        filter: true,
        resizable: true,
        pinned: 'left',
      };
    });

    const pivotedColDefs = distinctPivotHeaders.map((header) => ({
      field: header,
      headerName: header,
      headerTooltip: `Pivoted: ${pivotColumn} = ${header} (${valueColumn})`,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 140,
      cellClass: 'bg-purple-50/40 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300 font-medium',
      headerClass: 'bg-purple-100/70 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 font-bold',
    }));

    const newColumnDefs = [...indexColDefs, ...pivotedColDefs];
    const newColumns = [...indexColumns, ...distinctPivotHeaders];

    set({
      rawRowData: isPivoted ? rawRowData : sourceRows,
      rawColumnDefs: isPivoted ? rawColumnDefs : sourceColDefs,
      rawColumns: isPivoted ? rawColumns : sourceCols,
      rawTotalRows: isPivoted ? rawTotalRows : sourceTotal,
      rowData: pivotedRows,
      columnDefs: newColumnDefs,
      columns: newColumns,
      totalRows: pivotedRows.length,
      isPivoted: true,
      pivotConfig: { indexColumns, pivotColumn, valueColumn, aggFunc },
    });

    return { success: true, count: pivotedRows.length, newColsCount: distinctPivotHeaders.length };
  },

  resetPivot: () => {
    const { isPivoted, rawRowData, rawColumnDefs, rawColumns, rawTotalRows } = get();
    if (!isPivoted) return;

    set({
      rowData: rawRowData,
      columnDefs: rawColumnDefs,
      columns: rawColumns,
      totalRows: rawTotalRows,
      isPivoted: false,
      pivotConfig: null,
      rawRowData: [],
      rawColumnDefs: [],
      rawColumns: [],
      rawTotalRows: 0,
    });
  },

  clearGrid: () => {
    set({
      rowData: [],
      columnDefs: [],
      columns: [],
      customColumns: [],
      totalRows: 0,
      executionTimeMs: 0,
      abapSql: '',
      error: null,
      viewMode: 'canvas', // Return to full canvas
      isPivoted: false,
      pivotConfig: null,
      rawRowData: [],
      rawColumnDefs: [],
      rawColumns: [],
      rawTotalRows: 0,
    });
  },
}));

