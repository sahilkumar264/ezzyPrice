# ezzyPrice

ezzyPrice is a price comparison app with private user accounts, email OTP signup, Google sign-in, search history, and cached product lookups across multiple shopping sources.

## Tech Stack

- Frontend: React, Vite, Axios
- Backend: Node.js, Express, MongoDB, Redis
- Auth: JWT httpOnly cookies, bcrypt, Google ID token verification
- Product sources: eBay, Amazon SerpApi, Flipkart, Snapdeal

## Project Structure

```text
backend/
  api/              Vercel serverless entry
  src/
    config/         environment, database, redis
    controllers/    request handlers
    middleware/     auth and error middleware
    models/         mongoose models
    routes/         API routes
    services/       auth and product search logic
    sources/        marketplace adapters
    utils/          shared helpers

frontend/
  src/
    api/            API clients
    components/     UI components
    styles/         global styles
```

## Local Setup

Backend:

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Use `npm.cmd run dev` if PowerShell blocks `npm.ps1`.

## Required Services

- MongoDB is required for users, OTP requests, and search history.
- Redis is optional locally, but recommended for cached searches and recent-search reads.
- SMTP is required for email OTP signup.
- Google OAuth is required only if Google sign-in is enabled.

For local Redis with Docker:

```powershell
docker run --name ezzyprice-redis -p 6379:6379 -d redis:7-alpine
```

For production, use hosted Redis such as Upstash. A local Docker Redis container cannot be reached from Vercel.

## Vercel Deployment

Deploy as two Vercel projects:

1. `backend/` as the API project.
2. `frontend/` as the Vite project.

Backend environment:

```env
NODE_ENV=production
CLIENT_URL=https://your-frontend.vercel.app
CLIENT_URLS=https://your-frontend.vercel.app
MONGODB_URI=your_mongodb_atlas_uri
REDIS_URL=rediss://default:password@host.upstash.io:6379
ENABLE_REDIS_CACHE=true
AUTH_JWT_SECRET=use_a_long_random_secret
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=none
GOOGLE_CLIENT_ID=your_google_client_id
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
MAIL_FROM_EMAIL=your_sender_email
MAIL_FROM_NAME=ezzyPrice
```

Frontend environment:

```env
VITE_API_BASE_URL=https://your-backend.vercel.app/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Add both local and deployed frontend URLs to the Google OAuth client under Authorized JavaScript origins.
