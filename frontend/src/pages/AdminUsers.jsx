import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUsers, createUser, updateUserStatus } from '../services/api'
import toast from 'react-hot-toast'
import { Search, UserPlus, UserCheck, UserX } from 'lucide-react'
import { format } from 'date-fns'

const roles = ['', 'student', 'worker', 'admin']

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'student' })

  const page = parseInt(searchParams.get('page')) || 1
  const role = searchParams.get('role') || ''
  const search = searchParams.get('search') || ''

  const load = () => {
    setLoading(true)
    getUsers({ page, role: role || undefined, search: search || undefined })
      .then(res => { setUsers(res.data.users); setPagination(res.data.pagination) })
      .catch((err) => { console.error('Failed to load users:', err); toast.error('Failed to load users') })
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
      toast.success('User created!')
      setShowCreate(false)
      setCreateForm({ name: '', email: '', password: '', role: 'student' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>User Management</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {showCreate && (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Create New User</h3>
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
                <select value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create User</button>
            </div>
          </form>
        </div>
      )}

      <div className="filters">
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder="Search users..." value={search} onChange={e => setFilter('search', e.target.value)} />
        </div>
        <div className="filter-pills">
          {roles.map(r => (
            <button key={r} className={`pill ${role === r ? 'pill-active' : ''}`} onClick={() => setFilter('role', r)}>
              {r || 'All'}
            </button>
          ))}
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
                  <th>Rating</th>
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
                    <td>
                      {u.role === 'worker' ? (
                        u.rating > 0 ? (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            ★ {u.rating} ({u.totalRatings})
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No ratings</span>
                        )
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}></span>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td>{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.isActive ? 'btn-danger-outline' : 'btn-success-outline'}`}
                        onClick={() => handleToggleStatus(u._id, u.isActive)}
                      >
                        {u.isActive ? <><UserX size={14} /> Deactivate</> : <><UserCheck size={14} /> Activate</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
