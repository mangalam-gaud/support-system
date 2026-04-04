import { useState, useEffect, useRef } from 'react'
import { sendChatMessage, clearChatHistory, getChatbotStatus } from '../services/api'
import { Send, Trash2, Bot, User } from 'lucide-react'

const formatMessage = (text) => {
  if (!text) return ''
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/^(\d+\.)\s+(.*)$/gm, '<li>$1 $2</li>')
  formatted = formatted.replace(/^[-•]\s+(.*)$/gm, '<li>• $1</li>')
  const liRegex = /<li>.*?<\/li>/g
  const matches = formatted.match(liRegex)
  if (matches && matches.length > 1) {
    formatted = '<ul>' + formatted.replace(/<\/li>/g, '</li>') + '</ul>'
  }
  formatted = formatted.replace(/\n/g, '<br>')
  return formatted
}

const faqAnswers = {
  'How do I create a new support ticket?': '**Creating a Support Ticket:**\n\n1. Login to your student account\n2. Navigate to "My Tickets" section\n3. Click the "New Ticket" button\n4. Enter a clear topic for your issue\n5. Describe your problem in detail\n6. You can attach an image if needed (max 3MB)\n7. Click Submit - our team will review it!',
  
  'What is the status of my ticket?': '**Checking Ticket Status:**\n\n1. Go to "My Tickets" in your sidebar\n2. You\'ll see all your tickets listed there\n3. Each ticket shows its current status:\n• Open - Just submitted\n• Assigned - Worker assigned\n• In Progress - Being worked on\n• Resolved - Completed\n• Rejected - Cannot be fulfilled',
  
  'How can I reset my password?': '**Resetting Your Password:**\n\n**Option 1 - Through Profile:**\n1. Click your profile icon\n2. Select "Change Password"\n3. Enter your current password\n4. Create and confirm a new password\n5. Save changes\n\n**Option 2 - Forgot Password:**\n• Contact admin directly to reset your password\n• Admin will help you create a new one',
  
  'How do I change my profile photo?': '**Updating Profile Photo:**\n\n1. Click your profile icon in the sidebar\n2. Look for the camera/upload icon\n3. Select your photo from your device\n4. Image will be updated automatically\n5. Save any other profile changes',
  
  'Can I attach images to my ticket?': '**Attaching Images to Tickets:**\n\nYes! When creating a ticket:\n1. Look for the image upload icon\n2. Click to select your image\n3. Maximum file size: 3MB\n4. Supported formats: JPG, PNG, GIF, WebP\n5. This helps us understand your issue better',
  
  'How do I rate a worker?': '**Rating a Worker:**\n\n1. Find your resolved ticket\n2. Look for "Rate Worker" button\n3. Give stars (1-5 stars)\n4. Write a brief review about your experience\n5. Submit your feedback\n\nYour ratings help improve our service!',
  
  'Where can I see all my tickets?': '**Viewing All Your Tickets:**\n\n1. Login as a student\n2. Click "My Tickets" in the sidebar\n3. You\'ll see a list of all submitted tickets\n4. Click on any ticket to see full details\n5. Use filters to sort by status',
  
  'What do ticket priority levels mean?': '**Understanding Ticket Priority:**\n\n• **Low** - General questions, non-urgent issues\n• **Medium** - Standard problems that need attention\n• **High** - Important issues affecting your work\n• **Urgent** - Critical problems needing immediate help\n\nPriority is assigned by admin based on your issue description.',
  
  'How do I contact support?': '**Contacting Support:**\n\n1. Create a new support ticket\n2. Clearly describe your issue or question\n3. Our support team will respond through the ticket\n4. You can also use the AI Chatbot for quick help\n5. For urgent matters, mark priority as High',
  
  'How do I logout?': '**Logging Out:**\n\n1. Click your profile icon in the sidebar\n2. Click the "Logout" button\n3. You\'ll be redirected to the login page\n4. Your session will be securely ended\n\nNote: Logging out protects your account!'
}

export default function Chatbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState(false)
  const messagesEnd = useRef(null)

  useEffect(() => {
    getChatbotStatus()
      .then(res => setAvailable(res.data.available))
      .catch(() => setAvailable(false))
    setMessages([{ role: 'assistant', content: 'Hello! How can I help you today?' }])
  }, [])

  const quickQuestions = [
    'How do I create a new support ticket?',
    'What is the status of my ticket?',
    'How can I reset my password?',
    'How do I change my profile photo?',
    'Can I attach images to my ticket?',
    'How do I rate a worker?',
    'Where can I see all my tickets?',
    'What do ticket priority levels mean?',
    'How do I contact support?',
    'How do I logout?'
  ]

  const showQuickQuestions = true

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

    const faqKey = Object.keys(faqAnswers).find(k => userMsg.toLowerCase().includes(k.toLowerCase()))

    if (!available && faqKey) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: faqAnswers[faqKey] }])
        setLoading(false)
      }, 500)
    } else if (!available) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'AI ChatBot is offline. Please contact admin to enable it. You can still ask me common questions from the suggestions!' 
        }])
        setLoading(false)
      }, 500)
    } else {
      try {
        const res = await sendChatMessage({ message: userMsg })
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
      } catch (err) {
        const errMsg = err.response?.data?.reply || err.response?.data?.message || 'Sorry, something went wrong.'
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
      } finally {
        setLoading(false)
      }
    }
  }

  const handleClear = async () => {
    try { await clearChatHistory() } catch {}
    setMessages([{ role: 'assistant', content: 'Conversation cleared. How can I help you?' }])
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Chatbot {!available && <span style={{fontSize:'0.8rem',fontWeight:'normal'}}>(Offline Mode)</span>}</h2>
        <button className="btn btn-outline btn-sm" onClick={handleClear}>
          <Trash2 size={14} /> Clear
        </button>
      </div>

      {!available && (
        <div className="alert alert-warning">AI ChatBot is offline. I can still answer common questions!</div>
      )}

      <div className="chatbot-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message chat-${msg.role}`}>
              <div className="chat-avatar">
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="chat-bubble" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
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

        {showQuickQuestions && (
          <div className="quick-questions">
            {quickQuestions.slice(0, 4).map((q, i) => (
              <button key={i} className="quick-btn" onClick={() => {
                setInput(q)
                setTimeout(() => document.querySelector('.chat-input-form button[type="submit"]').click(), 100)
              }}>{q}</button>
            ))}
            {quickQuestions.slice(4).map((q, i) => (
              <button key={i+4} className="quick-btn desktop-only" onClick={() => {
                setInput(q)
                setTimeout(() => document.querySelector('.chat-input-form button[type="submit"]').click(), 100)
              }}>{q}</button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="chat-input-form">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Type your message..." disabled={loading} maxLength={2000} />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || loading}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}