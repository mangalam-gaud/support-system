import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import StudentTickets from './pages/StudentTickets'
import CreateTicket from './pages/CreateTicket'
import TicketDetail from './pages/TicketDetail'
import WorkerDashboard from './pages/WorkerDashboard'
import WorkerTasks from './pages/WorkerTasks'
import TaskDetail from './pages/TaskDetail'
import AdminDashboard from './pages/AdminDashboard'
import AdminTickets from './pages/AdminTickets'
import AdminUsers from './pages/AdminUsers'
import Chatbot from './pages/Chatbot'
import Profile from './pages/Profile'
import AdminLogin from './pages/AdminLogin'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(user.role)) {
    const redirect = user.role === 'admin' ? '/admin' : user.role === 'worker' ? '/worker' : '/student'
    return <Navigate to={redirect} />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>
  if (user) {
    const redirect = user.role === 'admin' ? '/admin' : user.role === 'worker' ? '/worker' : '/student'
    return <Navigate to={redirect} />
  }
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            <Route path="/student" element={<ProtectedRoute roles={['student']}><Layout /></ProtectedRoute>}>
              <Route index element={<StudentDashboard />} />
              <Route path="tickets" element={<StudentTickets />} />
              <Route path="tickets/new" element={<CreateTicket />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="chatbot" element={<Chatbot />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="/worker" element={<ProtectedRoute roles={['worker']}><Layout /></ProtectedRoute>}>
              <Route index element={<WorkerDashboard />} />
              <Route path="tasks" element={<WorkerTasks />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="tickets" element={<WorkerTasks />} />
              <Route path="tickets/:id" element={<TaskDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Hidden admin login — not linked anywhere */}
            <Route path="/admin-login" element={<AdminLogin />} />

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
