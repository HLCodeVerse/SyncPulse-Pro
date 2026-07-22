import { NextRequest, NextResponse } from 'next/server';
import { queryDb } from '../../../../lib/db';

export async function GET() {
  try {
    const rows = await queryDb(`SELECT * FROM public.users ORDER BY created_at DESC`);
    return NextResponse.json({ success: true, users: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, role, isSuspended } = body;

    if (role) {
      await queryDb(`UPDATE public.users SET role = $1 WHERE id = $2`, [role, userId]);
    }
    if (isSuspended !== undefined) {
      await queryDb(`UPDATE public.users SET is_suspended = $1 WHERE id = $2`, [isSuspended, userId]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });

    await queryDb(`DELETE FROM public.users WHERE id = $1`, [userId]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
