import { NextRequest, NextResponse } from 'next/server';
import { queryDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/messages?roomId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Missing roomId' }, { status: 400 });
    }

    let rows = [];
    if (roomId === 'all') {
      rows = await queryDb(`
        SELECT id, room_id, sender_id, text, media_url, is_edited, is_deleted, reactions, status, created_at
        FROM public.messages
        ORDER BY created_at DESC
        LIMIT 100;
      `);
    } else {
      rows = await queryDb(`
        SELECT id, room_id, sender_id, text, media_url, is_edited, is_deleted, reactions, status, created_at
        FROM public.messages
        WHERE room_id = $1
        ORDER BY created_at ASC;
      `, [roomId]);
    }

    return NextResponse.json({ success: true, messages: rows });
  } catch (err: any) {
    console.error('Fetch Messages Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, roomId, senderId, text, mediaUrl, reactions, status } = body;

    if (!id || !roomId || !senderId || !text) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    await queryDb(`
      INSERT INTO public.messages (id, room_id, sender_id, text, media_url, reactions, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id) DO UPDATE SET 
        text = EXCLUDED.text,
        is_edited = CASE WHEN public.messages.text != EXCLUDED.text THEN true ELSE public.messages.is_edited END,
        reactions = COALESCE(EXCLUDED.reactions, public.messages.reactions),
        status = COALESCE(EXCLUDED.status, public.messages.status);
    `, [
      id,
      roomId,
      senderId,
      text,
      mediaUrl || null,
      reactions ? JSON.stringify(reactions) : null,
      status || 'sent'
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Save Message Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/messages?messageId=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ success: false, error: 'Missing messageId' }, { status: 400 });
    }

    await queryDb(`
      UPDATE public.messages SET is_deleted = true, text = '🚫 Message deleted' WHERE id = $1;
    `, [messageId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete Message Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageIds, status } = body;

    if (!messageIds || !Array.isArray(messageIds) || !status) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    await queryDb(`
      UPDATE public.messages 
      SET status = $1 
      WHERE id = ANY($2);
    `, [status, messageIds]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update Message Status Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
