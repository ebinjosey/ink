import "dotenv/config";
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import authRoutes from './src/backend/routes/auth';
import entriesRoutes from './src/backend/routes/entries';
import insightsRoutes from './src/backend/routes/insights';
import errorMiddleware from './src/backend/middleware/errorMiddleware';
import OpenAI from 'openai';
import { OPENAI_MODEL } from './src/backend/utils/ai';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const openaiKey = process.env.OPENAI_API_KEY || '';

console.log('OPENAI_KEY_PRESENT:', !!openaiKey, 'OPENAI_KEY_PREFIX:', openaiKey ? openaiKey.slice(0, 3) : '');
console.log('SERVER_PORT:', PORT);

// Middleware
app.use(helmet());
// Allow local dev frontend origins (Vite on 3000, legacy 5173, custom FRONTEND_URL)
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'].filter(Boolean) as string[];
app.use(cors({ origin: allowedOrigins }));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/entries', entriesRoutes);
app.use('/insights', insightsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// OpenAI connectivity check (debug)
app.get('/health/openai', async (req, res) => {
  if (!openaiKey) {
    return res.status(200).json({ ok: false, status: 500, code: 'missing_api_key', message: 'OpenAI API key missing' });
  }
  try {
    const client = new OpenAI({ apiKey: openaiKey });
    await client.responses.create({
      model: OPENAI_MODEL,
      input: [{ role: 'user', content: [{ type: 'input_text', text: 'ping' }] }],
      max_output_tokens: 5,
      temperature: 0,
    });
    return res.json({ ok: true, model: OPENAI_MODEL });
  } catch (err: any) {
    return res.status(200).json({
      ok: false,
      status: err?.status,
      code: err?.code,
      message: err?.message || 'OpenAI health check failed',
    });
  }
});

// Error middleware
app.use(errorMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`SERVER_RUNNING_ON: http://localhost:${PORT}`);
});

export default app;
