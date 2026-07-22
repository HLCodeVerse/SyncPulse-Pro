/* Supabase REST API & Admin Management Helpers */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface DbUser {
  id: string;
  phone_number?: string;
  username?: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'admin' | 'moderator';
  status: string;
  is_suspended?: boolean;
  last_seen?: string;
  created_at?: string;
}

export async function syncUserIdentity(user: { id: string; name: string; username?: string; phone?: string; avatar?: string; bio?: string; role?: 'user' | 'admin' }) {
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
        full_name: user.name,
        username: user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
        phone_number: user.phone || null,
        avatar_url: user.avatar,
        bio: user.bio || 'SyncPulse Pro Enterprise User',
        role: user.role || 'user',
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

/* ADMIN DASHBOARD DB HELPERS */
export async function fetchAllUsersFromDb(): Promise<DbUser[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function updateUserRoleInDb(userId: string, newRole: 'user' | 'admin') {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ role: newRole })
    });
  } catch (e) {}
}

export async function toggleUserSuspensionInDb(userId: string, isSuspended: boolean) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ is_suspended: isSuspended })
    });
  } catch (e) {}
}
