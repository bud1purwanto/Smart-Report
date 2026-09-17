import { create } from 'zustand';
import { getServers, getQueries, getQuery } from '../services/api';
import { useCanvasStore } from './useCanvasStore';
import { useGridStore } from './useGridStore';

export const useAppStore = create((set, get) => ({
  activeTab: 'studio', // 'studio' | 'compare' | 'schedules' | 'servers'
  servers: [],
  activeServer: null,
  savedQueries: [],
  currentQueryId: null,
  currentQueryName: 'New QuickView Query',

  // Modals
  aiModalOpen: false,
  tableCatalogOpen: false,
  variantModalOpen: false,
  formulaModalOpen: false,
  joinModalOpen: false,
  activeEdgeForEdit: null,
  notification: null,

  // Theme State ('light' | 'dark')
  theme: localStorage.getItem('smart_sqvi_theme') || 'light',

  initTheme: () => {
    const saved = localStorage.getItem('smart_sqvi_theme') || 'light';
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: saved });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('smart_sqvi_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: nextTheme });
    get().showNotification(`Mode diubah ke ${nextTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`, 'info');
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentQuery: (id, name) => set({ currentQueryId: id, currentQueryName: name }),
  setActiveServer: (server) => set({ activeServer: server }),
  setAiModalOpen: (val) => set({ aiModalOpen: val }),
  setTableCatalogOpen: (val) => set({ tableCatalogOpen: val }),
  setVariantModalOpen: (val) => set({ variantModalOpen: val }),
  setFormulaModalOpen: (val) => set({ formulaModalOpen: val }),
  setJoinModalOpen: (val, edge = null) => set({ joinModalOpen: val, activeEdgeForEdit: edge }),

  showNotification: (msg, type = 'info') => {
    set({ notification: { message: msg, type } });
    setTimeout(() => {
      set({ notification: null });
    }, 4000);
  },

  loadServers: async () => {
    try {
      const res = await getServers();
      const list = res.data || [];
      set({ servers: list });
      if (!get().activeServer && list.length > 0) {
        const def = list.find((s) => s.name.includes('Sandbox New Company')) || list[0];
        set({ activeServer: def });
      }
    } catch (e) {
      console.error('Failed to load SAP server profiles:', e);
    }
  },

  loadSavedQueries: async () => {
    try {
      const res = await getQueries();
      set({ savedQueries: res.data || [] });
    } catch (e) {
      console.error('Failed to load saved queries:', e);
    }
  },

  // Per-Project SQVI: Clear Canvas & Create New Query
  createNewProject: () => {
    useCanvasStore.getState().clearCanvas();
    useGridStore.getState().clearGrid();
    set({
      currentQueryId: null,
      currentQueryName: 'New QuickView Query',
    });
    get().showNotification('Kanvas dikosongkan. Siap membuat project query baru.', 'info');
  },

  // Per-Project SQVI: Select & Load Project Query
  selectProject: async (queryId) => {
    if (!queryId) return;
    try {
      const res = await getQuery(queryId);
      const q = res.data;
      if (q) {
        set({
          currentQueryId: q.id,
          currentQueryName: q.name,
        });
        useGridStore.getState().clearGrid();
        if (q.query_json) {
          await useCanvasStore.getState().loadQueryDefinition(q.query_json);
        }
        get().showNotification(`Project query "${q.name}" berhasil dimuat.`, 'success');
      }
    } catch (e) {
      get().showNotification('Gagal memuat query: ' + e.message, 'error');
    }
  },
}));
