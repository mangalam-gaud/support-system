import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUsers, createUser, updateUserStatus, resetUserPassword, updateUserDetails } from '../services/api'
import toast from 'react-hot-toast'
import { Search, UserPlus, UserCheck, UserX, Edit2, Key, Users } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [editUser, setEditUser] = useState(null)
  const [resetPwUser, setResetPwUser] = useState(null)

  const page = parseInt(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || 'student'

  const load = () => {
    setLoading(true)
    getUsers({ page, role, search: search || undefined })
      .then(res => { setUsers(res.data.users); setPagination(res.data.pagination) })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, role, search])

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.set('page', '1')
    setSearchParams(p)
  }

  const handleToggleStatus = async (id, currentActive) => {
    try {
      await updateUserStatus(id, { isActive: !currentActive })
      toast.success(currentActive ? 'User deactivated' : 'User activated')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createUser(createForm)
      toast.success(`${role === 'student' ? 'Student' : 'Worker'} created!`)
      setShowCreate(false)
      setCreateForm({ name: '', email: '', password: '', role })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleEditSave = async () => {
    if (!editUser) return
    try {
      await updateUserDetails(editUser._id, { name: editUser.name, email: editUser.email })
      toast.success('User updated!')
      setEditUser(null)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleResetPassword = async () => {
    if (!resetPwUser) return
    try {
      await resetUserPassword(resetPwUser._id, resetPwUser.newPassword)
      toast.success('Password reset!')
      setResetPwUser(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>{role === 'student' ? 'Student' : 'Worker'} Management</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={16} /> Add {role === 'student' ? 'Student' : 'Worker'}
        </button>
      </div>

      {/* Role Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${role === 'student' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('role', 'student')}>
          <Users size={16} /> Students
        </button>
        <button className={`btn ${role === 'worker' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('role', 'worker')}>
          <Users size={16} /> Workers
        </button>
      </div>

      {showCreate && (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Add New {role === 'student' ? 'Student' : 'Worker'}</h3>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} required minLength={2} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={role} disabled>
                  <option value="student">{role === 'student' ? 'Student' : 'Student'}</option>
                  <option value="worker">{role === 'worker' ? 'Worker' : 'Worker'}</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add {role === 'student' ? 'Student' : 'Worker'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit User</h3>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
            </div>
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwUser && (
        <div className="modal-overlay" onClick={() => setResetPwUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reset Password - {resetPwUser.name}</h3>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={resetPwUser.newPassword || ''} onChange={e => setResetPwUser({ ...resetPwUser, newPassword: e.target.value })} placeholder="Min 6 characters" />
            </div>
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setResetPwUser(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={!resetPwUser.newPassword || resetPwUser.newPassword.length < 6}>Reset</button>
            </div>
          </div>
        </div>
      )}

      <div className="filters">
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder={`Search ${role}s...`} value={search} onChange={e => setFilter('search', e.target.value)} />
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner"></div></div> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  {role === 'worker' && <th>Rating</th>}
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                    {role === 'worker' && (
                      <td>
                        {u.rating > 0 ? (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>★ {u.rating} ({u.totalRatings})</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No ratings</span>
                        )}
                      </td>
                    )}
                    <td>
                      <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}></span>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td>{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setEditUser({ _id: u._id, name: u.name, email: u.email })} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => setResetPwUser({ _id: u._id, name: u.name, newPassword: '' })} title="Reset Password">
                        <Key size={14} />
                      </button>
                      <button className={`btn btn-sm ${u.isActive ? 'btn-danger-outline' : 'btn-success-outline'}`} onClick={() => handleToggleStatus(u._id, u.isActive)}>
                        {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>No {role}s found</p>}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>Previous</button>
              <span className="pagination-info">Page {pagination.page} of {pagination.pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= pagination.pages} onClick={() => setFilter('page', String(page + 1))}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}