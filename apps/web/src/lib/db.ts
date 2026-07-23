import { Pool } from 'pg';

const connectionString = 'postgresql://postgres.tqrhotxuqtfsrtyidelm:Chandan%409777767188@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const globalForDb = global as unknown as { pool: Pool };

export function getDbPool() {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }
  return globalForDb.pool;
}

export async function queryDb(text: string, params?: any[]) {
  const p = getDbPool();
  try {
    const res = await p.query(text, params);
    return res.rows;
  } catch (err: any) {
    console.error('Supabase Postgres DB Query Error:', err.message);
    throw err;
  }
}
