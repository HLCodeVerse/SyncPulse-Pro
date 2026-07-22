/* Supabase REST API & Database Management Helpers */

const SUPABASE_URL = 'https://fbgwhkgvrfutahjjuwct.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZ3doa2d2cmZ1dGFoamp1d2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczMDgwNzMsImV4cCI6MjA1Mjg4NDA3M30.placeholder';

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

export interface DbMessage {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  media_url?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  reactions?: any[];
  created_at: string;
}

export async function syncUserIdentity(user: { id: string; name: string; username?: string; phone?: string; avatar?: string; bio?: string; role?: 'user' | 'admin' }) {
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

export async function saveFriendshipToDb(userId1: string, userId2: string, status: 'pending' | 'accepted' | 'rejected' = 'accepted') {
  try {
    const [u1, u2] = [userId1, userId2].sort();
    await fetch(`${SUPABASE_URL}/rest/v1/friendships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id_1: u1,
        user_id_2: u2,
        status,
        action_user_id: userId1,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {}
}

export async function saveMessageToDb(msg: { id: string; roomId: string; senderId: string; text: string }) {
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

export async function fetchRoomMessagesFromDb(roomId: string): Promise<DbMessage[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?room_id=eq.${encodeURIComponent(roomId)}&order=created_at.asc`, {
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

/* ADMIN DASHBOARD DB HELPERS */
export async function fetchAllUsersFromDb(): Promise<DbUser[]> {
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

export async function fetchAllMessagesFromDb(): Promise<DbMessage[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?select=*&order=created_at.desc&limit=50`, {
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

export async function deleteUserFromDb(userId: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
  } catch (e) {}
}

export async function deleteMessageFromDb(messageId: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${messageId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
  } catch (e) {}
}
