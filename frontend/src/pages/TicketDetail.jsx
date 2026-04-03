import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTicketById, rateTicket } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Loader, User, Star } from 'lucide-react'
import { format } from 'date-fns'

const statusConfig = {
  open: { color: '#3b82f6', icon: Clock, label: 'Open' },
  assigned: { color: '#8b5cf6', icon: Loader, label: 'Assigned' },
  in_progress: { color: '#f59e0b', icon: AlertCircle, label: 'In Progress' },
  resolved: { color: '#10b981', icon: CheckCircle, label: 'Resolved' },
  rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected' },
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

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>
  if (!ticket) return null

  const s = statusConfig[ticket.status]
  const Icon = s.icon

  const isStudent = user.role === 'student'
  const isResolved = ticket.status === 'resolved'
  const canRate = isStudent && isResolved && !ticket.rating

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={() => navigate(backPath)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="detail-card">
        <div className="detail-header">
          <div>
            <span className="ticket-id">{ticket.ticketId}</span>
            <h2>{ticket.topic}</h2>
          </div>
          <span className="badge badge-lg" style={{ background: s.color + '18', color: s.color }}>
            <Icon size={14} /> {s.label}
          </span>
        </div>

        <div className="detail-body">
          <div className="detail-section">
            <h4>Message</h4>
            <p className="detail-message">{ticket.message}</p>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Raised By</span>
              <span><User size={14} /> {ticket.studentId?.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created</span>
              <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Updated</span>
              <span>{format(new Date(ticket.updatedAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
            {ticket.priority && (
              <div className="detail-item">
                <span className="detail-label">Priority</span>
                <span className={`priority priority-${ticket.priority}`}>{ticket.priority}</span>
              </div>
            )}
            {ticket.assignedWorker && (
              <div className="detail-item">
                <span className="detail-label">Assigned To</span>
                <span><User size={14} /> {ticket.assignedWorker.name}</span>
              </div>
            )}
            {ticket.resolvedAt && (
              <div className="detail-item">
                <span className="detail-label">Resolved</span>
                <span>{format(new Date(ticket.resolvedAt), 'MMM d, yyyy HH:mm')}</span>
                {ticket.assignedWorker && (
                  <span style={{ marginLeft: '8px', color: 'var(--success)', fontSize: '0.85rem' }}>
                    by {ticket.assignedWorker.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {ticket.rejectionReason && (
            <div className="detail-section rejection-box">
              <h4>Rejection Reason</h4>
              <p>{ticket.rejectionReason}</p>
            </div>
          )}

          {ticket.imagePath ? (
            <div className="detail-section">
              <h4>Student Attachment</h4>
              <img src={ticket.imagePath} alt="Student attachment" className="detail-image" />
            </div>
          ) : (
            <div className="detail-section">
              <h4>Student Attachment</h4>
              <p style={{color: '#999', fontStyle: 'italic'}}>Student did not upload any attachment</p>
            </div>
          )}

          <div className="detail-section">
            <h4>Worker Completion Proof</h4>
            {task ? (
              task.completionImagePath ? (
                <img src={task.completionImagePath} alt="Completion proof" className="detail-image" />
              ) : (
                <p style={{color: '#999', fontStyle: 'italic'}}>Worker did not upload proof of work</p>
              )
            ) : (
              <p style={{color: '#999', fontStyle: 'italic'}}>No task assigned yet</p>
            )}
          </div>

          {task && (
            <div className="detail-section">
              <h4>Task Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Task Status</span>
                  <span className="badge" style={{ background: task.status === 'completed' ? '#10b98118' : '#f59e0b18', color: task.status === 'completed' ? '#10b981' : '#f59e0b' }}>
                    {task.status}
                  </span>
                </div>
                {task.estimatedMinutes != null && (
                  <div className="detail-item">
                    <span className="detail-label">Estimated</span>
                    <span>{task.estimatedMinutes} min</span>
                  </div>
                )}
                {task.actualMinutesSpent != null && (
                  <div className="detail-item">
                    <span className="detail-label">Time Spent</span>
                    <span>{task.actualMinutesSpent} min</span>
                  </div>
                )}
                {task.notes && (
                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="detail-label">Worker Notes</span>
                    <p>{task.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rating Section - Only for students on resolved tickets */}
          {canRate && !showRating && (
            <div className="detail-section rating-prompt">
              <h4>Rate this service</h4>
              <p>How was your experience with this ticket resolution?</p>
              <button className="btn btn-primary" onClick={() => setShowRating(true)}>
                <Star size={16} /> Rate Now
              </button>
            </div>
          )}

          {showRating && (
            <div className="detail-section rating-form">
              <h4>Your Rating</h4>
              <form onSubmit={handleSubmitRating}>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${rating >= star ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                    >
                      <Star size={28} fill={rating >= star ? '#f59e0b' : 'none'} color={rating >= star ? '#f59e0b' : '#94a3b8'} />
                    </button>
                  ))}
                </div>
                <div className="form-group">
                  <label>Review (optional)</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Share your experience..."
                    rows={3}
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
          )}

          {/* Display existing rating */}
          {ticket.rating && (
            <div className="detail-section rating-display">
              <h4>Your Feedback</h4>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={20} fill={ticket.rating >= star ? '#f59e0b' : 'none'} color={ticket.rating >= star ? '#f59e0b' : '#94a3b8'} />
                ))}
              </div>
              {ticket.review && <p className="rating-review">{ticket.review}</p>}
              {ticket.reviewedAt && <span className="rating-date">Reviewed on {format(new Date(ticket.reviewedAt), 'MMM d, yyyy')}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}