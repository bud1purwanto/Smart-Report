import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { getAutoJoin, getTableFields, syncTableMetadata, compareServers } from '../services/api';

export const useCompareStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedFields: [],
  filters: [],
  tableMetadataCache: {},

  // Server selection
  serverAId: null,
  serverBId: null,
  keyFields: [],

  // Diff Execution State
  isComparing: false,
  compareResult: null,
  error: null,
  filterStatus: 'ALL', // 'ALL' | 'MODIFIED' | 'ADDED_IN_B' | 'DELETED_IN_B' | 'IDENTICAL'
  inspectRow: null,
  compareViewMode: 'canvas', // 'canvas' | 'split' | 'results'

  setServers: (serverAId, serverBId) => set({ serverAId, serverBId }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setInspectRow: (row) => set({ inspectRow: row }),
  setCompareViewMode: (compareViewMode) => set({ compareViewMode }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const newEdge = {
      ...connection,
      id: `cmp-e-${connection.source}-${connection.target}-${Date.now()}`,
      type: 'smoothstep',
      animated: true,
      data: {
        joinType: 'INNER',
        sourceField: connection.sourceHandle,
        targetField: connection.targetHandle,
      },
    };
    set({ edges: [...get().edges, newEdge] });
  },

  addTableNode: async (tableName, customPos = null) => {
    const { nodes, edges, selectedFields, tableMetadataCache, serverAId } = get();
    const tableUpper = tableName.toUpperCase();

    let fields = tableMetadataCache[tableUpper];
    if (!fields) {
      try {
        const res = await getTableFields(tableUpper);
        fields = res.data;
        set({ tableMetadataCache: { ...tableMetadataCache, [tableUpper]: fields } });
      } catch (e) {
        // Auto-sync table metadata from SAP if not in local cache
        try {
          await syncTableMetadata(tableUpper, serverAId || 1);
          const res2 = await getTableFields(tableUpper);
          fields = res2.data;
          set({ tableMetadataCache: { ...tableMetadataCache, [tableUpper]: fields } });
        } catch (syncErr) {
          console.warn('Failed to sync metadata for', tableUpper, syncErr);
          fields = [];
        }
      }
    }

    const nodeId = `cmp_node_${tableUpper.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    const position = customPos || {
      x: 60 + nodes.length * 280,
      y: 60 + (nodes.length % 2) * 50,
    };

    const newNode = {
      id: nodeId,
      type: 'compareTableNode',
      position,
      data: {
        id: nodeId,
        table: tableUpper,
        fields,
      },
    };

    const newSelectedFields = [...selectedFields];
    fields.filter((f) => f.keyflag === 'X').forEach((f) => {
      newSelectedFields.push({
        tableId: nodeId,
        table: tableUpper,
        field: f.fieldname,
        fieldtext: f.fieldtext || '',
        alias: `${tableUpper}_${f.fieldname}`,
        datatype: f.datatype,
        isKey: true,
      });
    });

    // Auto-Join in Compare Canvas
    const newEdges = [...edges];
    for (const existingNode of nodes) {
      const existingTable = existingNode.data.table;
      try {
        const ajRes = await getAutoJoin(existingTable, tableUpper);
        const suggestions = ajRes.data;
        if (suggestions && suggestions.length > 0) {
          const topJoin = suggestions[0];
          const edgeId = `cmp_e_${existingNode.id}_${nodeId}_${topJoin.source_field}`;
          const exists = newEdges.some(
            (e) =>
              (e.source === existingNode.id && e.target === nodeId) ||
              (e.source === nodeId && e.target === existingNode.id)
          );
          if (!exists) {
            newEdges.push({
              id: edgeId,
              source: existingNode.id,
              target: nodeId,
              sourceHandle: topJoin.source_field,
              targetHandle: topJoin.target_field,
              type: 'smoothstep',
              animated: true,
              data: {
                joinType: topJoin.join_type || 'INNER',
                sourceField: topJoin.source_field,
                targetField: topJoin.target_field,
              },
            });
          }
        }
      } catch (err) {
        console.warn('Compare auto-join failed:', err);
      }
    }

    set({
      nodes: [...nodes, newNode],
      edges: newEdges,
      selectedFields: newSelectedFields,
    });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedFields: get().selectedFields.filter((f) => f.tableId !== nodeId),
    });
  },

  toggleFieldSelection: (tableId, table, field, isKey = false, datatype = 'CHAR', fieldtext = '') => {
    const { selectedFields } = get();
    const index = selectedFields.findIndex((f) => f.tableId === tableId && f.field === field);
    if (index >= 0) {
      set({ selectedFields: selectedFields.filter((_, i) => i !== index) });
    } else {
      set({
        selectedFields: [
          ...selectedFields,
          { tableId, table, field, fieldtext, alias: `${table}_${field}`, datatype, isKey },
        ],
      });
    }
  },

  addFilter: (filter) => {
    set({ filters: [...get().filters, filter] });
  },

  removeFilter: (index) => {
    set({ filters: get().filters.filter((_, i) => i !== index) });
  },

  clearFilters: () => {
    set({ filters: [] });
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [], selectedFields: [], filters: [], compareResult: null });
  },

  getQueryDefinition: () => {
    const { nodes, edges, selectedFields, filters } = get();
    return {
      tables: nodes.map((n) => ({
        id: n.id,
        table: n.data.table,
        position: n.position,
      })),
      joins: edges.map((e) => ({
        id: e.id,
        sourceTableId: e.source,
        targetTableId: e.target,
        sourceField: e.data?.sourceField || e.sourceHandle,
        targetField: e.data?.targetField || e.targetHandle,
        joinType: e.data?.joinType || 'INNER',
      })),
      selectedFields,
      filters,
      options: { rowcount: 200 },
    };
  },

  executeCompare: async () => {
    const { serverAId, serverBId, getQueryDefinition } = get();
    const query = getQueryDefinition();
    if (!query.tables || query.tables.length === 0) {
      throw new Error('Tambahkan minimal satu tabel di kanvas komparasi.');
    }
    if (!serverAId || !serverBId) {
      throw new Error('Pilih Server A dan Server B terlebih dahulu.');
    }
    if (serverAId === serverBId) {
      throw new Error('Server A dan Server B harus berbeda.');
    }

    set({ isComparing: true, error: null });
    try {
      const res = await compareServers({
        server_a_id: serverAId,
        server_b_id: serverBId,
        query,
        rowcount: 100,
      });
      set({ compareResult: res.data, isComparing: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      set({ error: typeof msg === 'object' ? JSON.stringify(msg) : msg, isComparing: false });
      throw err;
    }
  },
}));

