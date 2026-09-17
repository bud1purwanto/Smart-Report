import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { getAutoJoin, getTableFields } from '../services/api';

export const useCanvasStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedFields: [], // [{ tableId, table, field, alias, datatype, isKey }]
  filters: [], // [{ field: "EKKO.BSART", operator: "EQ", value: "NB" }]
  tableMetadataCache: {},

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
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
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

  // Auto-Join Trigger when a table is added (RULE 2 COMPLIANCE)
  addTableNode: async (tableName, customPos = null) => {
    const { nodes, edges, selectedFields, tableMetadataCache } = get();
    const tableUpper = tableName.toUpperCase();

    // Fetch fields if not cached
    let fields = tableMetadataCache[tableUpper];
    if (!fields) {
      try {
        const res = await getTableFields(tableUpper);
        fields = res.data;
        set({ tableMetadataCache: { ...tableMetadataCache, [tableUpper]: fields } });
      } catch (e) {
        console.error('Failed to fetch table fields:', e);
        fields = [];
      }
    }

    const nodeId = `node_${tableUpper.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    const position = customPos || {
      x: 60 + nodes.length * 280,
      y: 60 + (nodes.length % 2) * 50,
    };

    const newNode = {
      id: nodeId,
      type: 'tableNode',
      position,
      data: {
        id: nodeId,
        table: tableUpper,
        fields,
      },
    };

    // Pre-select primary key fields
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

    // AUTO-JOIN LOGIC (RULE 2): Check existing nodes and auto-connect matching PK/FK
    const newEdges = [...edges];
    for (const existingNode of nodes) {
      const existingTable = existingNode.data.table;
      try {
        const ajRes = await getAutoJoin(existingTable, tableUpper);
        const suggestions = ajRes.data;
        if (suggestions && suggestions.length > 0) {
          const topJoin = suggestions[0];
          const edgeId = `e_${existingNode.id}_${nodeId}_${topJoin.source_field}`;
          // Check edge doesn't already exist
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
                description: topJoin.description,
              },
            });
          }
        }
      } catch (err) {
        console.warn(`Auto-join check between ${existingTable} and ${tableUpper} failed:`, err);
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

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e)),
    });
  },

  removeEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
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
          {
            tableId,
            table,
            field,
            fieldtext,
            alias: `${table}_${field}`,
            datatype,
            isKey,
          },
        ],
      });
    }
  },

  addFilter: (filter) => {
    set({ filters: [...get().filters, filter] });
  },

  updateFilter: (index, updatedFilter) => {
    const filters = [...get().filters];
    filters[index] = updatedFilter;
    set({ filters });
  },

  removeFilter: (index) => {
    set({ filters: get().filters.filter((_, i) => i !== index) });
  },

  clearFilters: () => {
    set({ filters: [] });
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [], selectedFields: [], filters: [] });
  },

  loadQueryDefinition: async (queryDef) => {
    const { tables = [], joins = [], selectedFields = [], filters = [] } = queryDef;

    // Load table nodes with metadata
    const loadedNodes = [];
    const metadataCache = { ...get().tableMetadataCache };

    for (const t of tables) {
      const tableUpper = t.table.toUpperCase();
      let fields = metadataCache[tableUpper];
      if (!fields) {
        try {
          const res = await getTableFields(tableUpper);
          fields = res.data;
          metadataCache[tableUpper] = fields;
        } catch {
          fields = [];
        }
      }
      loadedNodes.push({
        id: t.id,
        type: 'tableNode',
        position: t.position || { x: 80, y: 80 },
        data: { id: t.id, table: tableUpper, fields },
      });
    }

    const loadedEdges = joins.map((j) => ({
      id: j.id || `e_${j.sourceTableId}_${j.targetTableId}_${j.sourceField}`,
      source: j.sourceTableId,
      target: j.targetTableId,
      sourceHandle: j.sourceField,
      targetHandle: j.targetField,
      type: 'smoothstep',
      animated: true,
      data: {
        joinType: j.joinType || 'INNER',
        sourceField: j.sourceField,
        targetField: j.targetField,
      },
    }));

    set({
      nodes: loadedNodes,
      edges: loadedEdges,
      selectedFields,
      filters,
      tableMetadataCache: metadataCache,
    });
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
}));

