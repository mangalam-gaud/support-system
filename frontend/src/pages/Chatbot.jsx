import { useState, useEffect, useRef } from 'react'
import { sendChatMessage, clearChatHistory, getChatbotStatus } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Send, Trash2, Bot, User } from 'lucide-react'

export default function Chatbot() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState(true)
  const messagesEnd = useRef(null)

  useEffect(() => {
    getChatbotStatus().then(res => setAvailable(res.data.available)).catch(() => setAvailable(false))
    setMessages([{ role: 'assistant', content: 'Hello! I\'m your AI support assistant. How can I help you today?' }])
  }, [])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await sendChatMessage({ message: userMsg })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      const errMsg = err.response?.data?.reply || err.response?.data?.message || 'Sorry, something went wrong. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try { await clearChatHistory() } catch {}
    setMessages([{ role: 'assistant', content: 'Conversation cleared. How can I help you?' }])
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Chatbot</h2>
        <button className="btn btn-outline btn-sm" onClick={handleClear}>
          <Trash2 size={14} /> Clear Chat
        </button>
      </div>

      {!available && (
        <div className="alert alert-warning">
          The AI chatbot is not configured. Contact admin to set up the OpenAI API key.
        </div>
      )}

      <div className="chatbot-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message chat-${msg.role}`}>
              <div className="chat-avatar">
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="chat-bubble">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-message chat-assistant">
              <div className="chat-avatar"><Bot size={16} /></div>
              <div className="chat-bubble chat-typing"><span></span><span></span><span></span></div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        <form onSubmit={handleSend} className="chat-input-form">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={available ? 'Type your message...' : 'Chatbot unavailable'}
            disabled={!available} maxLength={2000} />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || loading || !available}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
