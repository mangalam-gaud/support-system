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
- 🔍 Track ticket status (Open → Assigned → In Progress → Resolved/Rejected)
- 💬 AI Chatbot for academic & helpdesk queries with FAQs
- 📊 Dashboard with ticket statistics
- ⭐ Rate workers after ticket completion
- 🌙 Dark/Light mode with system auto-detection

### 👨‍💼 Worker Portal
- 📋 View assigned tasks with priority sorting
- ⏯️ Start and complete tasks directly from detail page
- 📝 Add notes and upload completion proof images
- 📈 Personal task statistics dashboard

### 🛡️ Admin Portal
- 🎯 Manage all tickets (set priority, assign workers, reject, reopen)
- 👥 User management (create, activate/deactivate, reset passwords)
- 📊 Comprehensive dashboard with analytics
- 🔐 Hidden admin login at `/admin-login`
- ⚙️ AI API key management in settings (supports any provider)

### 🔒 Security Features
- JWT-based authentication with token caching
- Role-based access control (RBAC)
- Rate limiting for API protection
- Helmet.js security headers
- Input validation with express-validator
- Password hashing with bcrypt (salt rounds 12)
- CSRF protection middleware
- 15-minute inactivity timeout auto-logout
- Session: close browser = logout, refresh = stay logged in

### 🤖 AI Chatbot
- Powered by Groq API (Llama 3.3 model)
- Support for any AI provider (OpenAI, Anthropic, etc.)
- Context-aware responses
- Persistent conversation history (stored in MongoDB)
- 10 suggested questions for quick access
- FAQ system works offline without API key

### 📎 File Uploads
- Image support: JPEG, PNG, GIF, WebP
- Max size: 3MB per file
- Student ticket attachments
- Worker completion proof uploads
- Camera capture support for mobile

### 🎨 UI/UX Features
- Modern two-column detail page layout
- Color-coded status indicators
- Action buttons directly in detail view
- Responsive design for all screen sizes
- Privacy: students can't see worker emails, workers can't see student emails

---

## 🏗️ Architecture

```
support-system/
├── backend/
│   ├── middleware/        # Auth, validation, error handling, upload, CSRF
│   ├── models/            # MongoDB schemas (User, Ticket, Task, Conversation, Settings)
│   ├── routes/            # API endpoints
│   ├── uploads/           # Uploaded images
│   ├── server.js          # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components (Layout)
│   │   ├── context/       # React context (Auth, Theme)
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── App.jsx       # Main router
│   │   ├── index.css    # Global styles with CSS variables
│   │   └── main.jsx      # React entry point
│   ├── public/           # Static assets
│   ├── index.html        # Entry HTML
│   └── package.json
├── README.md
└── DEPLOYMENT.md
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
- Frontend: http://localhost:5173 (Vite default)
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
FRONTEND_URL=http://localhost:5173
GROQ_API_KEY=your-groq-api-key
AI_MODEL=llama-3.3-70b-versatile
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 🔑 Default Admin Account

**Hidden admin login:** `/admin-login`

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
| GET | `/api/auth/workers` | Get all workers (admin, sorted by rating) |
| GET | `/api/auth/users` | Get users with pagination (admin) |
| POST | `/api/auth/users` | Create user (admin) |
| PUT | `/api/auth/users/:id/status` | Toggle user status (admin) |
| PUT | `/api/auth/users/:id/password` | Reset password (admin) |
| PUT | `/api/auth/users/:id` | Update user (admin) |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets` | Get all tickets (admin) |
| GET | `/api/tickets/my-tickets` | Get my tickets (student) |
| GET | `/api/tickets/assigned` | Get assigned tickets (worker) |
| GET | `/api/tickets/:id` | Get ticket details |
| PUT | `/api/tickets/:id/priority` | Set priority (admin) |
| PUT | `/api/tickets/:id/reject` | Reject ticket (admin) |
| PUT | `/api/tickets/:id/assign` | Assign ticket (admin) |
| PUT | `/api/tickets/:id/start` | Start work (worker) |
| PUT | `/api/tickets/:id/resolve` | Resolve ticket (worker) |
| PUT | `/api/tickets/:id/rate` | Rate ticket (student) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/my-tasks` | Get my tasks (worker) |
| GET | `/api/tasks/stats` | Get task stats |
| GET | `/api/tasks/:id` | Get task details |
| PUT | `/api/tasks/:id/start` | Start task |
| PUT | `/api/tasks/:id/complete` | Complete task |
| PUT | `/api/tasks/:id/notes` | Add notes |
| PUT | `/api/tasks/:id/estimate` | Set estimate (admin) |

### Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chatbot/chat` | Send message |
| DELETE | `/api/chatbot/history` | Clear history |
| GET | `/api/chatbot/status` | Check availability |

### Settings (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/settings` | Get system settings |
| PUT | `/api/auth/settings` | Update settings |
| DELETE | `/api/auth/settings/:key` | Delete setting |
| POST | `/api/auth/verify-api-key` | Verify API key |

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT (jsonwebtoken)
- **Security:** Helmet, CORS, express-rate-limit, CSRF
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

This project is licensed under the MIT License.

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

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed step-by-step instructions.