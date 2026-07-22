import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.fbgwhkgvrfutahjjuwct:Chandan%409777767188@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';

let pool: Pool | null = null;

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
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
