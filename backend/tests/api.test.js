const request = require('supertest')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const auth = require('../middleware/auth')

const app = require('../server')

let testUsers = {}

const generateToken = (userId, role) => {
  return jwt.sign({ userId: userId.toString(), role }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

beforeAll(async () => {
  await User.deleteMany({ email: /test/ })
  
  const student = new User({ name: 'Test Student', email: 'test-student@test.com', password: 'test123', role: 'student' })
  await student.save()
  testUsers.student = student
  
  const worker = new User({ name: 'Test Worker', email: 'test-worker@test.com', password: 'test123', role: 'worker', isActive: true })
  await worker.save()
  testUsers.worker = worker
  
  const admin = new User({ name: 'Test Admin', email: 'test-admin@test.com', password: 'test123', role: 'admin' })
  await admin.save()
  testUsers.admin = admin
  
  testUsers.studentToken = generateToken(student._id, 'student')
  testUsers.workerToken = generateToken(worker._id, 'worker')
  testUsers.adminToken = generateToken(admin._id, 'admin')
})

afterAll(async () => {
  await User.deleteMany({ email: /test/ })
  await mongoose.connection.close()
  auth.stopCacheCleanup()
})

describe('Health Check', () => {
  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should reject registration without required fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'Test' })
      expect(res.status).toBe(400)
    })

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'Test', email: 'invalid', password: '123456' })
      expect(res.status).toBe(400)
    })

    it('should reject short password', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'Test', email: 'test@example.com', password: '123' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should reject empty credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({})
      expect(res.status).toBe(400)
    })

    it('should reject invalid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'nonexistent@test.com', password: 'wrong' })
      expect(res.status).toBe(401)
    })
  })
})

describe('Ticket Endpoints', () => {
  describe('GET /api/tickets', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/tickets')
      expect(res.status).toBe(401)
    })

    it('should accept valid student token', async () => {
      const res = await request(app).get('/api/tickets').set('Authorization', `Bearer ${testUsers.studentToken}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('tickets')
      expect(res.body).toHaveProperty('pagination')
    })
  })

  describe('POST /api/tickets', () => {
    it('should reject without authentication', async () => {
      const res = await request(app).post('/api/tickets').send({ topic: 'Test', message: 'Test message here' })
      expect(res.status).toBe(401)
    })

    it('should reject student token without required fields', async () => {
      const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${testUsers.studentToken}`).send({})
      expect(res.status).toBe(400)
    })

    it('should reject short topic', async () => {
      const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${testUsers.studentToken}`).send({ topic: 'ab', message: 'Valid message content here' })
      expect(res.status).toBe(400)
    })

    it('should reject short message', async () => {
      const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${testUsers.studentToken}`).send({ topic: 'Valid topic', message: 'short' })
      expect(res.status).toBe(400)
    })

    it('should create valid ticket', async () => {
      const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${testUsers.studentToken}`).send({ topic: 'Valid Topic', message: 'This is a valid test message with enough characters' })
      expect(res.status).toBe(201)
      expect(res.body.ticket).toHaveProperty('ticketId')
    })
  })

  describe('Worker endpoints', () => {
    it('should reject worker from student endpoints', async () => {
      const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${testUsers.workerToken}`).send({ topic: 'Test', message: 'Test message here' })
      expect(res.status).toBe(403)
    })
  })

  describe('Admin endpoints', () => {
    it('should allow admin access to all tickets', async () => {
      const res = await request(app).get('/api/tickets').set('Authorization', `Bearer ${testUsers.adminToken}`)
      expect(res.status).toBe(200)
    })

    it('should allow admin to get workers', async () => {
      const res = await request(app).get('/api/auth/workers').set('Authorization', `Bearer ${testUsers.adminToken}`)
      expect(res.status).toBe(200)
    })

    it('should reject non-admin access to workers', async () => {
      const res = await request(app).get('/api/auth/workers').set('Authorization', `Bearer ${testUsers.studentToken}`)
      expect(res.status).toBe(403)
    })
  })
})

describe('Chatbot Endpoints', () => {
  it('should require authentication', async () => {
    const res = await request(app).post('/api/chatbot/chat').send({ message: 'Hello' })
    expect(res.status).toBe(401)
  })

  it('should accept valid student message', async () => {
    const res = await request(app).post('/api/chatbot/chat').set('Authorization', `Bearer ${testUsers.studentToken}`).send({ message: 'Hello' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('reply')
  })

  it('should reject empty message', async () => {
    const res = await request(app).post('/api/chatbot/chat').set('Authorization', `Bearer ${testUsers.studentToken}`).send({ message: '' })
    expect(res.status).toBe(400)
  })
})

describe('Input Validation', () => {
  it('should sanitize search input', async () => {
    const res = await request(app).get('/api/tickets?search=$gt').set('Authorization', `Bearer ${testUsers.studentToken}`)
    expect(res.status).toBe(200)
  })

  it('should accept XSS content (stored as-is)', async () => {
    const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${testUsers.studentToken}`).send({ topic: 'Test', message: '<script>alert(1)</script>' })
    expect(res.status).toBe(201)
  })
})