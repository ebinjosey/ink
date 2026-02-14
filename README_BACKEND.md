# Ink App Backend

A TypeScript/Express backend for the Ink journaling app with JWT authentication, PostgreSQL/Prisma, and AI-powered insights.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment file:
   ```bash
   cp .env.example .env
   ```
   Configure your DATABASE_URL and JWT_SECRET.

3. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

### Entries
- `POST /entries` - Create entry
- `GET /entries` - Get all entries
- `GET /entries/:id` - Get entry by ID
- `PATCH /entries/:id` - Update entry
- `DELETE /entries/:id` - Delete entry

### Insights
- `GET /insights/weekly?start=YYYY-MM-DD` - Get weekly insights (deterministic)
- `POST /insights/weekly/ai` - Get AI-powered insights (requires GEMINI_API_KEY)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `GEMINI_API_KEY` - Google Gemini API key (optional, for AI insights)
- `FRONTEND_URL` - Frontend origin for CORS
- `PORT` - Server port (default: 3000)

## Mood Scoring System

- Happy: +3
- Calm: +2
- Content: +2
- Neutral: 0
- Tired: -1
- Anxious: -2
- Stressed: -3
- Sad: -3
- Angry: -3

## Time Buckets

- Morning: 5-11
- Afternoon: 12-16
- Evening: 17-21
- Night: 22-4
