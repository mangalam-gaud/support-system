# 🎓 MANGAUD Support System - Student Support Ticket Management

<p align="center">
  <img src="https://img.shields.io/badge/MERN-Stack-orange?style=for-the-badge&logo=mongodb&logoColor=white" alt="MERN Stack">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  A full-stack student support system with AI-powered chatbot, ticket management, role-based access, and image uploads.
</p>

---

## ✨ Features

### 👨‍🎓 Student Portal
- 📝 Create support tickets with image attachments (up to 3MB)
- 🔍 Track ticket status (Open → Assigned → In Progress → Resolved)
- 💬 AI Chatbot for academic & helpdesk queries
- 📊 Dashboard with ticket statistics

### 👨‍💼 Worker Portal
- 📋 View assigned tasks
- ⏯️ Start and complete tasks
- 📝 Add notes and upload completion proof images
- 📈 Personal task statistics

### 🛡️ Admin Portal
- 🎯 Manage all tickets (set priority, assign workers, reject)
- 👥 User management (create, activate/deactivate)
- 📊 Comprehensive dashboard with analytics
- 🔐 Secure admin access

### 🔒 Security Features
- JWT-based authentication with token caching
- Role-based access control (RBAC)
- Rate limiting for API protection
- Helmet.js security headers
- Input validation with express-validator
- Password hashing with bcrypt (salt rounds 12)

### 🤖 AI Chatbot
- Powered by Groq API (Llama 3.3 model)
- Context-aware responses from college website data
- Persistent conversation history (stored in MongoDB)
- Rate limit protection

### 📎 File Uploads
- Image support: JPEG, PNG, GIF, WebP
- Max size: 3MB per file
- Student ticket attachments
- Worker completion proof uploads

---

## 🏗️ Architecture

```
support-system/
├── backend/
│   ├── middleware/        # Auth, validation, error handling, upload
│   ├── models/            # MongoDB schemas (User, Ticket, Task, Conversation)
│   ├── routes/            # API endpoints
│   ├── uploads/           # Uploaded images
│   ├── server.js          # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context (Auth)
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── App.jsx       # Main router
│   │   └── index.css    # Global styles
│   ├── public/           # Static assets
│   ├── index.html        # Entry HTML
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/support-system.git
cd support-system
```

2. **Setup Backend**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

3. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## ⚙️ Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/support-system
JWT_SECRET=your-super-secret-key-at-least-32-chars
JWT_EXPIRES_IN=24h
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
GROQ_API_KEY=your-groq-api-key
AI_MODEL=llama-3.3-70b-versatile
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 🔑 Default Admin Account

After first run, you can create the default admin:

```bash
curl -X POST http://localhost:5000/api/auth/_seed
```

Or through the hidden admin login at `/admin-login` (requires admin auth).

**Default credentials:**
- Email: `admin@mangaud.com`
- Password: `admin@mangaud`

> ⚠️ **Change the default admin password immediately in production!**

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |
| PUT | `/api/auth/change-password` | Change password |
| POST | `/api/auth/logout` | Logout |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets` | Get all tickets (admin) |
| GET | `/api/tickets/my-tickets` | Get my tickets |
| GET | `/api/tickets/assigned` | Get assigned tickets (worker) |
| GET | `/api/tickets/:id` | Get ticket details |
| PUT | `/api/tickets/:id/priority` | Set priority (admin) |
| PUT | `/api/tickets/:id/reject` | Reject ticket (admin) |
| PUT | `/api/tickets/:id/assign` | Assign ticket (admin) |
| PUT | `/api/tickets/:id/start` | Start work (worker) |
| PUT | `/api/tickets/:id/resolve` | Resolve ticket (worker) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/my-tasks` | Get my tasks (worker) |
| GET | `/api/tasks/stats` | Get task stats |
| GET | `/api/tasks/:id` | Get task details |
| PUT | `/api/tasks/:id/start` | Start task |
| PUT | `/api/tasks/:id/complete` | Complete task |
| PUT | `/api/tasks/:id/notes` | Add notes |

### Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chatbot/chat` | Send message |
| DELETE | `/api/chatbot/history` | Clear history |
| GET | `/api/chatbot/status` | Check availability |

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT (jsonwebtoken)
- **Security:** Helmet, CORS, express-rate-limit
- **Validation:** express-validator
- **File Upload:** Multer
- **Password Hashing:** bcryptjs

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
- **Date Handling:** date-fns

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- MongoDB for the database
- Express.js for the web framework
- React for the frontend
- Groq for the AI capabilities
- All open-source library maintainers

---

<p align="center">Made with ❤️ for educational institutions</p>

---

## 🚀 Deployment Guide

### Quick Deploy

**Backend (Render):**
1. Push code to GitHub
2. Connect repo to Render
3. Set environment variables (see below)
4. Deploy

**Frontend (Vercel):**
1. Connect repo to Vercel
2. Configure: Framework = Vite, Build = npm run build, Output = dist
3. Deploy

### Environment Variables

#### Backend (on Render)
| Variable | Value |
|----------|-------|
| PORT | 10000 |
| NODE_ENV | production |
| MONGODB_URI | mongodb+srv://... |
| JWT_SECRET | 64-character random string |
| JWT_EXPIRES_IN | 24h |
| FRONTEND_URL | https://your-vercel-app.vercel.app |
| GROQ_API_KEY | (optional) get from console.groq.com |
| AI_MODEL | llama-3.3-70b-versatile |

#### Frontend (on Vercel)
| Variable | Value |
|----------|-------|
| VITE_API_URL | https://your-render-app.onrender.com |

### Full Deployment Guide
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed step-by-step instructions.