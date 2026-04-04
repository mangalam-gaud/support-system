import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTaskById, startTask, completeTask, updateTaskNotes } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Play, CheckCircle, Clock, StickyNote, Camera, Upload, X, Star, Calendar, MessageSquare, Image, FileText, User } from 'lucide-react'
import { format } from 'date-fns'

const taskStatusConfig = {
  assigned: { color: '#8b5cf6', icon: Clock, label: 'Assigned' },
  in_progress: { color: '#f59e0b', icon: Clock, label: 'In Progress' },
  completed: { color: '#10b981', icon: CheckCircle, label: 'Completed' },
}

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [actualMinutes, setActualMinutes] = useState('')
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const backPath = user.role === 'worker' ? '/worker/tasks' : '/worker/tickets'

  const MAX_SIZE = 3 * 1024 * 1024

  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be under 3 MB.')
      return
    }
    setImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (e) => {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const loadTask = () => {
    getTaskById(id)
      .then(res => { 
        setTask(res.data.task); 
        setNotes(res.data.task?.notes || '') 
      })
      .catch(() => navigate(backPath))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTask() }, [id])

  const handleStart = async () => {
    setActionLoading(true)
    try {
      await startTask(id)
      toast.success('Task started!')
      loadTask()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setActionLoading(false) }
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const formData = new FormData()
      if (actualMinutes) formData.append('actualMinutesSpent', actualMinutes)
      if (notes) formData.append('notes', notes)
      if (image) formData.append('image', image)

      await completeTask(id, formData)
      toast.success('Task completed!')
      loadTask()
      setShowCompleteForm(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setActionLoading(false) }
  }

  const handleSaveNotes = async () => {
    setActionLoading(true)
    try {
      await updateTaskNotes(id, { notes })
      toast.success('Notes saved!')
      loadTask()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setActionLoading(false) }
  }

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>
  if (!task) return null

  const ticket = task.ticketId
  const s = taskStatusConfig[task.status]
  const Icon = s.icon

  return (
    <div className="page ticket-detail-page">
      <button className="btn btn-ghost back-btn" onClick={() => navigate(backPath)}>
        <ArrowLeft size={18} /> Back to Tasks
      </button>

      <div className="ticket-detail-card">
        {/* Header Section */}
        <div className="ticket-detail-header">
          <div className="header-left">
            <div className="ticket-id-badge">{ticket?.ticketId || 'N/A'}</div>
            <h1 className="ticket-title">{ticket?.topic || 'Task'}</h1>
            <div className="ticket-meta-row">
              <span className={`status-pill status-${task.status}`} style={{ background: s.color + '20', color: s.color }}>
                <Icon size={14} /> {s.label}
              </span>
              {ticket?.priority && (
                <span className={`priority-pill priority-${ticket.priority}`}>
                  {ticket.priority}
                </span>
              )}
              {ticket?.rating && (
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
              <span>Created {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
            </div>
            {/* Action Buttons */}
            <div className="header-actions">
              {task.status === 'assigned' && (
                <button className="btn btn-success btn-sm" onClick={handleStart} disabled={actionLoading}>
                  <Play size={14} /> Start Task
                </button>
              )}
              {task.status === 'in_progress' && (
                <button className="btn btn-success btn-sm" onClick={() => setShowCompleteForm(true)} disabled={actionLoading}>
                  <CheckCircle size={14} /> Complete Task
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="ticket-detail-body">
          {/* Left Column */}
          <div className="detail-main">
            {/* Description Section */}
            <div className="detail-block">
              <div className="block-header">
                <MessageSquare size={20} />
                <h3>Task Description</h3>
              </div>
              <div className="block-content">
                <p>{task.description}</p>
              </div>
            </div>

            {/* Original Message */}
            {ticket?.message && ticket.message !== task.description && (
              <div className="detail-block">
                <div className="block-header">
                  <MessageSquare size={20} />
                  <h3>Original Student Message</h3>
                </div>
                <div className="block-content">
                  <p>{ticket.message}</p>
                </div>
              </div>
            )}

            {/* Student Attachment */}
            <div className="detail-block">
              <div className="block-header">
                <Image size={20} />
                <h3>Student Attachment</h3>
              </div>
              <div className="block-content">
                {ticket?.imagePath ? (
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

            {/* Completion Proof */}
            <div className="detail-block">
              <div className="block-header">
                <FileText size={20} />
                <h3>Completion Proof</h3>
              </div>
              <div className="block-content">
                {task.completionImagePath ? (
                  <div className="image-container">
                    <img src={task.completionImagePath} alt="Completion proof" className="detail-image" />
                  </div>
                ) : (
                  <div className="no-data">
                    <FileText size={32} strokeWidth={1} />
                    <p>No completion proof uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Student Feedback */}
            {ticket?.rating && (
              <div className="detail-block rating-display-block">
                <div className="block-header">
                  <Star size={20} />
                  <h3>Student Feedback</h3>
                </div>
                <div className="block-content">
                  <div className="rating-stars-large">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={24} fill={ticket.rating >= star ? '#f59e0b' : 'none'} color={ticket.rating >= star ? '#f59e0b' : '#94a3b8'} />
                    ))}
                  </div>
                  {ticket.review && <p className="rating-review-text">"{ticket.review}"</p>}
                  {ticket.reviewedAt && <span className="rating-date-text">Reviewed on {format(new Date(ticket.reviewedAt), 'MMM d, yyyy')}</span>}
                </div>
              </div>
            )}

            {/* Complete Task Form */}
            {showCompleteForm && task.status === 'in_progress' && (
              <div className="detail-block">
                <div className="block-header">
                  <CheckCircle size={20} />
                  <h3>Complete Task</h3>
                </div>
                <div className="block-content">
                  <form onSubmit={handleComplete}>
                    <div className="form-group">
                      <label>Time Spent (minutes)</label>
                      <input type="number" value={actualMinutes} onChange={e => setActualMinutes(e.target.value)} min={0} placeholder="e.g. 45" />
                    </div>
                    <div className="form-group">
                      <label>Final Notes</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={5000} placeholder="Add notes..." />
                    </div>
                    <div className="form-group">
                      <label>Completion Photo</label>
                      <span className="form-hint">Upload or capture proof of work — max 3 MB</span>
                      {!imagePreview ? (
                        <div className="upload-zone">
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="upload-input-hidden" />
                          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="upload-input-hidden" />
                          <div className="upload-buttons">
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => fileInputRef.current.click()}>
                              <Upload size={14} /> Upload
                            </button>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => cameraInputRef.current.click()}>
                              <Camera size={14} /> Camera
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="image-preview-wrap image-preview-sm">
                          <img src={imagePreview} alt="Preview" className="image-preview" />
                          <button type="button" className="image-remove-btn" onClick={removeImage}>
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-outline" onClick={() => { setShowCompleteForm(false); removeImage() }}>Cancel</button>
                      <button type="submit" className="btn btn-success" disabled={actionLoading}>
                        {actionLoading ? 'Completing...' : 'Complete Task'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="detail-sidebar">
            {/* Student Info */}
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <User size={18} />
                <h4>Student Info</h4>
              </div>
              <div className="sidebar-card-content">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{ticket?.studentId?.name || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Task Info */}
            <div className="sidebar-card timeline-card">
              <div className="sidebar-card-header">
                <Clock size={18} />
                <h4>Task Timeline</h4>
              </div>
              <div className="sidebar-card-content">
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot created"></div>
                    <div className="timeline-content">
                      <span className="timeline-label">Created</span>
                      <span className="timeline-date">{format(new Date(task.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                  {task.startedAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot updated"></div>
                      <div className="timeline-content">
                        <span className="timeline-label">Started</span>
                        <span className="timeline-date">{format(new Date(task.startedAt), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  )}
                  {task.completedAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot resolved"></div>
                      <div className="timeline-content">
                        <span className="timeline-label">Completed</span>
                        <span className="timeline-date">{format(new Date(task.completedAt), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Time Info */}
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <Clock size={18} />
                <h4>Time Details</h4>
              </div>
              <div className="sidebar-card-content">
                {task.estimatedMinutes != null && (
                  <div className="info-row">
                    <span className="info-label">Estimated</span>
                    <span className="info-value">{task.estimatedMinutes} min</span>
                  </div>
                )}
                {task.actualMinutesSpent != null && (
                  <div className="info-row">
                    <span className="info-label">Time Spent</span>
                    <span className="info-value">{task.actualMinutesSpent} min</span>
                  </div>
                )}
                {task.estimatedMinutes == null && task.actualMinutesSpent == null && (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No time recorded</p>
                )}
              </div>
            </div>

            {/* Notes (for in_progress) */}
            {task.status === 'in_progress' && (
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <StickyNote size={18} />
                  <h4>Notes</h4>
                </div>
                <div className="sidebar-card-content">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Add notes..." maxLength={5000} style={{ width: '100%', marginBottom: '8px' }} />
                  <button className="btn btn-outline btn-sm" onClick={handleSaveNotes} disabled={actionLoading}>
                    Save Notes
                  </button>
                </div>
              </div>
            )}

            {/* Notes (for completed) */}
            {task.status === 'completed' && task.notes && (
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <StickyNote size={18} />
                  <h4>Notes</h4>
                </div>
                <div className="sidebar-card-content">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{task.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}