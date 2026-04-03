import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTaskById, startTask, completeTask, updateTaskNotes } from '../services/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Play, CheckCircle, Clock, StickyNote, Camera, Upload, X, Star } from 'lucide-react'
import { format } from 'date-fns'

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
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
      .catch(() => navigate('/worker/tasks'))
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

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={() => navigate('/worker/tasks')}>
        <ArrowLeft size={16} /> Back to Tasks
      </button>

      <div className="detail-card">
        <div className="detail-header">
          <div>
            <span className="ticket-id">{ticket?.ticketId || 'N/A'}</span>
            <h2>{ticket?.topic || 'Task'}</h2>
          </div>
          <span className="badge badge-lg" style={{
            background: task.status === 'completed' ? '#10b98118' : task.status === 'in_progress' ? '#f59e0b18' : '#8b5cf618',
            color: task.status === 'completed' ? '#10b981' : task.status === 'in_progress' ? '#f59e0b' : '#8b5cf6'
          }}>
            {task.status.replace('_', ' ')}
          </span>
        </div>

        <div className="detail-body">
          <div className="detail-section">
            <h4>Description</h4>
            <p className="detail-message">{task.description}</p>
          </div>

          {ticket?.message && ticket.message !== task.description && (
            <div className="detail-section">
              <h4>Original Message</h4>
              <p className="detail-message">{ticket.message}</p>
            </div>
          )}

          {ticket?.imagePath ? (
            <div className="detail-section">
              <h4>Student Attachment</h4>
              <img src={ticket.imagePath} alt="Student attachment" className="detail-image" />
            </div>
          ) : (
            <div className="detail-section">
              <h4>Student Attachment</h4>
              <p style={{color: '#999', fontStyle: 'italic'}}>No attachment uploaded</p>
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Created</span>
              <span>{format(new Date(task.createdAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
            {task.startedAt && (
              <div className="detail-item">
                <span className="detail-label">Started</span>
                <span>{format(new Date(task.startedAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
            )}
            {task.completedAt && (
              <div className="detail-item">
                <span className="detail-label">Completed</span>
                <span>{format(new Date(task.completedAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
            )}
            {task.estimatedMinutes != null && (
              <div className="detail-item">
                <span className="detail-label">Estimated</span>
                <span><Clock size={14} /> {task.estimatedMinutes} min</span>
              </div>
            )}
            {task.actualMinutesSpent != null && (
              <div className="detail-item">
                <span className="detail-label">Actual Time</span>
                <span><Clock size={14} /> {task.actualMinutesSpent} min</span>
              </div>
            )}
            {ticket?.studentId && (
              <div className="detail-item">
                <span className="detail-label">Student</span>
                <span>{ticket.studentId.name}</span>
              </div>
            )}
          </div>

          {/* Student Rating/Feedback */}
          {ticket?.rating && (
            <div className="detail-section">
              <h4>Student Feedback</h4>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={20} fill={ticket.rating >= star ? '#f59e0b' : 'none'} color={ticket.rating >= star ? '#f59e0b' : '#94a3b8'} />
                ))}
              </div>
              {ticket.review && <p style={{ marginTop: '12px', fontStyle: 'italic' }}>"{ticket.review}"</p>}
              {ticket.reviewedAt && <span className="rating-date">Reviewed on {format(new Date(ticket.reviewedAt), 'MMM d, yyyy')}</span>}
            </div>
          )}

          {/* Actions */}
          {task.status === 'assigned' && (
            <div className="detail-actions">
              <button className="btn btn-primary" onClick={handleStart} disabled={actionLoading}>
                <Play size={16} /> Start Task
              </button>
            </div>
          )}

          {task.status === 'in_progress' && (
            <>
              <div className="detail-section">
                <h4><StickyNote size={16} /> Notes</h4>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add notes..." maxLength={5000} />
                <button className="btn btn-outline btn-sm" onClick={handleSaveNotes} disabled={actionLoading} style={{ marginTop: 8 }}>
                  Save Notes
                </button>
              </div>

              {!showCompleteForm ? (
                <div className="detail-actions">
                  <button className="btn btn-success" onClick={() => setShowCompleteForm(true)}>
                    <CheckCircle size={16} /> Mark Complete
                  </button>
                </div>
              ) : (
                <form onSubmit={handleComplete} className="complete-form">
                  <div className="form-group">
                    <label>Time Spent (minutes)</label>
                    <input type="number" value={actualMinutes} onChange={e => setActualMinutes(e.target.value)} min={0} placeholder="e.g. 45" />
                  </div>
                  <div className="form-group">
                    <label>Final Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={5000} />
                  </div>
                  <div className="form-group">
                    <label>Completion Photo</label>
                    <span className="form-hint">Upload or capture proof of work — max 3 MB</span>
                    {!imagePreview ? (
                      <div className="upload-zone">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="upload-input-hidden"
                        />
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileSelect}
                          className="upload-input-hidden"
                        />
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
                      <CheckCircle size={16} /> Complete Task
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {task.status === 'completed' && task.notes && (
            <div className="detail-section">
              <h4>Notes</h4>
              <p>{task.notes}</p>
            </div>
          )}

          {task.status === 'completed' && (
            <div className="detail-section">
              <h4>Completion Photo</h4>
              {task.completionImagePath ? (
                <img src={task.completionImagePath} alt="Completion proof" className="detail-image" />
              ) : (
                <p style={{color: '#999', fontStyle: 'italic'}}>Worker did not upload proof of work</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
