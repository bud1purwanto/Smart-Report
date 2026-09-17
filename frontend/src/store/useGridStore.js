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
    });
  },
}));

