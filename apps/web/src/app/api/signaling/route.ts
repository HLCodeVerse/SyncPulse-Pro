import { NextRequest, NextResponse } from 'next/server';
import { queryDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const since = parseInt(searchParams.get('since') || '0', 10);
    const now = Date.now();

    // 1. Update caller/poll user online status and heartbeat in database
    if (userId) {
      await queryDb(`
        UPDATE public.users 
        SET status = 'online', last_seen = NOW() 
        WHERE id = $1;
      `, [userId]);
    }

    // 2. Fetch all online users from database (active in last 12 seconds)
    const activeDbUsers = await queryDb(`
      SELECT id, full_name as name, username, phone_number as phone, avatar_url as avatar, bio, role, status
      FROM public.users
      WHERE last_seen > NOW() - INTERVAL '12 seconds' 
        AND is_suspended = FALSE;
    `);

    const activeUsers = activeDbUsers.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      phone: u.phone,
      avatar: u.avatar,
      bio: u.bio,
      role: u.role,
      status: u.status
    }));

    if (!userId) {
      return NextResponse.json({ activeUsers, events: [] });
    }

    // 3. Query signal events from Supabase signals table
    const rows = await queryDb(`
      SELECT id, type, payload, target_user_id, room_id, sender_id, created_at
      FROM public.signals
      WHERE (target_user_id IS NULL OR target_user_id = $1)
        AND (sender_id != $1 OR sender_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 30;
    `, [userId]);

    rows.reverse();

    const events = rows.map(r => ({
      id: r.id,
      type: r.type,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      targetUserId: r.target_user_id,
      roomId: r.room_id,
      senderId: r.sender_id,
      timestamp: new Date(r.created_at).getTime()
    }));

    return NextResponse.json({
      activeUsers,
      events,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error('Signaling GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, user, event } = body;

    if (action === 'register' && user) {
      await queryDb(`
        UPDATE public.users 
        SET status = 'online', last_seen = NOW() 
        WHERE id = $1;
      `, [user.id]);

      return NextResponse.json({ success: true, user });
    }

    if (action === 'signal' && event) {
      await queryDb(`
        INSERT INTO public.signals (type, payload, target_user_id, room_id, sender_id)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        event.type,
        JSON.stringify(event.payload || {}),
        event.targetUserId || null,
        event.roomId || null,
        event.senderId || null
      ]);

      // Prune signals older than 2 minutes in background to prevent DB bloat
      queryDb(`
        DELETE FROM public.signals 
        WHERE created_at < NOW() - INTERVAL '2 minutes';
      `).catch(() => {});

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Signaling POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
