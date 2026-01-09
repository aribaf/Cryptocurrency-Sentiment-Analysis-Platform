# DEPLOYMENT GUIDE

## Backend (Render)

### Environment Variables
```
BACKEND_URL=https://your-app.onrender.com
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=appdb
SECRET_KEY=<generate-random-secret>
JWT_ALG=HS256
JWT_EXP_MINUTES=60
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://your-app.onrender.com/api/auth/google/callback
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=<your-app-password>
```

### Build Command
```
pip install -r requirements.txt
```

### Start Command
```
uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

---

## Frontend (Vercel)

### Environment Variables
```
VITE_API_BASE=https://your-backend.onrender.com
```

### Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `crypto-sentiment-frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

---

## Google OAuth Console

### Update Authorized Redirect URIs
Add these to your Google Cloud Console:
- `https://your-backend.onrender.com/api/auth/google/callback`

### Update Authorized JavaScript Origins
- `https://your-frontend.vercel.app`
- `https://your-backend.onrender.com`

---

## MongoDB Atlas

### Network Access
Add Render IP or allow all (`0.0.0.0/0`) for Render deployment

### Connection String
Use the connection string format:
```
mongodb+srv://username:password@cluster.mongodb.net/appdb?retryWrites=true&w=majority
```

---

## Testing After Deployment

1. Test OAuth: `https://your-frontend.vercel.app/login`
2. Test API: `https://your-backend.onrender.com/`
3. Check Admin Panel: `https://your-frontend.vercel.app/admin`
4. Verify CORS in browser console
