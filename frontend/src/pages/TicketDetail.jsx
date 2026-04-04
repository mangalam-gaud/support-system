import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTicketById, rateTicket, setTicketPriority, rejectTicket, assignTicket, startTask, completeTask } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Loader, User, Star, Calendar, MessageSquare, Image, FileText, Check, Play, Ban, UserPlus, Flag } from 'lucide-react'
import { format } from 'date-fns'

const statusConfig = {
  open: { color: '#3b82f6', icon: Clock, label: 'Open', bg: '#eff6ff', darkBg: '#1e3a5f' },
  assigned: { color: '#8b5cf6', icon: Loader, label: 'Assigned', bg: '#f3e8ff', darkBg: '#3b0764' },
  in_progress: { color: '#f59e0b', icon: AlertCircle, label: 'In Progress', bg: '#fef3c7', darkBg: '#451a03' },
  resolved: { color: '#10b981', icon: CheckCircle, label: 'Resolved', bg: '#d1fae5', darkBg: '#064e3b' },
  rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected', bg: '#fee2e2', darkBg: '#450a0a' },
}

export default function TicketDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const backPath = user.role === 'admin' ? '/admin/tickets' : user.role === 'worker' ? '/worker/tasks' : '/student/tickets'

  useEffect(() => {
    getTicketById(id)
      .then(res => { 
        setTicket(res.data.ticket); 
        setTask(res.data.task) 
      })
      .catch(() => navigate(backPath))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmitRating = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await rateTicket(id, { rating, review })
      setTicket(res.data.ticket)
      setShowRating(false)
      toast.success('Thank you for your feedback!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  // Admin actions
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [workers, setWorkers] = useState([])
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (user.role === 'admin') {
      import('../services/api').then(api => {
        api.getWorkers().then(res => setWorkers(res.data.workers)).catch(() => {})
      })
    }
  }, [user.role])

  const handleAssign = async () => {
    if (!selectedWorkerId) return
    setActionLoading(true)
    try {
      await assignTicket(id, { workerId: selectedWorkerId })
      toast.success('Ticket assigned!')
      const res = await getTicketById(id)
      setTicket(res.data.ticket)
      setTask(res.data.task)
      setShowAssignModal(false)
      setSelectedWorkerId('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (rejectReason.length < 5) return
    setActionLoading(true)
    try {
      await rejectTicket(id, { rejectionReason: rejectReason })
      toast.success('Ticket rejected!')
      const res = await getTicketById(id)
      setTicket(res.data.ticket)
      setShowRejectModal(false)
      setRejectReason('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartTask = async () => {
    setActionLoading(true)
    try {
      await startTask(id)
      toast.success('Task started!')
      const res = await getTicketById(id)
      setTicket(res.data.ticket)
      setTask(res.data.task)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolveTask = async () => {
    setActionLoading(true)
    try {
      await completeTask(id, { actualMinutesSpent: 30 })
      toast.success('Task completed!')
      const res = await getTicketById(id)
      setTicket(res.data.ticket)
      setTask(res.data.task)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReopen = async () => {
    setActionLoading(true)
    try {
      await assignTicket(id, { workerId: ticket.assignedWorker._id })
      toast.success('Ticket reopened!')
      const res = await getTicketById(id)
      setTicket(res.data.ticket)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>
  if (!ticket) return null

  const s = statusConfig[ticket.status]
  const Icon = s.icon

  const isStudent = user.role === 'student'
  const isResolved = ticket.status === 'resolved'
  const canRate = isStudent && isResolved && !ticket.rating

  return (
    <div className="page ticket-detail-page">
      <button className="btn btn-ghost back-btn" onClick={() => navigate(backPath)}>
        <ArrowLeft size={18} /> Back to Tickets
      </button>

      <div className="ticket-detail-card">
        {/* Header Section */}
        <div className="ticket-detail-header">
          <div className="header-left">
            <div className="ticket-id-badge">{ticket.ticketId}</div>
            <h1 className="ticket-title">{ticket.topic}</h1>
            <div className="ticket-meta-row">
              <span className={`status-pill status-${ticket.status}`} style={{ background: s.color + '20', color: s.color }}>
                <Icon size={14} /> {s.label}
              </span>
              {ticket.priority && (
                <span className={`priority-pill priority-${ticket.priority}`}>
                  {ticket.priority}
                </span>
              )}
              {ticket.rating && (
                <span className="rating-pill">
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  {ticket.rating}/5
                </span>
              )}
            </div>
          </div>
          <div className="header-right">
            <div className="date-info">
              <Calendar size={16} />
              <span>Created {format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
            </div>
            {/* Action Buttons */}
            <div className="header-actions">
              {/* Admin Actions - Priority */}
              {user.role === 'admin' && ['open', 'assigned', 'in_progress'].includes(ticket.status) && (
                <select 
                  className="priority-select"
                  value={ticket.priority || ''}
                  onChange={async (e) => {
                    if (!e.target.value) return
                    try {
                      await setTicketPriority(id, { priority: e.target.value })
                      const res = await getTicketById(id)
                      setTicket(res.data.ticket)
                      toast.success('Priority updated')
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed')
                    }
                  }}
                >
                  <option value="">Set Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              )}

              {/* Admin Actions */}
              {user.role === 'admin' && ticket.status === 'open' && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAssignModal(true)}>
                    <UserPlus size={14} /> Assign
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setShowRejectModal(true)}>
                    <Ban size={14} /> Reject
                  </button>
                </>
              )}
              {user.role === 'admin' && ticket.status === 'assigned' && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAssignModal(true)}>
                    <UserPlus size={14} /> Reassign
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setShowRejectModal(true)}>
                    <Ban size={14} /> Reject
                  </button>
                </>
              )}
              {user.role === 'admin' && ticket.status === 'in_progress' && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAssignModal(true)}>
                  <UserPlus size={14} /> Reassign
                </button>
              )}
              {user.role === 'admin' && ticket.status === 'resolved' && (
                <button className="btn btn-outline btn-sm" onClick={handleReopen}>
                  <Play size={14} /> Reopen
                </button>
              )}
              {user.role === 'admin' && ticket.status === 'rejected' && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAssignModal(true)}>
                  <UserPlus size={14} /> Assign
                </button>
              )}

              {/* Worker Actions */}
              {user.role === 'worker' && ticket.status === 'assigned' && task && task.status === 'assigned' && (
                <button className="btn btn-success btn-sm" onClick={handleStartTask} disabled={actionLoading}>
                  <Play size={14} /> Start Task
                </button>
              )}
              {user.role === 'worker' && task && task.status === 'in_progress' && (
                <button className="btn btn-success btn-sm" onClick={handleResolveTask} disabled={actionLoading}>
                  <Check size={14} /> Complete Task
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="ticket-detail-body">
          {/* Left Column */}
          <div className="detail-main">
            {/* Message Section */}
            <div className="detail-block">
              <div className="block-header">
                <MessageSquare size={20} />
                <h3>Description</h3>
              </div>
              <div className="block-content">
                <p>{ticket.message}</p>
              </div>
            </div>

            {/* Student Attachment */}
            <div className="detail-block">
              <div className="block-header">
                <Image size={20} />
                <h3>Student Attachment</h3>
              </div>
              <div className="block-content">
                {ticket.imagePath ? (
                  <div className="image-container">
                    <img src={ticket.imagePath} alt="Student attachment" className="detail-image" />
                  </div>
                ) : (
                  <div className="no-data">
                    <Image size={32} strokeWidth={1} />
                    <p>No attachment provided</p>
                  </div>
                )}
              </div>
            </div>

            {/* Worker Completion Proof */}
            <div className="detail-block">
              <div className="block-header">
                <FileText size={20} />
                <h3>Completion Proof</h3>
              </div>
              <div className="block-content">
                {task ? (
                  task.completionImagePath ? (
                    <div className="image-container">
                      <img src={task.completionImagePath} alt="Completion proof" className="detail-image" />
                    </div>
                  ) : (
                    <div className="no-data">
                      <FileText size={32} strokeWidth={1} />
                      <p>No completion proof uploaded</p>
                    </div>
                  )
                ) : (
                  <div className="no-data">
                    <Clock size={32} strokeWidth={1} />
                    <p>Task not assigned yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Task Details */}
            {task && (
              <div className="detail-block">
                <div className="block-header">
                  <CheckCircle size={20} />
                  <h3>Task Details</h3>
                </div>
                <div className="block-content">
                  <div className="task-info-grid">
                    <div className="task-info-item">
                      <span className="task-label">Status</span>
                      <span className={`task-value status-badge ${task.status}`}>
                        {task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                      </span>
                    </div>
                    {task.estimatedMinutes != null && (
                      <div className="task-info-item">
                        <span className="task-label">Estimated</span>
                        <span className="task-value">{task.estimatedMinutes} min</span>
                      </div>
                    )}
                    {task.actualMinutesSpent != null && (
                      <div className="task-info-item">
                        <span className="task-label">Time Spent</span>
                        <span className="task-value">{task.actualMinutesSpent} min</span>
                      </div>
                    )}
                  </div>
                  {task.notes && (
                    <div className="worker-notes">
                      <span className="task-label">Worker Notes:</span>
                      <p>{task.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rejection Reason */}
            {ticket.rejectionReason && (
              <div className="detail-block rejection-block">
                <div className="block-header">
                  <XCircle size={20} />
                  <h3>Rejection Reason</h3>
                </div>
                <div className="block-content">
                  <p>{ticket.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* Rating Section */}
            {canRate && !showRating && (
              <div className="detail-block rating-block">
                <div className="block-header">
                  <Star size={20} />
                  <h3>Rate This Service</h3>
                </div>
                <div className="block-content">
                  <p className="rating-prompt-text">How was your experience with this ticket resolution?</p>
                  <button className="btn btn-primary btn-lg" onClick={() => setShowRating(true)}>
                    <Star size={18} /> Rate Now
                  </button>
                </div>
              </div>
            )}

            {showRating && (
              <div className="detail-block rating-form-block">
                <div className="block-header">
                  <Star size={20} />
                  <h3>Your Rating</h3>
                </div>
                <div className="block-content">
                  <form onSubmit={handleSubmitRating}>
                    <div className="star-rating-large">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`star-btn ${rating >= star ? 'active' : ''}`}
                          onClick={() => setRating(star)}
                        >
                          <Star size={36} fill={rating >= star ? '#f59e0b' : 'none'} color={rating >= star ? '#f59e0b' : '#94a3b8'} />
                        </button>
                      ))}
                    </div>
                    <div className="form-group">
                      <label>Review (optional)</label>
                      <textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="Share your experience..."
                        rows={4}
                        maxLength={1000}
                      />
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setShowRating(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Rating'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Display existing rating */}
            {ticket.rating && (
              <div className="detail-block rating-display-block">
                <div className="block-header">
                  <Star size={20} />
                  <h3>Your Feedback</h3>
                </div>
                <div className="block-content">
                  <div className="rating-stars-large">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={24} fill={ticket.rating >= star ? '#f59e0b' : 'none'} color={ticket.rating >= star ? '#f59e0b' : '#94a3b8'} />
                    ))}
                  </div>
                  {ticket.review && <p className="rating-review-text">{ticket.review}</p>}
                  {ticket.reviewedAt && <span className="rating-date-text">Reviewed on {format(new Date(ticket.reviewedAt), 'MMM d, yyyy')}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="detail-sidebar">
            {/* Info Cards */}
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <User size={18} />
                <h4>Student Info</h4>
              </div>
              <div className="sidebar-card-content">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{ticket.studentId?.name || 'N/A'}</span>
                </div>
                {user.role === 'admin' && (
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value email">{ticket.studentId?.email || 'N/A'}</span>
                  </div>
                )}
              </div>
            </div>

            {ticket.assignedWorker && (
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <User size={18} />
                  <h4>Worker Info</h4>
                </div>
                <div className="sidebar-card-content">
                  <div className="info-row">
                    <span className="info-label">Name</span>
                    <span className="info-value">{ticket.assignedWorker.name}</span>
                  </div>
                  {user.role === 'admin' && ticket.assignedWorker.email && (
                    <div className="info-row">
                      <span className="info-label">Email</span>
                      <span className="info-value email">{ticket.assignedWorker.email}</span>
                    </div>
                  )}
                  {ticket.assignedWorker.rating > 0 && (
                    <div className="info-row">
                      <span className="info-label">Rating</span>
                      <span className="info-value rating">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                        {ticket.assignedWorker.rating} ({ticket.assignedWorker.totalRatings})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="sidebar-card timeline-card">
              <div className="sidebar-card-header">
                <Clock size={18} />
                <h4>Timeline</h4>
              </div>
              <div className="sidebar-card-content">
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot created"></div>
                    <div className="timeline-content">
                      <span className="timeline-label">Created</span>
                      <span className="timeline-date">{format(new Date(ticket.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                  {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot updated"></div>
                      <div className="timeline-content">
                        <span className="timeline-label">Updated</span>
                        <span className="timeline-date">{format(new Date(ticket.updatedAt), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  )}
                  {ticket.resolvedAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot resolved"></div>
                      <div className="timeline-content">
                        <span className="timeline-label">Resolved</span>
                        <span className="timeline-date">{format(new Date(ticket.resolvedAt), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{ticket.assignedWorker ? 'Reassign Ticket' : 'Assign Ticket'}</h3>
              <p className="modal-desc">Select a worker for <strong>{ticket.ticketId}</strong></p>
              <select value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)} className="modal-select">
                <option value="">Select a worker...</option>
                {workers.map(w => (
                  <option key={w._id} value={w._id}>
                    {w.name} {w.rating > 0 ? `⭐ ${w.rating}` : ''}
                  </option>
                ))}
              </select>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={!selectedWorkerId || actionLoading} onClick={handleAssign}>
                  {actionLoading ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Reject Ticket</h3>
              <p className="modal-desc">Reject <strong>{ticket.ticketId}</strong></p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (min 5 chars)" rows={3} minLength={5} maxLength={1000} />
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button className="btn btn-danger" disabled={rejectReason.length < 5 || actionLoading} onClick={handleReject}>
                  {actionLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}