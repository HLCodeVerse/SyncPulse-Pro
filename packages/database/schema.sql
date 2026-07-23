-- ====================================================================
-- SyncPulse Pro — Production Supabase Postgres Database Schema
-- Includes Mobile Phone Auth, Username, Roles (Admin/User), RLS & Seed Data
-- ====================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE room_type AS ENUM ('1:1', 'group', 'pulse_ai');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT DEFAULT 'SyncPulse Pro Enterprise User',
  role user_role DEFAULT 'user'::user_role,
  status TEXT DEFAULT 'online',
  is_suspended BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FRIENDSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status friendship_status DEFAULT 'pending'::friendship_status,
  action_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

-- 4. ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type room_type DEFAULT '1:1'::room_type,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ROOM PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- 6. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  media_url TEXT,
  reply_to_message_id TEXT,
  reactions JSONB DEFAULT '[]'::jsonb,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CALL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  caller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  call_type TEXT DEFAULT '1:1',
  is_video BOOLEAN DEFAULT TRUE,
  duration_seconds INTEGER DEFAULT 0,
  ai_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. SYSTEM CONFIG & ADMIN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. FALLBACK SERVERLESS SIGNALING TABLE
CREATE TABLE IF NOT EXISTS public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  target_user_id TEXT,
  room_id TEXT,
  sender_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Users Select" ON public.users;
DROP POLICY IF EXISTS "Allow Users Insert Update Self" ON public.users;
DROP POLICY IF EXISTS "Allow Friendship Operations" ON public.friendships;
DROP POLICY IF EXISTS "Allow Room Operations" ON public.rooms;
DROP POLICY IF EXISTS "Allow Room Participant Operations" ON public.room_participants;
DROP POLICY IF EXISTS "Allow Message Operations" ON public.messages;
DROP POLICY IF EXISTS "Allow Call Log Operations" ON public.call_logs;
DROP POLICY IF EXISTS "Allow System Settings Operations" ON public.system_settings;
DROP POLICY IF EXISTS "Allow Signal Operations" ON public.signals;

-- Permissive policies for application operation
CREATE POLICY "Allow All Users Select" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow Users Insert Update Self" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow Friendship Operations" ON public.friendships FOR ALL USING (true);
CREATE POLICY "Allow Room Operations" ON public.rooms FOR ALL USING (true);
CREATE POLICY "Allow Room Participant Operations" ON public.room_participants FOR ALL USING (true);
CREATE POLICY "Allow Message Operations" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow Call Log Operations" ON public.call_logs FOR ALL USING (true);
CREATE POLICY "Allow System Settings Operations" ON public.system_settings FOR ALL USING (true);
CREATE POLICY "Allow Signal Operations" ON public.signals FOR ALL USING (true);

-- SEED DATA: Default Admin & Test Users
INSERT INTO public.users (id, phone_number, username, full_name, email, role, bio)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '+19998887777', 'admin', 'System Super Admin', 'admin@syncpulse.pro', 'admin'::user_role, 'Platform Administrator'),
  ('00000000-0000-0000-0000-000000000002', '+15551234567', 'sarah', 'Sarah Sanders', 'sarah@syncpulse.pro', 'user'::user_role, 'Senior WebRTC Engineer')
ON CONFLICT (id) DO NOTHING;

-- SEED DATA: Default Global Settings
INSERT INTO public.system_settings (key, value)
VALUES 
  ('turn_server_config', '{"urls": ["stun:stun.l.google.com:19302"], "max_participants": 50}'::jsonb),
  ('platform_features', '{"ai_assistant": true, "sfu_enabled": true, "mobile_auth": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
