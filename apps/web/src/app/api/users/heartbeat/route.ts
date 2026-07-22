import { NextRequest, NextResponse } from 'next/server';
import { queryDb } from '../../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    await queryDb(`
      UPDATE public.users 
      SET status = 'online', last_seen = NOW() 
      WHERE id = $1;
    `, [userId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
