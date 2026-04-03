import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import StudentTickets from '../pages/StudentTickets'
import * as api from '../services/api'

vi.mock('../services/api')

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('StudentTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify({ id: '123', role: 'student', name: 'Test' }))
  })

  it('renders loading state initially', () => {
    api.getStudentTickets.mockImplementation(() => new Promise(() => {}))
    renderWithRouter(<StudentTickets />)
    expect(document.querySelector('.spinner')).toBeTruthy()
  })

  it('renders empty state when no tickets', async () => {
    api.getStudentTickets.mockResolvedValue({ data: { tickets: [], pagination: { pages: 1 } } })
    renderWithRouter(<StudentTickets />)
    await waitFor(() => {
      expect(screen.getByText(/no tickets found/i)).toBeTruthy()
    })
  })

  it('renders ticket cards when tickets exist', async () => {
    const mockTickets = [
      {
        _id: '1',
        ticketId: 'TKT-1',
        topic: 'Test Topic',
        message: 'Test message for ticket',
        status: 'open',
        createdAt: '2024-01-01',
        priority: null,
        assignedWorker: null,
        rating: null
      }
    ]
    api.getStudentTickets.mockResolvedValue({ 
      data: { 
        tickets: mockTickets, 
        pagination: { page: 1, pages: 1 } 
      } 
    })
    renderWithRouter(<StudentTickets />)
    await waitFor(() => {
      expect(screen.getByText('TKT-1')).toBeTruthy()
      expect(screen.getByText('Test Topic')).toBeTruthy()
    })
  })

  it('filters tickets by status', async () => {
    const mockTickets = [
      { _id: '1', ticketId: 'TKT-1', topic: 'Test', message: 'Test', status: 'open', createdAt: '2024-01-01', priority: null, assignedWorker: null, rating: null }
    ]
    api.getStudentTickets.mockResolvedValue({ 
      data: { tickets: mockTickets, pagination: { page: 1, pages: 1 } } 
    })
    renderWithRouter(<StudentTickets />)
    
    await waitFor(() => {
      expect(screen.getByText('TKT-1')).toBeTruthy()
    })
    
    const resolvedButton = screen.getByText('resolved')
    fireEvent.click(resolvedButton)
    
    expect(api.getStudentTickets).toHaveBeenCalledWith(expect.objectContaining({ status: 'resolved' }))
  })
})