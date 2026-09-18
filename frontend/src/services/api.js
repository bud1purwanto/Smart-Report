import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    const payload = detail && typeof detail === 'object' ? detail : error.response?.data;
    error.normalized = {
      code: payload?.code || (error.code === 'ECONNABORTED' ? 'REQUEST_TIMEOUT' : 'REQUEST_FAILED'),
      message: payload?.message || (typeof detail === 'string' ? detail : error.message) || 'Permintaan gagal diproses.',
      correlationId: payload?.correlation_id || error.response?.headers?.['x-correlation-id'] || null,
      retryable: Boolean(payload?.retryable || !error.response || error.response.status >= 500),
      details: payload?.details || null,
    };
    return Promise.reject(error);
  }
);

// Server Profiles
export const getServers = () => api.get('/servers');
export const testServer = (id) => api.post(`/servers/${id}/test`);

// Metadata & DDIC
export const getTables = () => api.get('/metadata/tables');
export const getTableFields = (table) => api.get(`/metadata/tables/${table}`);
export const getAutoJoin = (tableA, tableB) =>
  api.get(`/metadata/autojoin?table_a=${encodeURIComponent(tableA)}&table_b=${encodeURIComponent(tableB)}`);
export const syncTableMetadata = (table, serverId) =>
  api.post(`/metadata/sync/${encodeURIComponent(table)}${serverId ? `?server_id=${serverId}` : ''}`);

// Saved Queries
export const getQueries = () => api.get('/queries');
export const getQuery = (id) => api.get(`/queries/${id}`);
export const saveQuery = (data) => api.post('/queries', data);
export const updateQuery = (id, data) => api.put(`/queries/${id}`, data);
export const deleteQuery = (id) => api.delete(`/queries/${id}`);
export const validateQuery = (queryJson) => api.post('/queries/validate', queryJson);
export const executeQuery = (payload) => api.post('/queries/execute', payload);
export const exportQuery = (payload) =>
  api.post('/queries/export', payload, { responseType: 'blob' });

// Cross-Server Compare
export const compareServers = (payload) => api.post('/compare', payload);

// Report Variants
export const getVariants = (queryId) => api.get(`/variants/query/${queryId}`);
export const saveVariant = (data) => api.post('/variants', data);
export const updateVariant = (id, data) => api.put(`/variants/${id}`, data);
export const deleteVariant = (id) => api.delete(`/variants/${id}`);

// Report Schedules & Telegram
export const getSchedules = () => api.get('/schedules');
export const saveSchedule = (data) => api.post('/schedules', data);
export const updateSchedule = (id, data) => api.put(`/schedules/${id}`, data);
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`);
export const runSchedule = (id) => api.post(`/schedules/${id}/run`);

// AI Chat Assistant
export const chatAi = (prompt) => api.post('/ai/chat', { prompt });

export default api;
