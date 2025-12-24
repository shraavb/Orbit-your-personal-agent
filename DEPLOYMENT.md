# Deployment Guide

This guide covers deploying Orbit to production cloud platforms. The recommended setup is:
- **Frontend**: Vercel (static hosting with CDN)
- **Backend**: Railway or Render (containerized Python app)
- **Database**: Managed PostgreSQL (included with Railway/Render)

## Quick Start

For the fastest deployment:
1. Deploy backend to Railway or Render
2. Deploy frontend to Vercel
3. Configure environment variables
4. Connect frontend to backend URL

---

## Frontend Deployment (Vercel)

### Prerequisites
- GitHub repository connected to Vercel
- Backend URL (from Railway/Render deployment)

### Deploy Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Framework preset: Vite

3. **Configure Environment Variables**

   In Vercel project settings → Environment Variables:
   - `VITE_API_URL`: Your backend URL (e.g., `https://orbit-api.up.railway.app/api`)

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Your app will be live at `https://your-project.vercel.app`

### Manual Deployment (via CLI)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend directory
cd frontend
vercel

# For production
vercel --prod
```

---

## Backend Deployment (Railway)

### Prerequisites
- Railway account ([railway.app](https://railway.app))
- API keys: Anthropic, ElevenLabs

### Deploy Steps

1. **Install Railway CLI** (optional, can use web dashboard)
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create New Project**

   Via Web Dashboard:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

   Via CLI:
   ```bash
   railway init
   railway link
   ```

3. **Add PostgreSQL Database**
   - In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL` environment variable

4. **Configure Environment Variables**

   In Railway dashboard → Variables tab:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ELEVENLABS_API_KEY=...
   LANGSMITH_API_KEY=... (optional)

   # CORS - Add your Vercel frontend URL
   CORS_ORIGINS=https://your-project.vercel.app

   # Whisper Configuration
   WHISPER_MODEL_SIZE=base
   WHISPER_DEVICE=cpu
   WHISPER_COMPUTE_TYPE=int8

   # Optional: Messaging Integrations
   TWILIO_ACCOUNT_SID=...
   TWILIO_AUTH_TOKEN=...
   SLACK_BOT_TOKEN=...
   ```

5. **Deploy**
   - Railway automatically detects the `Dockerfile` and deploys
   - Wait for deployment to complete
   - Copy your app URL (e.g., `https://orbit-api.up.railway.app`)

6. **Test Deployment**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

---

## Backend Deployment (Render)

### Prerequisites
- Render account ([render.com](https://render.com))
- GitHub repository
- API keys: Anthropic, ElevenLabs

### Deploy Steps

1. **Create New Web Service**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: `orbit-backend`
   - **Runtime**: Python
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Starter ($7/month)

3. **Add PostgreSQL Database**
   - From dashboard, click "New +" → "PostgreSQL"
   - Name: `orbit-db`
   - Plan: Starter
   - Copy the Internal Database URL

4. **Set Environment Variables**

   In web service settings → Environment:
   ```bash
   DATABASE_URL=<from PostgreSQL instance>
   ANTHROPIC_API_KEY=sk-ant-...
   ELEVENLABS_API_KEY=...
   LANGSMITH_API_KEY=... (optional)
   CORS_ORIGINS=https://your-project.vercel.app
   WHISPER_MODEL_SIZE=base
   WHISPER_DEVICE=cpu
   WHISPER_COMPUTE_TYPE=int8
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy
   - Copy your app URL (e.g., `https://orbit-api.onrender.com`)

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com | `sk-ant-api03-...` |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API key | `...` |
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Railway/Render) | `postgresql://...` |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend URLs | `https://app.vercel.app,https://app2.vercel.app` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LANGSMITH_API_KEY` | LangSmith observability | None |
| `LANGSMITH_PROJECT` | LangSmith project name | `orbit-voice-agent` |
| `WHISPER_MODEL_SIZE` | Whisper model: tiny, base, small, medium, large | `base` |
| `WHISPER_DEVICE` | cpu or cuda | `cpu` |
| `WHISPER_COMPUTE_TYPE` | int8, float16, float32 | `int8` |
| `TWILIO_ACCOUNT_SID` | For SMS/WhatsApp | None |
| `TWILIO_AUTH_TOKEN` | For SMS/WhatsApp | None |
| `SLACK_BOT_TOKEN` | For Slack integration | None |
| `GMAIL_CREDENTIALS_FILE` | For email integration | None |

---

## Post-Deployment Checklist

After deploying both frontend and backend:

1. **Test Health Endpoint**
   ```bash
   curl https://your-backend-url/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-12-23T...",
     "version": "0.1.0"
   }
   ```

2. **Test Contacts API**
   ```bash
   curl https://your-backend-url/api/contacts
   ```
   Expected response:
   ```json
   {
     "contacts": [],
     "total": 0
   }
   ```

3. **Open Frontend**
   - Navigate to your Vercel URL
   - Should see onboarding wizard on first visit
   - Complete onboarding and add a test contact

4. **Test Voice Flow**
   - Hold voice button and say "Hi Orbit, can you hear me?"
   - Should receive transcription and agent response
   - Audio should play (if browser allows)

5. **Test Contact Management**
   - Click settings icon (gear)
   - Add/edit/delete contacts
   - Verify changes persist

---

## Troubleshooting

### Backend Issues

**Issue: Whisper model download timeout**
```
Solution: Increase health check timeout in Railway/Render settings
- Railway: No action needed (graceful startup)
- Render: Set "Health Check Grace Period" to 300 seconds
```

**Issue: Database connection error**
```
Solution: Verify DATABASE_URL is set correctly
- Railway: Auto-set when PostgreSQL added
- Render: Copy from PostgreSQL instance
```

**Issue: CORS errors in frontend**
```
Solution: Verify CORS_ORIGINS includes your Vercel URL
- Must include https:// prefix
- No trailing slash
- Comma-separated for multiple origins
```

### Frontend Issues

**Issue: API requests fail with 404**
```
Solution: Check VITE_API_URL environment variable
- Should end with /api (e.g., https://backend.railway.app/api)
- Redeploy frontend after changing
```

**Issue: Onboarding doesn't show**
```
Solution: Clear browser localStorage
- Open DevTools → Application → Local Storage
- Delete orbit_onboarding_complete key
- Refresh page
```

---

## Scaling & Performance

### Backend Scaling

**Vertical Scaling** (recommended for MVP):
- Railway/Render: Upgrade to higher tier
- More CPU/RAM helps with Whisper transcription
- Base model works well on 512MB RAM

**Horizontal Scaling** (future):
- Multiple backend instances behind load balancer
- Shared PostgreSQL database
- Redis for session management

### Database Optimization

For production with many contacts:
- Migrate from JSON to PostgreSQL table
- Add indexes on name and full_name columns
- Use database backups (Railway/Render have daily backups)

### Cost Optimization

**Free Tier** (development/demos):
- Vercel: Unlimited
- Railway: $5 credit/month
- Render: 750 hours/month free tier

**Starter Tier** (production):
- Vercel: Free (Hobby plan)
- Railway: ~$5-10/month
- Render: ~$7/month web service + $7/month database

---

## Monitoring & Logs

### Railway

View logs:
```bash
railway logs
```

Or in dashboard → Deployments → View Logs

### Render

- Dashboard → Service → Logs tab
- Real-time log streaming
- Download logs for analysis

### LangSmith (Optional)

If `LANGSMITH_API_KEY` is set:
- View agent traces at [smith.langchain.com](https://smith.langchain.com)
- Monitor LLM calls, tool usage, errors
- Debug conversation flows

---

## Security Best Practices

1. **API Keys**
   - Never commit to Git
   - Use platform environment variables
   - Rotate regularly

2. **CORS**
   - Only allow your frontend domain
   - Don't use wildcard (*) in production

3. **Database**
   - Use managed PostgreSQL with backups
   - Enable SSL connections (default on Railway/Render)

4. **Contacts Data**
   - User data stored in database
   - Add encryption at rest (future)
   - GDPR compliance if applicable

---

## Continuous Deployment

### Automatic Deploys

Both Vercel and Railway/Render support automatic deploys from Git:

**Vercel**:
- Automatically deploys on push to `main` branch
- Preview deployments for pull requests
- Configure in Project Settings → Git

**Railway/Render**:
- Auto-deploy on push to connected branch
- Can set deploy hooks for specific events
- Configure in project settings

### Manual Deploys

**Railway**:
```bash
railway up
```

**Render**:
- Dashboard → Manual Deploy button
- Or push to connected Git branch

---

## Support & Resources

- **Orbit Documentation**: See main README.md
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Issues**: GitHub repository issues

---

## Next Steps

After successful deployment:

1. **Add Custom Domain** (optional)
   - Vercel: Project Settings → Domains
   - Railway/Render: Settings → Custom Domain

2. **Set Up Monitoring**
   - Add UptimeRobot or similar for health checks
   - Configure LangSmith for LLM monitoring

3. **Enable Integrations**
   - Add Twilio for SMS
   - Connect Slack workspace
   - Set up Gmail OAuth

4. **Migrate to Database**
   - Move contacts from JSON to PostgreSQL
   - Add database migrations with Alembic
   - Enable backups and point-in-time recovery

5. **Optimize Performance**
   - Consider Whisper API instead of self-hosted
   - Add caching layer (Redis)
   - Implement rate limiting
