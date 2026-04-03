import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMyTasks } from '../services/api'
import toast from 'react-hot-toast'
import { ClipboardList, Clock, Loader, CheckCircle, Search, Star } from 'lucide-react'
import { format } from 'date-fns'

const taskStatusConfig = {
  assigned: { color: '#8b5cf6', icon: Clock, label: 'Assigned' },
  in_progress: { color: '#f59e0b', icon: Loader, label: 'In Progress' },
  completed: { color: '#10b981', icon: CheckCircle, label: 'Completed' },
}

const statuses = ['', 'assigned', 'in_progress', 'completed']

export default function WorkerTasks() {
  const [tasks, setTasks] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()

  const page = parseInt(searchParams.get('page')) || 1
  const status = searchParams.get('status') || ''

  useEffect(() => {
    setLoading(true)
    getMyTasks({ page, status: status || undefined })
      .then(res => { setTasks(res.data.tasks); setPagination(res.data.pagination) })
      .catch((err) => { console.error('Failed to load tasks:', err); toast.error('Failed to load tasks') })
      .finally(() => setLoading(false))
  }, [page, status])

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.set('page', '1')
    setSearchParams(p)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Tasks</h2>
      </div>

      <div className="filters">
        <div className="filter-pills">
          {statuses.map(s => (
            <button key={s} className={`pill ${status === s ? 'pill-active' : ''}`} onClick={() => setFilter('status', s)}>
              {s ? taskStatusConfig[s]?.label || s : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner"></div></div> : (
        <>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <Search size={48} strokeWidth={1} />
              <p>No tasks found</p>
            </div>
          ) : (
            <div className="task-list">
              {tasks.map(t => {
                const s = taskStatusConfig[t.status]
                const Icon = s.icon
                return (
                  <Link to={`/worker/tasks/${t._id}`} key={t._id} className="ticket-card">
                    <div className="ticket-card-header">
                      <span className="ticket-id">{t.ticketId?.ticketId || 'N/A'}</span>
                      <span className="badge" style={{ background: s.color + '18', color: s.color }}>
                        <Icon size={12} /> {s.label}
                      </span>
                      {t.ticketId?.rating && (
                        <span className="badge" style={{ background: '#f59e0b18', color: '#f59e0b' }}>
                          <Star size={12} /> {t.ticketId.rating}
                        </span>
                      )}
                    </div>
                    <h4 className="ticket-topic">{t.ticketId?.topic || 'N/A'}</h4>
                    <p className="ticket-message">{t.description?.slice(0, 150)}...</p>
                    <div className="ticket-meta">
                      <span>{format(new Date(t.createdAt), 'MMM d, yyyy HH:mm')}</span>
                      {t.ticketId?.priority && <span className={`priority priority-${t.ticketId.priority}`}>{t.ticketId.priority}</span>}
                      {t.ticketId?.studentId && <span>Student: {t.ticketId.studentId.name}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}>Previous</button>
              <span className="pagination-info">Page {pagination.page} of {pagination.pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= pagination.pages}
                onClick={() => setFilter('page', String(page + 1))}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
