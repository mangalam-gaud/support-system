import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getStudentTickets } from '../services/api'
import toast from 'react-hot-toast'
import { Ticket, Clock, CheckCircle, XCircle, AlertCircle, Loader, Search, Star } from 'lucide-react'
import { format } from 'date-fns'

const statusConfig = {
  open: { color: '#3b82f6', icon: Clock, label: 'Open' },
  assigned: { color: '#8b5cf6', icon: Loader, label: 'Assigned' },
  in_progress: { color: '#f59e0b', icon: AlertCircle, label: 'In Progress' },
  resolved: { color: '#10b981', icon: CheckCircle, label: 'Resolved' },
  rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected' },
}

const statuses = ['', 'open', 'assigned', 'in_progress', 'resolved', 'rejected']

export default function StudentTickets() {
  const [tickets, setTickets] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()

  const page = parseInt(searchParams.get('page')) || 1
  const status = searchParams.get('status') || ''

  useEffect(() => {
    setLoading(true)
    getStudentTickets({ page, status: status || undefined })
      .then(res => { setTickets(res.data.tickets); setPagination(res.data.pagination) })
      .catch((err) => { 
        console.error('Failed to load tickets:', err)
        toast.error('Failed to load tickets')
      })
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
        <h2>My Tickets</h2>
        <Link to="/student/tickets/new" className="btn btn-primary">+ New Ticket</Link>
      </div>

      <div className="filters">
        <div className="filter-pills">
          {statuses.map(s => (
            <button key={s} className={`pill ${status === s ? 'pill-active' : ''}`} onClick={() => setFilter('status', s)}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner"></div></div> : (
        <>
          {tickets.length === 0 ? (
            <div className="empty-state">
              <Search size={48} strokeWidth={1} />
              <p>No tickets found</p>
            </div>
          ) : (
            <div className="ticket-list">
              {tickets.map(t => {
                const s = statusConfig[t.status]
                const Icon = s.icon
                return (
                  <Link to={`/student/tickets/${t._id}`} key={t._id} className="ticket-card">
                    <div className="ticket-card-header">
                      <span className="ticket-id">{t.ticketId}</span>
                      <span className="badge" style={{ background: s.color + '18', color: s.color }}>
                        <Icon size={12} /> {s.label}
                      </span>
                      {t.rating && (
                        <span className="badge" style={{ background: '#f59e0b18', color: '#f59e0b' }}>
                          <Star size={12} /> {t.rating}
                        </span>
                      )}
                    </div>
                    <h4 className="ticket-topic">{t.topic}</h4>
                    <p className="ticket-message">{t.message.slice(0, 150)}...</p>
                    <div className="ticket-meta">
                      <span>{format(new Date(t.createdAt), 'MMM d, yyyy HH:mm')}</span>
                      {t.priority && <span className={`priority priority-${t.priority}`}>{t.priority}</span>}
                      {t.assignedWorker && <span className="ticket-worker">Assigned to: {t.assignedWorker.name}</span>}
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
