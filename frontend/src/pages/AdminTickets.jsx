import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAllTickets, getWorkers, setTicketPriority, rejectTicket, assignTicket } from '../services/api'
import toast from 'react-hot-toast'
import { Ticket, Clock, CheckCircle, XCircle, AlertCircle, Loader, Search, Filter, UserPlus, Ban, Star } from 'lucide-react'
import { format } from 'date-fns'

const statusConfig = {
  open: { color: '#3b82f6', icon: Clock, label: 'Open' },
  assigned: { color: '#8b5cf6', icon: Loader, label: 'Assigned' },
  in_progress: { color: '#f59e0b', icon: AlertCircle, label: 'In Progress' },
  resolved: { color: '#10b981', icon: CheckCircle, label: 'Resolved' },
  rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected' },
}

const statuses = ['', 'open', 'assigned', 'in_progress', 'resolved', 'rejected']
const priorities = ['', 'low', 'medium', 'high', 'urgent']

export default function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [pagination, setPagination] = useState(null)
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [modal, setModal] = useState(null)

  const page = parseInt(searchParams.get('page')) || 1
  const status = searchParams.get('status') || ''
  const priority = searchParams.get('priority') || ''
  const search = searchParams.get('search') || ''

  const load = () => {
    setLoading(true)
    getAllTickets({ page, status: status || undefined, priority: priority || undefined, search: search || undefined })
      .then(res => { setTickets(res.data.tickets); setPagination(res.data.pagination) })
      .catch((err) => { console.error('Failed to load tickets:', err); toast.error('Failed to load tickets') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, status, priority, search])
  useEffect(() => { getWorkers().then(res => setWorkers(res.data.workers)).catch((err) => { console.error('Failed to load workers:', err) }) }, [])

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.set('page', '1')
    setSearchParams(p)
  }

  const handlePriority = async (id, pri) => {
    try {
      await setTicketPriority(id, { priority: pri })
      toast.success('Priority updated')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleReject = async (id, reason) => {
    try {
      await rejectTicket(id, { rejectionReason: reason })
      toast.success('Ticket rejected')
      setModal(null)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleAssign = async (id, workerId) => {
    try {
      await assignTicket(id, { workerId })
      toast.success('Ticket assigned!')
      setModal(null)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleReassign = async (id, workerId) => {
    try {
      await assignTicket(id, { workerId })
      toast.success('Ticket reassigned!')
      setModal(null)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  return (
    <div className="page">
      <div className="page-header"><h2>All Tickets</h2></div>

      <div className="filters">
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder="Search tickets..." value={search} onChange={e => setFilter('search', e.target.value)} />
        </div>
        <div className="filter-row">
          <div className="filter-pills">
            {statuses.map(s => (
              <button key={s} className={`pill ${status === s ? 'pill-active' : ''}`} onClick={() => setFilter('status', s)}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <select value={priority} onChange={e => setFilter('priority', e.target.value)} className="filter-select">
            <option value="">All Priorities</option>
            {priorities.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner"></div></div> : (
        <>
          {tickets.length === 0 ? (
            <div className="empty-state"><Search size={48} strokeWidth={1} /><p>No tickets found</p></div>
          ) : (
            <div className="ticket-list">
              {tickets.map(t => {
                const s = statusConfig[t.status]
                const Icon = s.icon
                return (
                  <div key={t._id} className="ticket-card ticket-card-admin">
                    <Link to={`/admin/tickets/${t._id}`} className="ticket-card-main">
                      <div className="ticket-card-header">
                        <span className="ticket-id">{t.ticketId}</span>
                        <span className="badge" style={{ background: s.color + '18', color: s.color }}>
                          <Icon size={12} /> {s.label}
                        </span>
                        {t.rating && (
                          <span className="badge" style={{ background: '#f59e0b18', color: '#f59e0b', marginLeft: 'auto' }}>
                            <Star size={12} /> {t.rating}/5
                          </span>
                        )}
                      </div>
                      <h4 className="ticket-topic">{t.topic}</h4>
                      <p className="ticket-message">{t.message.slice(0, 100)}...</p>
                      <div className="ticket-meta">
                        <span>{format(new Date(t.createdAt), 'MMM d, yyyy')}</span>
                        {t.studentId && <span>By: {t.studentId.name}</span>}
                        {t.assignedWorker && <span>To: {t.assignedWorker.name}</span>}
                      </div>
                    </Link>
                    {['open', 'assigned', 'in_progress', 'resolved'].includes(t.status) && (
                      <div className="ticket-actions">
                        {t.status !== 'resolved' && (
                          <select defaultValue={t.priority || ''} onChange={e => e.target.value && handlePriority(t._id, e.target.value)} className="action-select">
                            <option value="">Set Priority</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        )}
                        {(t.status !== 'resolved') && (
                          <button className="btn btn-sm btn-outline" onClick={() => setModal({ type: 'assign', ticket: t })}>
                            <UserPlus size={14} /> {t.assignedWorker ? 'Reassign' : 'Assign'}
                          </button>
                        )}
                        {t.status === 'open' && (
                          <button className="btn btn-sm btn-danger-outline" onClick={() => setModal({ type: 'reject', ticket: t })}>
                            <Ban size={14} /> Reject
                          </button>
                        )}
                        {t.status === 'resolved' && (
                          <button className="btn btn-sm btn-outline" onClick={() => setModal({ type: 'reassign', ticket: t })}>
                            <UserPlus size={14} /> Reassign (Not Done)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>Previous</button>
              <span className="pagination-info">Page {pagination.page} of {pagination.pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= pagination.pages} onClick={() => setFilter('page', String(page + 1))}>Next</button>
            </div>
          )}
        </>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {modal.type === 'assign' ? <AssignModal ticket={modal.ticket} workers={workers} onAssign={handleAssign} onClose={() => setModal(null)} /> : null}
            {modal.type === 'reassign' ? <AssignModal ticket={modal.ticket} workers={workers} onAssign={handleReassign} onClose={() => setModal(null)} title="Reassign Ticket" /> : null}
            {modal.type === 'reject' ? <RejectModal ticket={modal.ticket} onReject={handleReject} onClose={() => setModal(null)} /> : null}
          </div>
        </div>
      )}
    </div>
  )
}

function AssignModal({ ticket, workers, onAssign, onClose, title }) {
  const [workerId, setWorkerId] = useState('')
  return (
    <>
      <h3>{title || 'Assign Ticket'}</h3>
      <p className="modal-desc">Select a worker for <strong>{ticket.ticketId}</strong></p>
      <select value={workerId} onChange={e => setWorkerId(e.target.value)} className="modal-select">
        <option value="">Select a worker...</option>
        {workers.map(w => (
          <option key={w._id} value={w._id}>
            {w.name} ({w.email}) {w.rating > 0 ? `⭐ ${w.rating} (${w.totalRatings} ratings)` : '-'}
          </option>
        ))}
      </select>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!workerId} onClick={() => onAssign(ticket._id, workerId)}>Assign</button>
      </div>
    </>
  )
}

function RejectModal({ ticket, onReject, onClose }) {
  const [reason, setReason] = useState('')
  return (
    <>
      <h3>Reject Ticket</h3>
      <p className="modal-desc">Reject <strong>{ticket.ticketId}</strong></p>
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection (min 5 chars)" rows={3} minLength={5} maxLength={1000} />
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" disabled={reason.length < 5} onClick={() => onReject(ticket._id, reason)}>Reject</button>
      </div>
    </>
  )
}
