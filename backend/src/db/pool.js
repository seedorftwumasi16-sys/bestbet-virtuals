import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const useMem = process.env.USE_IN_MEMORY_DB === 'true';

let pool;

if (useMem) {
  const { newDb } = await import('pg-mem');
  const { v4: uuidv4 } = await import('uuid');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const mem = newDb();
  mem.public.registerFunction({
    name: 'uuid_generate_v4',
    returnsData: false,
    implementation: () => uuidv4(),
    impure: true,
  });
  mem.public.registerFunction({
    name: 'random',
    returnsData: true,
    implementation: () => Math.random(),
    impure: true,
  });
  mem.public.registerFunction({
    name: 'abs',
    args: ['float', 'integer', 'double precision'],
    returns: 'float',
    implementation: (x) => Math.abs(Number(x)),
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema-mem.sql'), 'utf8');
  mem.public.none(schema);
  try {
    const adminSchema = fs.readFileSync(path.join(__dirname, 'schema-admin.sql'), 'utf8');
    const adminLines = adminSchema
      .split('\n')
      .filter((line) => !line.includes('DROP CONSTRAINT') && !line.includes('ADD CONSTRAINT'))
      .join('\n');
    mem.public.none(adminLines);
  } catch {
    /* schema-admin optional for mem */
  }

  try {
    const playersSchema = fs.readFileSync(path.join(__dirname, 'schema-players.sql'), 'utf8');
    mem.public.none(playersSchema);
  } catch {
    /* optional */
  }

  const { Pool } = mem.adapters.createPg();
  pool = new Pool();
  console.log('📦 Using in-memory database (pg-mem) — dev only');
} else {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required in production. Set USE_IN_MEMORY_DB=true only for local dev.');
    process.exit(1);
  }
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => console.error('Database pool error:', err));
  console.log('📦 Using PostgreSQL database');
}

export default pool;
