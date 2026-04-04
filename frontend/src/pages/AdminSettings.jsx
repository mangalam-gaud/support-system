import { useState, useEffect } from 'react'
import { getSystemSettings, updateSystemSettings, verifyApiKey } from '../services/api'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const [key, setKey] = useState('')
  const [currentKey, setCurrentKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchKey()
  }, [])

  const fetchKey = async () => {
    try {
      const res = await getSystemSettings()
      const settings = res.data.settings || {}
      let k = ''
      Object.keys(settings).forEach(x => {
        if (x.toLowerCase().includes('api_key') && settings[x]) {
          k = settings[x]
        }
      })
      setCurrentKey(k)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!key.trim()) {
      toast.error('Please enter API key')
      return
    }
    
    // Validate key format before sending
    const trimmedKey = key.trim()
    if (trimmedKey.length < 10) {
      toast.error('API key seems too short')
      return
    }
    
    setSaving(true)
    try {
      // First verify the API key
      const verifyRes = await verifyApiKey(trimmedKey)
      
      if (verifyRes.data.valid) {
        // Key is valid, save it
        await updateSystemSettings({ key: 'AI_API_KEY', value: trimmedKey })
        setCurrentKey(trimmedKey)
        setKey('')
        toast.success(`API key verified and saved (${verifyRes.data.provider})`)
      } else {
        // Key is invalid, show error
        toast.error(verifyRes.data.message || 'Invalid API key')
      }
    } catch (err) {
      console.error('Save error:', err)
      if (err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to verify and save API key')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Remove API key?')) return
    setSaving(true)
    try {
      await updateSystemSettings({ key: 'AI_API_KEY', value: '' })
      setCurrentKey('')
      toast.success('API key removed')
    } catch (err) {
      toast.error('Failed to remove')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><div className="page-loading"><div className="spinner"></div></div></div>

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI API Settings</h2>
      </div>

      <div style={{ maxWidth: 500 }}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Current API Key</h3>
          {currentKey ? (
            <div style={styles.keyBox}>
              <span style={styles.keyText}>{currentKey}</span>
              <button onClick={handleDelete} style={styles.deleteBtn} disabled={saving}>
                Remove
              </button>
            </div>
          ) : (
            <p style={styles.noKey}>No API key configured</p>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>{currentKey ? 'Update API Key' : 'Add API Key'}</h3>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter API key..."
            style={styles.input}
          />
          <button onClick={handleSave} disabled={saving || !key.trim()} style={styles.saveBtn}>
            {saving ? 'Verifying...' : 'Save'}
          </button>
          <p style={styles.hint}>Supported: Groq, OpenAI (sk-), Anthropic (sk-ant-), Google</p>
        </div>
      </div>

      <style>{`
        .page { padding: 20px; }
        .page-header { margin-bottom: 20px; }
        .page-header h2 { margin: 0; font-size: 1.5rem; }
      `}</style>
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--card)',
    padding: 20,
    borderRadius: 8,
    marginBottom: 16,
    boxShadow: 'var(--shadow)'
  },
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: '1rem'
  },
  keyBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: 'var(--border)',
    borderRadius: 6
  },
  keyText: {
    flex: 1,
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  },
  deleteBtn: {
    padding: '6px 12px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  },
  noKey: {
    color: 'var(--text-secondary)',
    margin: 0
  },
  input: {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    border: '1px solid var(--border)',
    marginBottom: 12,
    boxSizing: 'border-box'
  },
  saveBtn: {
    padding: '10px 20px',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer'
  },
  hint: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginTop: 8,
    margin: 0
  }
}