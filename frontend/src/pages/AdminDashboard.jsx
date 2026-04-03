import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats, getRecentTickets } from '../services/api'
import toast from 'react-hot-toast'
import { Ticket, Clock, CheckCircle, XCircle, AlertCircle, Loader, Users, User } from 'lucide-react'
import { format } from 'date-fns'

const statusConfig = {
  open: { color: '#3b82f6', icon: Clock, label: 'Open' },
  assigned: { color: '#8b5cf6', icon: Loader, label: 'Assigned' },
  in_progress: { color: '#f59e0b', icon: AlertCircle, label: 'In Progress' },
  resolved: { color: '#10b981', icon: CheckCircle, label: 'Resolved' },
  rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected' },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardStats(), getRecentTickets({ limit: 5 })])
      .then(([s, t]) => { setStats(s.data); setRecent(t.data.tickets) })
      .catch((err) => { console.error('Failed to load dashboard:', err) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2>Admin Dashboard</h2>
      </div>

      {stats && (
        <>
          <h3 className="section-title">Tickets Overview</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#eff6ff' }}><Ticket size={20} color="#3b82f6" /></div>
              <div className="stat-info"><span className="stat-value">{stats.tickets.total}</span><span className="stat-label">Total</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#eff6ff' }}><Clock size={20} color="#3b82f6" /></div>
              <div className="stat-info"><span className="stat-value">{stats.tickets.open}</span><span className="stat-label">Open</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#f3e8ff' }}><Loader size={20} color="#8b5cf6" /></div>
              <div className="stat-info"><span className="stat-value">{stats.tickets.assigned}</span><span className="stat-label">Assigned</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7' }}><AlertCircle size={20} color="#f59e0b" /></div>
              <div className="stat-info"><span className="stat-value">{stats.tickets.inProgress}</span><span className="stat-label">In Progress</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#d1fae5' }}><CheckCircle size={20} color="#10b981" /></div>
              <div className="stat-info"><span className="stat-value">{stats.tickets.resolved}</span><span className="stat-label">Resolved</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fee2e2' }}><XCircle size={20} color="#ef4444" /></div>
              <div className="stat-info"><span className="stat-value">{stats.tickets.rejected}</span><span className="stat-label">Rejected</span></div>
            </div>
          </div>

          <h3 className="section-title">Users</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#eff6ff' }}><Users size={20} color="#3b82f6" /></div>
              <div className="stat-info"><span className="stat-value">{stats.users.students}</span><span className="stat-label">Students</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#f3e8ff' }}><User size={20} color="#8b5cf6" /></div>
              <div className="stat-info"><span className="stat-value">{stats.users.workers}</span><span className="stat-label">Workers</span></div>
            </div>
          </div>
        </>
      )}

      <div className="section">
        <div className="section-header">
          <h3>Recent Tickets</h3>
          <Link to="/admin/tickets" className="link">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state"><Ticket size={48} strokeWidth={1} /><p>No tickets yet</p></div>
        ) : (
          <div className="ticket-list">
            {recent.map(t => {
              const s = statusConfig[t.status]
              const Icon = s.icon
              return (
                <Link to={`/admin/tickets/${t._id}`} key={t._id} className="ticket-card">
                  <div className="ticket-card-header">
                    <span className="ticket-id">{t.ticketId}</span>
                    <span className="badge" style={{ background: s.color + '18', color: s.color }}>
                      <Icon size={12} /> {s.label}
                    </span>
                  </div>
                  <h4 className="ticket-topic">{t.topic}</h4>
                  <p className="ticket-message">{t.message.slice(0, 120)}...</p>
                  <div className="ticket-meta">
                    <span>{format(new Date(t.createdAt), 'MMM d, yyyy')}</span>
                    {t.studentId && <span>By: {t.studentId.name}</span>}
                    {t.priority && <span className={`priority priority-${t.priority}`}>{t.priority}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
