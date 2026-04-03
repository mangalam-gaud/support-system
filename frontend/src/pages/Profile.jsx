import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile, changePassword, uploadProfileImage } from '../services/api'
import toast from 'react-hot-toast'
import { User, Lock, Save, Camera, Upload } from 'lucide-react'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileLoading, setProfileLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(user?.profileImage || null)
  const [imageLoading, setImageLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      const res = await updateProfile({ name, email })
      updateUser(res.data.user)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally { setProfileLoading(false) }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwLoading(true)
    try {
      await changePassword({ currentPassword, newPassword })
      toast.success('Password changed!')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally { setPwLoading(false) }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files (JPEG, PNG, GIF, WebP) are allowed.')
      return
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB.')
      return
    }
    
    setProfileImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleImageUpload = async () => {
    if (!profileImage) return
    
    setImageLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', profileImage)
      
      const res = await uploadProfileImage(formData)
      updateUser(res.data.user)
      setProfileImage(null)
      toast.success('Profile image updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image')
    } finally { setImageLoading(false) }
  }

  const getImageSrc = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return path
  }

  return (
    <div className="page">
      <div className="page-header"><h2>Profile Settings</h2></div>

      <div className="profile-grid">
        <div className="form-card">
          <h3><User size={18} /> Profile Information</h3>
          
          <div className="profile-image-section">
            <div className="profile-image-container">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="profile-image-preview" />
              ) : (
                <div className="profile-image-placeholder">
                  <User size={48} />
                </div>
              )}
              <button 
                type="button" 
                className="profile-image-edit"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={16} />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
            />
            
            {profileImage && (
              <div className="profile-image-actions">
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={handleImageUpload}
                  disabled={imageLoading}
                >
                  <Upload size={14} /> {imageLoading ? 'Uploading...' : 'Upload'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm"
                  onClick={() => { setProfileImage(null); setImagePreview(user?.profileImage || null) }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input type="text" value={user?.role} disabled className="input-disabled" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              <Save size={16} /> {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="form-card">
          <h3><Lock size={18} /> Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={pwLoading}>
              <Lock size={16} /> {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}