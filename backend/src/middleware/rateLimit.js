import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';
const disableRateLimit = process.env.DISABLE_RATE_LIMIT === 'true';

const staffEmails = (process.env.ADMIN_EMAIL || 'admin@skybet.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isStaffLoginAttempt(req) {
  const email = req.body?.email;
  return typeof email === 'string' && staffEmails.includes(email.trim().toLowerCase());
}

function isLocalRequest(req) {
  const ip = req.ip || req.socket?.remoteAddress || '';
  const normalized = ip.replace('::ffff:', '');
  return (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.startsWith('127.') ||
    ip.includes('127.0.0.1')
  );
}

function shouldSkipRateLimit(req) {
  if (disableRateLimit) return true;
  if (isDev && isLocalRequest(req)) return true;
  if (isDev && isStaffLoginAttempt(req)) return true;
  return false;
}

function shouldSkipAuthRateLimit(req) {
  if (shouldSkipRateLimit(req)) return true;
  if (isDev && isStaffLoginAttempt(req)) return true;
  return false;
}

const defaultHandler = (req, res, _next, options) => {
  res.status(429).json(options.message);
};

export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: isDev ? 10000 : parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { error: 'Too many requests, please try again later' },
  handler: defaultHandler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipAuthRateLimit,
  message: { error: 'Too many auth attempts, please try again later' },
  handler: defaultHandler,
});

export const betLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 500 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { error: 'Too many bet requests' },
  handler: defaultHandler,
});
