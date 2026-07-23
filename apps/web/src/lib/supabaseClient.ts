/* Supabase Server API & Database Management Helpers */

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
  status?: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export async function syncUserIdentity(user: { id: string; name: string; username?: string; phone?: string; avatar?: string; bio?: string; role?: 'user' | 'admin' }) {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: user.name,
        username: user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
        phone: user.phone,
        avatarUrl: user.avatar,
        bio: user.bio || 'SyncPulse Pro Enterprise User'
      })
    });
    return res.ok;
  } catch (e) {
    return null;
  }
}

export async function fetchFriendsFromDb(userId: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/friendships?userId=${userId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.acceptedFriends ? data.acceptedFriends.map((f: any) => f.id) : [];
  } catch (e) {
    return [];
  }
}

export async function saveFriendshipToDb(userId1: string, userId2: string, status: 'pending' | 'accepted' | 'rejected' = 'accepted') {
  try {
    await fetch('/api/friendships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: status === 'accepted' ? 'accept' : 'send', senderId: userId1, targetId: userId2 })
    });
  } catch (e) {}
}

export async function saveMessageToDb(msg: { id: string; roomId: string; senderId: string; text: string; mediaUrl?: string }) {
  try {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
  } catch (e) {}
}

export async function fetchRoomMessagesFromDb(roomId: string): Promise<DbMessage[]> {
  try {
    const res = await fetch(`/api/messages?roomId=${encodeURIComponent(roomId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch (e) {
    return [];
  }
}

export async function deleteMessageFromDb(msgId: string) {
  try {
    await fetch(`/api/messages?messageId=${encodeURIComponent(msgId)}`, {
      method: 'DELETE'
    });
  } catch (e) {}
}

/* ADMIN DASHBOARD DB HELPERS */
export async function fetchAllUsersFromDb(): Promise<DbUser[]> {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch (e) {
    return [];
  }
}

export async function fetchAllMessagesFromDb(): Promise<DbMessage[]> {
  try {
    const res = await fetch('/api/messages?roomId=all');
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch (e) {
    return [];
  }
}

export async function updateUserRoleInDb(userId: string, newRole: 'user' | 'admin') {
  try {
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateRole', userId, role: newRole })
    });
  } catch (e) {}
}

export async function toggleUserSuspensionInDb(userId: string, isSuspended: boolean) {
  try {
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleSuspension', userId, isSuspended })
    });
  } catch (e) {}
}

export async function deleteUserFromDb(userId: string) {
  try {
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUser', userId })
    });
  } catch (e) {}
}
