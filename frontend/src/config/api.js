// frontend/src/config/api.js - API Configuration

// Function to get the appropriate API base URL
export const getApiBaseUrl = () => {
  // Get the current hostname
  const hostname = window.location.hostname;
  
  // If accessing via network IP, use the same IP for backend
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8000`;
  }
  
  // Default to localhost for local development
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

console.log('🌐 API Base URL:', API_BASE_URL);

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  
  // Document endpoints
  DOCUMENTS_LIST: `${API_BASE_URL}/api/documents/list`,
  DOCUMENTS_UPLOAD: `${API_BASE_URL}/api/documents/upload`,
  DOCUMENTS_DOWNLOAD: (docId) => `${API_BASE_URL}/api/documents/download/${docId}`,
  DOCUMENTS_DELETE: (docId) => `${API_BASE_URL}/api/documents/delete/${docId}`,
  
  // Admin endpoints
  ADMIN_DASHBOARD: `${API_BASE_URL}/api/admin/dashboard`,
  ADMIN_MODIFICATIONS: `${API_BASE_URL}/api/admin/modifications`,
  ADMIN_DATA_LEAKS: `${API_BASE_URL}/api/admin/data-leaks`,
  ADMIN_MODIFICATION_DIFF: (modId) => `${API_BASE_URL}/api/admin/modification-diff/${modId}`,
  ADMIN_ALERTS: `${API_BASE_URL}/api/admin/alerts`,
  ADMIN_RESOLVE_ALERT: (alertId) => `${API_BASE_URL}/api/admin/alerts/${alertId}/resolve`,
  ADMIN_ACCESS_LOGS: `${API_BASE_URL}/api/admin/access-logs`,
  ADMIN_REPORTS_GENERATE: `${API_BASE_URL}/api/admin/reports/generate`,
  ADMIN_SYSTEM_HEALTH: `${API_BASE_URL}/api/admin/system-health`,
  
  // Reports endpoints
  REPORTS: (reportId) => `${API_BASE_URL}/api/reports/${reportId}`,
};

// Axios default configuration
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  getAuthHeaders,
  getApiBaseUrl
};
