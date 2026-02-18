import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (name, email, password) => api.post('/auth/register', { name, email, password });
export const demoLogin = role => api.post('/auth/demo', { role });
export const getMe = () => api.get('/auth/me');
export const updateProfile = data => api.put('/auth/me', data);
export const getSSOStatus = () => api.get('/auth/sso-status');

// Books
export const getBooks = params => api.get('/books', { params });
export const getBookStats = () => api.get('/books/stats');
export const getBook = id => api.get(`/books/${id}`);
export const createBook = data => api.post('/books', data);
export const updateBook = (id, data) => api.put(`/books/${id}`, data);
export const deleteBook = id => api.delete(`/books/${id}`);
export const addReview = (bookId, data) => api.post(`/books/${bookId}/reviews`, data);

// Transactions
export const getTransactions = params => api.get('/transactions', { params });
export const getTransactionStats = () => api.get('/transactions/stats');
export const checkoutBook = data => api.post('/transactions/checkout', data);
export const checkinBook = data => api.post('/transactions/checkin', data);
export const selfCheckout = bookId => api.post('/transactions/self-checkout', { bookId });

// Users
export const getUsers = params => api.get('/users', { params });
export const getUsersList = () => api.get('/users/list');
export const getUser = id => api.get(`/users/${id}`);
export const updateUserRole = (id, role) => api.put(`/users/${id}/role`, { role });
export const updateUserStatus = (id, isActive) => api.put(`/users/${id}/status`, { isActive });
export const createUser = data => api.post('/users', data);

// Chapters
export const getBookChapters = bookId => api.get(`/chapters/book/${bookId}`);
export const getChapter = id => api.get(`/chapters/${id}`);
export const createChapter = data => api.post('/chapters', data);
export const createChaptersBulk = (bookId, chapters) => api.post('/chapters/bulk', { bookId, chapters });
export const updateChapter = (id, data) => api.put(`/chapters/${id}`, data);
export const deleteChapter = id => api.delete(`/chapters/${id}`);
export const reorderChapters = (bookId, order) => api.put(`/chapters/reorder/${bookId}`, { order });

// Global Content Search
export const contentSearch = params => api.get('/search', { params });

// AI
export const getAIStatus = () => api.get('/ai/status');
export const aiSearch = query => api.post('/ai/search', { query });
export const aiRecommendations = () => api.get('/ai/recommendations');
export const aiChat = (message, history) => api.post('/ai/chat', { message, history });
export const aiCategorize = (title, author, description) => api.post('/ai/categorize', { title, author, description });

export default api;
