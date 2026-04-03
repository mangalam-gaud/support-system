================================================================================
                    DEPLOYMENT GUIDE - MANGAUD Support System
================================================================================

This guide covers deploying the full-stack Support System to:
- Backend: Render (Node.js/Express)
- Frontend: Vercel (React/Vite)

================================================================================
                            PREREQUISITES
================================================================================

1. Git repository with your code pushed
2. MongoDB database (MongoDB Atlas free tier recommended)
3. Vercel account (for frontend)
4. Render account (for backend)
5. Groq API key (optional - for AI chatbot)

================================================================================
                         PART 1: MONGODB ATLAS SETUP
================================================================================

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account and sign in
3. Create new project: "Support System"
4. Build a Database:
   - Select "Free" tier (M0)
   - Choose a cloud provider (AWS recommended)
   - Select a region near you
5. Create Database User:
   - Username: support_admin
   - Password: (generate a strong password, save it!)
6. Network Access:
   - Go to Network Access → Add IP Address
   - Select "Allow Access from Anywhere" (0.0.0.0/0)
7. Get Connection String:
   - Database → Connect → Connect your application
   - Copy the connection string
   - Replace <password> with your actual password

================================================================================
                         PART 2: BACKEND (RENDER)
================================================================================

Step 1: Prepare Backend
-----------------------
1. Create a file `backend/render.yaml` (optional - for reference)
2. Ensure your package.json has:
   {
     "scripts": {
       "start": "node server.js",
       "build": "echo 'No build required'"
     }
   }

Step 2: Deploy to Render
-------------------------
1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: support-system-api
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   - Plan: Free

5. Environment Variables (Add these):
   - PORT: 10000
   - NODE_ENV: production
   - MONGODB_URI: mongodb+srv://support_admin:YOUR_PASSWORD@cluster0.xxx.mongodb.net/support-system?retryWrites=true&w=majority
   - JWT_SECRET: (generate a strong random string - 64 chars)
   - JWT_EXPIRES_IN: 24h
   - FRONTEND_URL: https://your-app.vercel.app
   - GROQ_API_KEY: (optional - get from https://console.groq.com)
   - AI_MODEL: llama-3.3-70b-versatile
   - RATE_LIMIT_WINDOW_MS: 900000
   - RATE_LIMIT_MAX: 100

6. Click "Create Web Service"

Step 3: Verify Backend
----------------------
- Wait 2-3 minutes for deployment
- Visit: https://support-system-api.onrender.com/api/health
- Should return: {"status":"ok","uptime":...}

================================================================================
                         PART 3: FRONTEND (VERCEL)
================================================================================

Step 1: Configure Frontend
-------------------------
1. Create `frontend/vite.config.js`:
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     server: {
       port: 3000
     }
   })

2. Update `frontend/src/services/api.js` base URL:
   - For production, change baseURL to your Render URL
   - But with Vercel proxy, it should work automatically

Step 2: Deploy to Vercel
------------------------
1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
   - Environment Variables:
     - VITE_API_URL: https://support-system-api.onrender.com/api

5. Click "Deploy"

Step 3: Configure Proxies (Alternative Approach)
-------------------------------------------------
If you want to proxy API calls through Vercel:

1. Create `frontend/vite.config.js`:
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     server: {
       port: 3000,
       proxy: {
         '/api': {
           target: 'https://support-system-api.onrender.com',
           changeOrigin: true,
           secure: true
         },
         '/uploads': {
           target: 'https://support-system-api.onrender.com',
           changeOrigin: true,
           secure: true
         }
       }
     }
   })

2. For production, Vercel automatically configures proxy in vercel.json

Step 4: Create vercel.json
---------------------------
Create `frontend/vercel.json` in the frontend folder:
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://support-system-api.onrender.com/api/:path*" },
    { "source": "/uploads/:path*", "destination": "https://support-system-api.onrender.com/uploads/:path*" }
  ]
}

================================================================================
                         PART 4: VERIFY DEPLOYMENT
================================================================================

1. Frontend URL: https://your-app.vercel.app
2. Backend URL: https://support-system-api.onrender.com

Test these endpoints:
- Health: https://support-system-api.onrender.com/api/health
- Login: POST https://support-system-api.onrender.com/api/auth/login

================================================================================
                         PART 5: ADMIN SETUP
================================================================================

After deployment, create admin user:

1. First register a user via the frontend
2. Then manually update in MongoDB:
   - Find your user in MongoDB Atlas
   - Update role from "student" to "admin"

Or use the seed endpoint (if enabled):
- POST https://support-system-api.onrender.com/api/auth/_seed

================================================================================
                         PART 6: ENVIRONMENT VARIABLES SUMMARY
================================================================================

Backend (.env):
--------------
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-64-character-random-string
JWT_EXPIRES_IN=24h
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
GROQ_API_KEY=your-groq-api-key (optional)
AI_MODEL=llama-3.3-70b-versatile

Frontend:
---------
VITE_API_URL=https://support-system-api.onrender.com

================================================================================
                              TROUBLESHOOTING
================================================================================

Issue: 502 Bad Gateway (Backend)
Solution: Check that PORT environment variable is set to 10000 on Render

Issue: CORS errors
Solution: Ensure FRONTEND_URL is set correctly in backend environment variables

Issue: MongoDB connection failed
Solution: Check MONGODB_URI format, ensure IP is allowed in MongoDB Atlas

Issue: Static files not loading
Solution: Ensure /uploads is properly proxied or served

Issue: JWT errors
Solution: Ensure JWT_SECRET is the same as in your local .env

================================================================================
                              DEPLOYMENT COMPLETE!
================================================================================