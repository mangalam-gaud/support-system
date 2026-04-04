import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, Ticket, PlusCircle, MessageSquare, User,
  ClipboardList, Users, LogOut, Menu, X, Sun, Moon, Settings
} from 'lucide-react'

const navItems = {
  student: [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/student/tickets', icon: Ticket, label: 'My Tickets', end: true },
    { to: '/student/tickets/new', icon: PlusCircle, label: 'New Ticket' },
    { to: '/student/chatbot', icon: MessageSquare, label: 'AI Chatbot' },
    { to: '/student/profile', icon: User, label: 'Profile' },
  ],
  worker: [
    { to: '/worker', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/worker/tasks', icon: ClipboardList, label: 'My Tasks', end: true },
    { to: '/worker/profile', icon: User, label: 'Profile' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/tickets', icon: Ticket, label: 'All Tickets', end: true },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
    { to: '/admin/profile', icon: User, label: 'Profile' },
  ],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const items = navItems[user?.role] || []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-logo">MANGAUD Support</h1>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-user">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="sidebar-user-avatar-img" />
          ) : (
            <div className="sidebar-user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
          )}
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{user?.role}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-developed">Developed by Mangaud</div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-title">
            {items.find(i => {
              const path = location.pathname
              if (i.end) return path === i.to
              return path.startsWith(i.to)
            })?.label || 'Dashboard'}
          </div>
          <div className="topbar-user">
            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <span className="topbar-user-name">{user?.name}</span>
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="topbar-avatar-img" />
            ) : (
              <div className="topbar-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
            )}
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
