import { NextRequest, NextResponse } from 'next/server';
import { queryDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/friendships?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    // Fetch all friendships involving this user
    const rows = await queryDb(`
      SELECT f.id, f.user_id_1, f.user_id_2, f.status, f.action_user_id, f.updated_at,
             u1.full_name as u1_name, u1.username as u1_username, u1.avatar_url as u1_avatar, u1.status as u1_status,
             u2.full_name as u2_name, u2.username as u2_username, u2.avatar_url as u2_avatar, u2.status as u2_status
      FROM public.friendships f
      JOIN public.users u1 ON f.user_id_1 = u1.id
      JOIN public.users u2 ON f.user_id_2 = u2.id
      WHERE f.user_id_1 = $1 OR f.user_id_2 = $1;
    `, [userId]);

    const acceptedFriends: any[] = [];
    const pendingIncomingRequests: any[] = [];
    const pendingOutgoingRequests: string[] = [];

    rows.forEach((r: any) => {
      const isUser1 = r.user_id_1 === userId;
      const otherId = isUser1 ? r.user_id_2 : r.user_id_1;
      const otherUser = {
        id: otherId,
        name: isUser1 ? r.u2_name : r.u1_name,
        username: isUser1 ? r.u2_username : r.u1_username,
        avatar: (isUser1 ? r.u2_avatar : r.u1_avatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        status: (isUser1 ? r.u2_status : r.u1_status) === 'online' ? 'online' : 'offline'
      };

      if (r.status === 'accepted') {
        acceptedFriends.push(otherUser);
      } else if (r.status === 'pending') {
        if (r.action_user_id !== userId) {
          pendingIncomingRequests.push(otherUser);
        } else {
          pendingOutgoingRequests.push(otherId);
        }
      }
    });

    return NextResponse.json({
      success: true,
      acceptedFriends,
      pendingIncomingRequests,
      pendingOutgoingRequests
    });
  } catch (err: any) {
    console.error('Friendships GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/friendships - Send or respond to friend request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, senderId, targetId } = body;

    if (!senderId || !targetId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const [u1, u2] = [senderId, targetId].sort();
    const status = action === 'send' ? 'pending' : (action === 'accept' ? 'accepted' : 'rejected');

    await queryDb(`
      INSERT INTO public.friendships (user_id_1, user_id_2, status, action_user_id, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id_1, user_id_2) DO UPDATE SET
        status = EXCLUDED.status,
        action_user_id = EXCLUDED.action_user_id,
        updated_at = NOW();
    `, [u1, u2, status, senderId]);

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error('Friendships POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
