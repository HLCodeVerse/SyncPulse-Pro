/* Supabase REST API Helper */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface DbUser {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
  bio?: string;
  status: string;
  last_seen?: string;
}

export async function syncUserIdentity(user: { id: string; name: string; avatar?: string; bio?: string }) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio || 'SyncPulse Pro Member',
        status: 'online',
        last_seen: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (e) {
    return null;
  }
}

export async function fetchFriendsFromDb(userId: string): Promise<string[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/friendships?or=(user_id_1.eq.${userId},user_id_2.eq.${userId})&status=eq.accepted`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.map((f: any) => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1);
  } catch (e) {
    return [];
  }
}

export async function saveMessageToDb(msg: { id: string; roomId: string; senderId: string; text: string }) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        id: msg.id,
        room_id: msg.roomId,
        sender_id: msg.senderId,
        text: msg.text
      })
    });
  } catch (e) {}
}
