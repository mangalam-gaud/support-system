import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'

export default function CreateTicket() {
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errors = {}
    if (topic.trim().length < 3) errors.topic = 'Topic must be at least 3 characters'
    if (message.trim().length < 10) errors.message = 'Message must be at least 10 characters'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('topic', topic.trim())
      formData.append('message', message.trim())
      if (image) formData.append('image', image)

      const res = await api.post('/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Ticket created!')
      navigate('/student/tickets')
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        const fe = {}
        data.errors.forEach(x => { fe[x.field] = x.message })
        setFieldErrors(fe)
        toast.error('Please fix the errors')
      } else {
        toast.error(data?.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Create New Ticket</h2>
      </div>
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Topic</label>
            <input
              type="text"
              value={topic}
              onChange={e => { setTopic(e.target.value); setFieldErrors(prev => ({ ...prev, topic: '' })) }}
              placeholder="Brief summary of your issue"
              className={fieldErrors.topic ? 'input-error' : ''}
            />
            <div className="field-footer">
              {fieldErrors.topic && <span className="field-error">{fieldErrors.topic}</span>}
              <span className="form-hint">{topic.length}/200</span>
            </div>
          </div>

          <div className="form-group">
            <label>Message</label>
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setFieldErrors(prev => ({ ...prev, message: '' })) }}
              placeholder="Describe your issue in detail..."
              rows={8}
              className={fieldErrors.message ? 'input-error' : ''}
            />
            <div className="field-footer">
              {fieldErrors.message && <span className="field-error">{fieldErrors.message}</span>}
              <span className="form-hint">{message.length}/5000</span>
            </div>
          </div>

          <div className="form-group">
            <label>Attachment (optional)</label>
            <span className="form-hint">Upload or capture an image — max 3 MB</span>

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
                  <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current.click()}>
                    <Upload size={16} /> Upload Image
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => cameraInputRef.current.click()}>
                    <Camera size={16} /> Take Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="image-preview-wrap">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button type="button" className="image-remove-btn" onClick={removeImage}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
