import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRoutes from './routes/auth.js';
import matchRoutes from './routes/matches.js';
import betRoutes from './routes/bets.js';
import walletRoutes from './routes/wallet.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import profileRoutes from './routes/profile.js';
import promotionRoutes from './routes/promotions.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { initMatchScheduler, processScheduledMatches } from './services/schedulerService.js';
import pool from './db/pool.js';

dotenv.config();

// Prevent accidental PORT leakage from frontend dev shell (e.g. PORT=3001)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigins = (process.env.FRONTEND_URL ||
  'http://localhost:3000,http://localhost:3001,https://bestbet-virtuals.vercel.app,https://bestbet-virtuals-seedorf.vercel.app')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    callback(null, true);
    return;
  }
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) {
    callback(null, true);
    return;
  }
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS blocked for origin: ${origin}`));
}

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', async (req, res) => {
  try {
    const db = await pool.query('SELECT 1 as ok');
    const dbMode = process.env.USE_IN_MEMORY_DB === 'true' ? 'in-memory' : 'postgresql';
    res.json({
      status: 'ok',
      service: 'SkyBet API',
      build: 'skybet-european-v3',
      brand: 'SkyBet',
      tagline: 'Bet Smart, Win More',
      env: process.env.NODE_ENV || 'development',
      database: db.rows[0]?.ok === 1 ? 'connected' : 'error',
      dbMode,
      port: parseInt(process.env.PORT || '4000', 10),
    });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// Auth routes before general rate limiter (login/register have their own authLimiter)
app.use('/api/auth', authRoutes);

app.use(generalLimiter);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/promotions', promotionRoutes);

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// Database bootstrap
if (process.env.USE_IN_MEMORY_DB === 'true') {
  const { runSeed } = await import('./db/seedOnStartup.js');
  await runSeed();
} else {
  const { runMigrations } = await import('./db/runMigrations.js');
  const { runProductionSeed } = await import('./db/productionSeed.js');
  await runMigrations();
  await runProductionSeed();
}

initMatchScheduler(io);
setInterval(processScheduledMatches, 5000);

// Use BACKEND_PORT so shell PORT=3001 (Next.js) never hijacks the API server
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || '4000', 10);
if (PORT >= 3000 && PORT <= 3010) {
  console.warn(`⚠️ PORT ${PORT} looks like a frontend port — using 4000 for API`);
}
const listenPort = PORT >= 3000 && PORT <= 3010 ? 4000 : PORT;

httpServer.listen(listenPort, '0.0.0.0', () => {
  console.log(`🏆 SkyBet API on port ${listenPort}`);
  console.log(`   CORS: ${allowedOrigins.join(', ')}`);
});

export { io };
