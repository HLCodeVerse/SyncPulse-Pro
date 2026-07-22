import { NextRequest, NextResponse } from 'next/server';
import { queryDb } from '../../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usernameOrPhone } = body;

    if (!usernameOrPhone || !usernameOrPhone.trim()) {
      return NextResponse.json({ success: false, error: 'Username or phone is required' }, { status: 400 });
    }

    const query = usernameOrPhone.trim().toLowerCase();

    const text = `
      SELECT * FROM public.users
      WHERE LOWER(username) = $1
         OR LOWER(phone_number) = $1
         OR LOWER(full_name) = $1
      LIMIT 1;
    `;

    const rows = await queryDb(text, [query]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, notFound: true, message: 'User not found in Supabase database' });
    }

    const user = rows[0];

    // Update last seen
    await queryDb(`UPDATE public.users SET last_seen = NOW(), status = 'online' WHERE id = $1`, [user.id]);

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
    console.error('Login API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
