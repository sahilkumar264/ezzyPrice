# ezzyPrice

ezzyPrice is a MERN-based price comparison project where users can create private accounts, verify email signup with OTP, and compare product prices from multiple e-commerce platforms in one place.

## Current scope

- React frontend with an ezzyPrice-branded auth flow and comparison dashboard
- Express backend with a layered folder structure
- eBay integration with API-first logic and scraper fallback
- Amazon integration through SerpApi
- Flipkart integration with Affiliate API first and Stagehand browser fallback
- Snapdeal scraper
- Redis cache for repeated searches and recent-search reads
- Email/password authentication with private user accounts
- Email OTP verification for email/password signup
- Google sign-in with backend token verification
- Normalized comparison results across sources
- MongoDB-backed user accounts and user-specific recent searches
- No alerts, cron jobs, or notifications in this phase

## Project structure

```text
price-comparison-app/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      sources/
      utils/
  frontend/
    src/
      api/
      components/
      styles/
```

## Backend setup

1. Open `D:\price-comparison-app\backend`
2. Create `.env` from `.env.example`
3. Install dependencies with `npm install`
4. Start the server with `npm run dev`

Optional Redis setup:

1. Run Redis locally or use a hosted Redis instance
2. Set `REDIS_URL` in `backend/.env`
3. Keep `ENABLE_REDIS_CACHE=true`

Authentication setup:

1. Add `AUTH_JWT_SECRET` in `backend/.env`
2. Add `GOOGLE_CLIENT_ID` in `backend/.env` if you want Google sign-in
3. Add SMTP email settings in `backend/.env` for signup OTP emails
4. Keep MongoDB connected, because user accounts need the database

## Frontend setup

1. Open `D:\price-comparison-app\frontend`
2. Create `.env` from `.env.example`
3. Install dependencies with `npm install`
4. Start the client with `npm run dev`

Google sign-in setup:

1. Add `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`
2. Use the same Google client ID in both frontend and backend env files

Signup OTP email setup:

1. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS`
2. Add `MAIL_FROM_EMAIL` and `MAIL_FROM_NAME`
3. For Gmail, use an App Password instead of your normal account password

## Notes

- eBay tries the official API first when credentials are present and falls back to scraping only if the API call fails.
- Amazon uses SerpApi only. Add `AMAZON_SERPAPI_KEY` in the backend `.env` to enable Amazon results.
- Flipkart tries the official Affiliate API first and falls back to Stagehand running a local browser session.
- Flipkart Stagehand uses Gemini by default. Add `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or `FLIPKART_STAGEHAND_MODEL_API_KEY` to enable it.
- Stagehand runs in `LOCAL` mode by default, so the browser opens on your own machine instead of a paid cloud browser.
- Search results are cached in Redis for a short time to speed up repeated queries and reduce source calls.
- Recent searches are cached per user in Redis and cleared when a new search is saved.
- If Redis is not running, the app still works and simply skips the cache.
- Product search and recent-history routes are protected, so each user only sees their own account data.
- Email/password signup now sends a 6-digit OTP to the user's email before the account is created.
- If a source fails or returns no products, it is hidden from the frontend response.
- Scrapers and browser-based flows may need small selector updates if site layouts change.
- MongoDB is required for authentication and for keeping user search history.
- This version intentionally matches the current phase 2 scope only.

## Docker setup

The project is now container-ready.

### Run with Docker Compose

1. Add your real values to `backend/.env`
2. Optionally export a Google client ID before build:
   `set VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com`
3. Start the stack:
   `docker compose up --build`

### Services

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5000`
- Redis: `redis://127.0.0.1:6379`

### Docker files added

- `backend/Dockerfile`
- `backend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `frontend/.dockerignore`
- `docker-compose.yml`

### Production notes

- For HTTPS deployment, set `AUTH_COOKIE_SECURE=true`
- If frontend and backend are on the same public domain through a reverse proxy, you can keep `VITE_API_BASE_URL=/api`
- Update `CLIENT_URL` and `CLIENT_URLS` in the backend env to your deployed frontend domain
- For AWS, EC2, ECS, App Runner, or Docker-based hosts, the current Docker setup is ready to adapt
