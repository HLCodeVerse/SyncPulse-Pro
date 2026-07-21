import { NextRequest, NextResponse } from 'next/server';

interface SignalEvent {
  id: string;
  type: string;
  payload: any;
  targetUserId?: string;
  roomId?: string;
  senderId?: string;
  timestamp: number;
}

// In-Memory store for Vercel Serverless instance
const eventBus: SignalEvent[] = [];
const activeUsersMap = new Map<string, any>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const since = parseInt(searchParams.get('since') || '0', 10);

  if (!userId) {
    return NextResponse.json({ activeUsers: Array.from(activeUsersMap.values()), events: [] });
  }

  // Filter events targeted to this user or room broadcast since timestamp
  const events = eventBus.filter(
    (e) => e.timestamp > since && (!e.targetUserId || e.targetUserId === userId) && e.senderId !== userId
  );

  return NextResponse.json({
    activeUsers: Array.from(activeUsersMap.values()),
    events,
    timestamp: Date.now()
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, user, event } = body;

    if (action === 'register' && user) {
      activeUsersMap.set(user.id, { ...user, status: 'online', lastSeen: new Date().toISOString() });
      return NextResponse.json({ success: true, user });
    }

    if (action === 'signal' && event) {
      const signalEvt: SignalEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: event.type,
        payload: event.payload,
        targetUserId: event.targetUserId,
        roomId: event.roomId,
        senderId: event.senderId,
        timestamp: Date.now()
      };

      eventBus.push(signalEvt);
      if (eventBus.length > 500) eventBus.shift(); // Keep buffer bounded

      return NextResponse.json({ success: true, eventId: signalEvt.id });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
