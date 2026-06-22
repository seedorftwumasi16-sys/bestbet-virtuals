# BestBet Virtuals

A complete production-ready Instant Virtual Football betting platform inspired by SportyBet Instant Virtuals.

## Features

- **Instant Virtual Football** - Matches generated every 3 minutes with live animated simulation
- **8 Betting Markets** - Match Winner, Double Chance, Over/Under, BTTS, Correct Score, Half Time, First Goal, Total Goals
- **Real-time Updates** - Socket.IO powered live match updates and odds
- **Ghana Payment System** - MTN MoMo, Telecel Cash, AirtelTigo Money with admin approval
- **Booking Codes** - Share and load betslips via unique codes
- **Admin Control Panel** - Full control over teams, matches, odds, users, payments, and settings
- **Security** - JWT auth, role-based access, rate limiting, audit logs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL |
| Auth | JWT |
| Hosting | Vercel (frontend), VPS (backend) |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Database Setup

```bash
# Create database
createdb bestbet_virtuals

# Or via psql
psql -U postgres -c "CREATE DATABASE bestbet_virtuals;"
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

npm install
npm run migrate
npm run seed
npm run dev
```

Backend runs on `http://localhost:4000`

**Default accounts:**
- Admin: `admin@bestbet.com` / `admin123`
- Demo: `demo@bestbet.com` / `admin123` (GHS 1,000 balance)

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

### 4. Run Both (from root)

```bash
npm install
npm run dev
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Matches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches/upcoming` | Upcoming matches with odds |
| GET | `/api/matches/live` | Live matches |
| GET | `/api/matches/results` | Recent results |
| GET | `/api/matches/:id` | Match details |
| GET | `/api/matches/league-table` | League standings |
| GET | `/api/matches/team-form/:teamId` | Team form history |

### Betting
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bets/place` | Place a bet |
| GET | `/api/bets/history` | User bet history |
| GET | `/api/bets/:id` | Bet details |
| GET | `/api/bets/booking/:code` | Load bet by booking code |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet/balance` | Get balance |
| GET | `/api/wallet/transactions` | Transaction history |
| POST | `/api/wallet/deposit` | Submit deposit request |
| POST | `/api/wallet/withdraw` | Request withdrawal |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/analytics` | Dashboard analytics |
| CRUD | `/api/admin/teams` | Manage teams |
| POST | `/api/admin/matches` | Schedule matches |
| PUT | `/api/admin/matches/:id/result` | Set match result |
| PUT | `/api/admin/matches/:id/odds` | Edit odds |
| PUT | `/api/admin/matches/:id/void` | Void match |
| GET/PUT | `/api/admin/settings` | System settings |
| GET | `/api/admin/users` | List users |
| PUT | `/api/admin/users/:id/suspend` | Suspend/unsuspend |
| POST | `/api/admin/users/:id/credit` | Credit account |
| POST | `/api/admin/users/:id/debit` | Debit account |
| GET | `/api/admin/bets` | All bets |
| PUT | `/api/admin/bets/:id/void` | Void bet |
| GET/PUT | `/api/admin/deposits` | Deposit approvals |
| GET/PUT | `/api/admin/withdrawals` | Withdrawal approvals |
| GET | `/api/admin/audit-logs` | Audit logs |

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set root directory to `frontend`
4. Environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-api-domain.com`
   - `NEXT_PUBLIC_SOCKET_URL=https://your-api-domain.com`

### Backend (VPS)

```bash
# On your VPS (Ubuntu)
sudo apt update && sudo apt install -y nodejs npm postgresql nginx

# Clone and setup
git clone <repo> /var/www/bestbet
cd /var/www/bestbet/backend
npm install --production
cp .env.example .env
# Configure .env with production values

npm run migrate
npm run seed

# Install PM2
npm install -g pm2
pm2 start src/index.js --name bestbet-api
pm2 save
pm2 startup
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Database Backups

```bash
# Daily backup cron
0 2 * * * pg_dump bestbet_virtuals > /backups/bestbet_$(date +\%Y\%m\%d).sql
```

### SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Project Structure

```
bestbet-virtuals/
├── backend/
│   ├── src/
│   │   ├── db/           # Schema, migrations, seed
│   │   ├── middleware/   # Auth, rate limiting
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── index.js      # Server entry
│   └── uploads/          # File uploads
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # React components
│   │   ├── context/      # Auth & BetSlip context
│   │   └── lib/          # API utilities
│   └── public/
└── README.md
```

## Security Notes

- Change `JWT_SECRET` in production
- Use strong PostgreSQL passwords
- Enable HTTPS on both frontend and backend
- Configure firewall (only 80, 443, 22)
- Regular database backups
- Monitor audit logs via admin panel

## License

Proprietary - BestBet Virtuals
