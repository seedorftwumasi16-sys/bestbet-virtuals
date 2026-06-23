import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    const adminSchema = fs.readFileSync(path.join(__dirname, 'schema-admin.sql'), 'utf8');
    await client.query(adminSchema);
    console.log('✅ Database schema ready');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}
