import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const client = await pool.connect();
  try {
    const exists = await client.query(
      `SELECT to_regclass('public.users') AS users, to_regclass('public.leagues') AS leagues`
    );
    const hasCore = Boolean(exists.rows[0]?.users);

    if (!hasCore) {
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await client.query(schema);
      console.log('✅ Base schema applied');
    } else {
      console.log('✅ Base schema already present — skipping full migration');
    }

    const adminSchema = fs.readFileSync(path.join(__dirname, 'schema-admin.sql'), 'utf8');
    await client.query(adminSchema);
    console.log('✅ Database schema ready');
  } catch (err) {
    if (err.code === '53100') {
      const check = await client.query(`SELECT to_regclass('public.users') AS users`);
      if (check.rows[0]?.users) {
        console.warn('⚠️ Database storage limit reached — continuing with existing schema');
        return;
      }
    }
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}
