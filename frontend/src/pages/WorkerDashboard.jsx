import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTaskStats, getMyTasks } from '../services/api'
import { ClipboardList, Clock, Loader, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

const taskStatusConfig = {
  assigned: { color: '#8b5cf6', icon: Clock, label: 'Assigned' },
  in_progress: { color: '#f59e0b', icon: Loader, label: 'In Progress' },
  completed: { color: '#10b981', icon: CheckCircle, label: 'Completed' },
}

export default function WorkerDashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTaskStats(), getMyTasks({ limit: 5 })])
      .then(([s, t]) => { setStats(s.data); setRecent(t.data.tasks) })
      .catch((err) => { console.error('Failed to load dashboard:', err) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2>Worker Dashboard</h2>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f3e8ff' }}><ClipboardList size={20} color="#8b5cf6" /></div>
            <div className="stat-info"><span className="stat-value">{stats.total}</span><span className="stat-label">Total Tasks</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f3e8ff' }}><Clock size={20} color="#8b5cf6" /></div>
            <div className="stat-info"><span className="stat-value">{stats.assigned}</span><span className="stat-label">Assigned</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7' }}><Loader size={20} color="#f59e0b" /></div>
            <div className="stat-info"><span className="stat-value">{stats.inProgress}</span><span className="stat-label">In Progress</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#d1fae5' }}><CheckCircle size={20} color="#10b981" /></div>
            <div className="stat-info"><span className="stat-value">{stats.completed}</span><span className="stat-label">Completed</span></div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <h3>Recent Tasks</h3>
          <Link to="/worker/tasks" className="link">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={48} strokeWidth={1} />
            <p>No tasks assigned yet</p>
          </div>
        ) : (
          <div className="task-list">
            {recent.map(t => {
              const s = taskStatusConfig[t.status]
              const Icon = s.icon
              return (
                <Link to={`/worker/tasks/${t._id}`} key={t._id} className="ticket-card">
                  <div className="ticket-card-header">
                    <span className="ticket-id">{t.ticketId?.ticketId || 'N/A'}</span>
                    <span className="badge" style={{ background: s.color + '18', color: s.color }}>
                      <Icon size={12} /> {s.label}
                    </span>
                  </div>
                  <h4 className="ticket-topic">{t.ticketId?.topic || 'N/A'}</h4>
                  <p className="ticket-message">{t.description?.slice(0, 120)}...</p>
                  <div className="ticket-meta">
                    <span>{format(new Date(t.createdAt), 'MMM d, yyyy')}</span>
                    {t.ticketId?.studentId && <span>Student: {t.ticketId.studentId.name}</span>}
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
