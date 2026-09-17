import { create } from 'zustand';
import { getServers } from '../services/api';

export const useAppStore = create((set, get) => ({
  activeTab: 'studio', // 'studio' | 'compare' | 'schedules' | 'servers'
  servers: [],
  activeServer: null,
  currentQueryId: 1,
  currentQueryName: 'PO Price Variance Analysis',

  // Modals
  aiModalOpen: false,
  tableCatalogOpen: false,
  variantModalOpen: false,
  formulaModalOpen: false,
  joinModalOpen: false,
  activeEdgeForEdit: null,
  notification: null,

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
        // Default to Sandbox New Company or first active
        const def = list.find((s) => s.name.includes('Sandbox New Company')) || list[0];
        set({ activeServer: def });
      }
    } catch (e) {
      console.error('Failed to load SAP server profiles:', e);
    }
  },
}));

