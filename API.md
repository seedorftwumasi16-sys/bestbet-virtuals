# BestBet Virtuals API Documentation

Base URL: `http://localhost:4000/api` (production: your API domain)

Authentication: `Authorization: Bearer <jwt_token>`

---

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register `{ email, password, phone?, firstName?, lastName? }` |
| POST | `/auth/login` | Login `{ email, password }` → `{ user, token }` |
| POST | `/auth/forgot-password` | `{ email }` |
| POST | `/auth/reset-password` | `{ token, password }` |
| GET | `/auth/me` | Current user (auth required) |

## Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/matches/upcoming` | Upcoming matches with odds |
| GET | `/matches/live` | Live matches |
| GET | `/matches/results` | Finished match history |
| GET | `/matches/league-table` | League standings |
| GET | `/matches/team-form/:teamId` | Team form (last 5) |
| GET | `/matches/:id` | Match details, odds, events |

## Betting

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bets/place` | `{ selections: [{ matchId, market, selection }], stake }` |
| GET | `/bets/history` | User bet history |
| GET | `/bets/:id` | Bet details |
| GET | `/bets/booking/:code` | Load bet by booking code |

### Markets

`match_winner`, `full_time`, `double_chance`, `draw_no_bet`, `over_under`, `btts`, `correct_score`, `half_time`, `first_goal`, `last_goal`, `total_goals`, `total_corners`, `total_cards`

## Wallet

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallet/balance` | Balance |
| GET | `/wallet/transactions` | Transaction history |
| POST | `/wallet/deposit` | Multipart: `amount`, `paymentMethod`, `phoneNumber`, `screenshot` |
| POST | `/wallet/withdraw` | `{ amount, paymentMethod, phoneNumber }` |

## Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | User profile |
| PUT | `/profile` | Update `{ firstName, lastName, phone }` |
| PUT | `/profile/password` | `{ currentPassword, newPassword }` |

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List + unread count |
| PUT | `/notifications/read-all` | Mark all read |
| PUT | `/notifications/:id/read` | Mark one read |

## Promotions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/promotions` | Active promotions |
| GET | `/promotions/winners` | Recent winning tickets |

## Admin (admin role required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics` | Dashboard stats |
| CRUD | `/admin/teams` | Teams + logo upload |
| POST | `/admin/matches` | Schedule match |
| PUT | `/admin/matches/:id/odds` | Edit odds |
| PUT | `/admin/matches/:id/result` | Set result `{ homeScore, awayScore, goalTimes? }` |
| PUT | `/admin/matches/:id/void` | Void match |
| GET/PUT | `/admin/settings` | RTP, modes, limits |
| PUT | `/admin/competition/pause` | `{ paused: boolean }` |
| GET | `/admin/bets/booking/:code` | Search booking |
| PUT | `/admin/bets/:id/void` | Void bet |
| GET | `/admin/users` | List users |
| PUT | `/admin/users/:id/suspend` | Suspend user |
| PUT | `/admin/users/:id/ban` | Ban user |
| POST | `/admin/users/:id/credit` | Credit balance |
| POST | `/admin/users/:id/debit` | Debit balance |
| POST | `/admin/users/:id/reset-password` | Reset password |
| GET/PUT | `/admin/deposits` | Deposit approvals |
| GET/PUT | `/admin/withdrawals` | Withdrawal approvals |
| GET | `/admin/audit-logs` | Audit trail |

## Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `match:live` | Server → Client | `{ matchId, phase }` |
| `match:update` | Server → Client | `{ matchId, minute, homeScore, awayScore, events, commentary, phase }` |
| `match:goal` | Server → Client | `{ matchId, team, minute }` |
| `match:finished` | Server → Client | `{ matchId, match }` |

## Health

`GET /api/health` → `{ status: "ok", service: "BestBet Virtuals API" }`
