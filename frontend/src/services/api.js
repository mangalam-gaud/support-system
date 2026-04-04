import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const getMe = () => api.get('/auth/me')
export const updateProfile = (data) => api.put('/auth/me', data)
export const uploadProfileImage = (data) => api.put('/auth/me/profile-image', data, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const changePassword = (data) => api.put('/auth/change-password', data)
export const logout = () => api.post('/auth/logout')
export const getWorkers = () => api.get('/auth/workers')
export const getUsers = (params) => api.get('/auth/users', { params })
export const createUser = (data) => api.post('/auth/users', data)
export const updateUserStatus = (id, data) => api.put(`/auth/users/${id}/status`, data)
export const resetUserPassword = (id, newPassword) => api.put(`/auth/users/${id}/password`, { newPassword })
export const updateUserDetails = (id, data) => api.put(`/auth/users/${id}`, data)
export const getSystemSettings = () => api.get('/auth/settings')
export const updateSystemSettings = (data) => api.put('/auth/settings', data)
export const deleteSystemSettings = (key) => api.delete(`/auth/settings/${key}`)
export const verifyApiKey = (key) => api.post('/auth/verify-api-key', { apiKey: key })

// Tickets
export const createTicket = (data) => api.post('/tickets', data)
export const getAllTickets = (params) => api.get('/tickets', { params })
export const getMyTickets = (params) => api.get('/tickets/my-tickets', { params })
export const getAssignedTickets = (params) => api.get('/tickets/assigned', { params })
export const getTicketById = (id) => api.get(`/tickets/${id}`)
export const getTicketByTicketId = (ticketId) => api.get(`/tickets/id/${ticketId}`)
export const setTicketPriority = (id, data) => api.put(`/tickets/${id}/priority`, data)
export const rejectTicket = (id, data) => api.put(`/tickets/${id}/reject`, data)
export const assignTicket = (id, data) => api.put(`/tickets/${id}/assign`, data)
export const startTicket = (id) => api.put(`/tickets/${id}/start`)
export const resolveTicket = (id, data) => api.put(`/tickets/${id}/resolve`, data)
export const rateTicket = (id, data) => api.put(`/tickets/${id}/rate`, data)

// Tasks
export const getMyTasks = (params) => api.get('/tasks/my-tasks', { params })
export const getTaskStats = () => api.get('/tasks/stats')
export const getTaskById = (id) => api.get(`/tasks/${id}`)
export const startTask = (id) => api.put(`/tasks/${id}/start`)
export const completeTask = (id, data) => api.put(`/tasks/${id}/complete`, data)
export const updateTaskNotes = (id, data) => api.put(`/tasks/${id}/notes`, data)
export const updateTaskEstimate = (id, data) => api.put(`/tasks/${id}/estimate`, data)

// Students
export const getStudentStats = () => api.get('/students/stats')
export const getStudentTickets = (params) => api.get('/students/my-tickets', { params })

// Admin
export const getDashboardStats = () => api.get('/students/dashboard')
export const getRecentTickets = (params) => api.get('/students/recent', { params })

// Chatbot
export const sendChatMessage = (data) => api.post('/chatbot/chat', data)
export const clearChatHistory = () => api.delete('/chatbot/history')
export const getChatbotStatus = () => api.get('/chatbot/status')

// Health
export const healthCheck = () => api.get('/health')

export default api
