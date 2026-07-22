import { NextRequest, NextResponse } from 'next/server';
import { queryDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Auto-mark users as offline if last_seen > 35 seconds ago
    await queryDb(`
      UPDATE public.users 
      SET status = 'offline' 
      WHERE status = 'online' AND (last_seen IS NULL OR last_seen < NOW() - INTERVAL '35 seconds');
    `);

    // Fetch all users from Supabase Postgres DB sorted by online status FIRST, then last_seen DESC
    const rows = await queryDb(`
      SELECT id, full_name, username, phone_number, avatar_url, bio, role, status, last_seen, created_at
      FROM public.users
      ORDER BY 
        CASE WHEN status = 'online' THEN 0 ELSE 1 END ASC,
        last_seen DESC NULLS LAST,
        created_at DESC;
    `);

    const users = rows.map((u: any) => ({
      id: u.id,
      name: u.full_name,
      username: u.username,
      phone: u.phone_number,
      avatar: u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: u.bio,
      role: u.role,
      status: u.status === 'online' ? 'online' : 'offline',
      lastSeen: u.last_seen ? new Date(u.last_seen).toISOString() : undefined
    }));

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    console.error('Fetch Users Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
