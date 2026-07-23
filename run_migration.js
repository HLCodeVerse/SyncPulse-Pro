const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.fbgwhkgvrfutahjjuwct:Chandan%409777767188@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Running messages table status column migration...');
    await pool.query(`
      ALTER TABLE public.messages 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
    `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
