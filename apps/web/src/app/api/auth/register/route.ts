import { NextRequest, NextResponse } from 'next/server';
import { queryDb } from '../../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, username, phone, avatarUrl, bio } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }

    const id = `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userHandle = (username || fullName.toLowerCase().replace(/\s+/g, '_')).trim();
    const phoneNumber = phone?.trim() || null;
    const avatar = avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
    const userBio = bio || 'SyncPulse Pro User';

    const text = `
      INSERT INTO public.users (id, full_name, username, phone_number, avatar_url, bio, role, status, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, 'user', 'online', NOW())
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username,
        phone_number = EXCLUDED.phone_number,
        avatar_url = EXCLUDED.avatar_url,
        bio = EXCLUDED.bio,
        last_seen = NOW()
      RETURNING *;
    `;

    const rows = await queryDb(text, [id, fullName.trim(), userHandle, phoneNumber, avatar, userBio]);
    const user = rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        phone: user.phone_number,
        avatar: user.avatar_url,
        bio: user.bio,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Registration API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
