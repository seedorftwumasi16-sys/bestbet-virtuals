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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigins = (process.env.FRONTEND_URL ||
  'http://localhost:3000,http://localhost:3001,https://bestbet-virtuals.vercel.app,https://bestbet-virtuals-seedorf.vercel.app')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return true;
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) callback(null, true);
  else callback(new Error(`CORS blocked for origin: ${origin}`));
}

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) cb(null, true);
      else cb(new Error('Socket CORS blocked'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

let dbReady = false;
let bootstrapError = null;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', async (req, res) => {
  if (!dbReady) {
    return res.status(bootstrapError ? 503 : 200).json({
      status: bootstrapError ? 'error' : 'starting',
      service: 'SkyBet API',
      build: 'skybet-live-editor-v5',
      database: bootstrapError ? 'error' : 'connecting',
      error: bootstrapError || undefined,
      port: parseInt(process.env.PORT || '4000', 10),
    });
  }
  try {
    const db = await Promise.race([
      pool.query('SELECT 1 as ok'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timed out')), 8000)),
    ]);
    const dbMode = process.env.USE_IN_MEMORY_DB === 'true' ? 'in-memory' : 'postgresql';
    res.json({
      status: 'ok',
      service: 'SkyBet API',
      build: 'skybet-live-editor-v5',
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

async function bootstrap() {
  try {
    if (process.env.USE_IN_MEMORY_DB === 'true') {
      const { runSeed } = await import('./db/seedOnStartup.js');
      await runSeed();
    } else {
      const { runMigrations } = await import('./db/runMigrations.js');
      const { runProductionSeed } = await import('./db/productionSeed.js');
      await runMigrations();
      await runProductionSeed();
    }
    dbReady = true;
    initMatchScheduler(io);
    const { initWinnerRotation, setWinnersIo, seedDefaultWinners } = await import('./services/winnersService.js');
    setWinnersIo(io);
    await seedDefaultWinners();
    initWinnerRotation(io);
    setInterval(() => {
      processScheduledMatches().catch((err) => console.error('Scheduler poll error:', err.message));
    }, 5000);
    console.log('✅ Bootstrap complete — match scheduler running');
  } catch (err) {
    bootstrapError = err.message;
    console.error('❌ Bootstrap failed:', err.message);
    if (err.code === '53100' || /quota|exceeded/i.test(err.message)) {
      dbReady = true;
      bootstrapError = err.message;
      initMatchScheduler(io);
      setInterval(() => {
        processScheduledMatches().catch((e) => console.error('Scheduler poll error:', e.message));
      }, 5000);
      console.warn('⚠️ Database quota/limit — API online, DB degraded');
      return;
    }
  }
}

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || '4000', 10);
const listenPort = PORT >= 3000 && PORT <= 3010 ? 4000 : PORT;

httpServer.listen(listenPort, '0.0.0.0', () => {
  console.log(`🏆 SkyBet API listening on port ${listenPort}`);
  console.log(`   CORS: ${allowedOrigins.join(', ')} + *.vercel.app`);
  bootstrap();
});

export { io };
