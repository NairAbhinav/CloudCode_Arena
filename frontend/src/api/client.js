import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cca_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config.url.includes('/api/auth/login') || error.config.url.includes('/api/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('cca_token');
        localStorage.removeItem('cca_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

// API Service Wrappers
export const authApi = {
  login: (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  getMe: () => api.get('/api/auth/me'),
  getUsers: (params) => api.get('/api/auth/users', { params }),
  updateRole: (userId, role) => api.put(`/api/auth/users/${userId}/role`, { role }),
  updateStatus: (userId, status) => api.put(`/api/auth/users/${userId}/status`, { status }),
  bootstrapAdmin: (data, key) => api.post('/api/auth/bootstrap-admin', data, { headers: { 'x-bootstrap-key': key } })
};

export const questionsApi = {
  list: (params) => api.get('/api/questions', { params }),
  get: (id) => api.get(`/api/questions/${id}`),
  create: (data) => api.post('/api/questions', data),
  update: (id, data) => api.put(`/api/questions/${id}`, data),
  delete: (id) => api.delete(`/api/questions/${id}`),
  publish: (id) => api.post(`/api/questions/${id}/publish`)
};

export const assessmentsApi = {
  list: (params) => api.get('/api/assessments', { params }),
  get: (id) => api.get(`/api/assessments/${id}`),
  create: (data) => api.post('/api/assessments', data),
  update: (id, data) => api.put(`/api/assessments/${id}`, data),
  publish: (id) => api.post(`/api/assessments/${id}/publish`),
  startAttempt: (id) => api.post(`/api/assessments/${id}/start`),
  getActiveAttempt: (id) => api.get(`/api/assessments/${id}/attempt`),
  submitAttempt: (id) => api.post(`/api/assessments/${id}/submit-attempt`),
  getParticipants: (id) => api.get(`/api/assessments/${id}/participants`),
  releaseResults: (id) => api.put(`/api/assessments/${id}/release-results`),
  delete: (id) => api.delete(`/api/assessments/${id}`)
};

export const submissionsApi = {
  runCode: (data) => api.post('/api/execute/run', data),
  submit: (data) => api.post('/api/submissions/submit', data),
  getMyHistory: (params) => api.get('/api/submissions/my', { params }),
  getById: (id) => api.get(`/api/submissions/${id}`),
  getAssessmentSubmissions: (assessmentId, params) => api.get(`/api/submissions/assessment/${assessmentId}`, { params })
};

export const anticheatApi = {
  recordEvent: (data) => api.post('/api/anticheat/events', data),
  getFlagged: (assessmentId) => api.get(`/api/anticheat/attempts/${assessmentId}/flagged`),
  reviewAction: (attemptId, data) => api.put(`/api/anticheat/attempts/${attemptId}/action`, data)
};

export const reportsApi = {
  getStudentProgress: () => api.get('/api/reports/student/progress'),
  getFacultyAnalytics: () => api.get('/api/reports/faculty/analytics'),
  getLeaderboard: () => api.get('/api/reports/leaderboard'),
  getAdminAuditLogs: (params) => api.get('/api/admin/audit-logs', { params }),
  getAdminHealth: () => api.get('/api/admin/health'),
  exportCsvUrl: (assessmentId) => `${API_BASE_URL}/api/reports/faculty/assessments/${assessmentId}/export-csv`
};

export default api;
