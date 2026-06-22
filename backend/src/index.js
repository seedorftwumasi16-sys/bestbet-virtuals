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

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsOrigin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    callback(null, true);
  } else {
    callback(null, allowedOrigins[0]);
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'BestBet Virtuals API', env: process.env.NODE_ENV || 'development' }));

app.use('/api/auth', authRoutes);
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
setInterval(processScheduledMatches, 30000);

const PORT = parseInt(process.env.PORT || '4000');
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🏆 BestBet Virtuals API on port ${PORT}`);
  console.log(`   CORS: ${allowedOrigins.join(', ')}`);
});

export { io };
