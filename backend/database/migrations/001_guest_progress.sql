-- ============================================================================
-- Migration 001 — Mode Tamu pindah ke Database
-- ----------------------------------------------------------------------------
-- Tujuan:
--   1. Progres Mode Tamu tidak lagi disimpan di localStorage browser, tapi di
--      tabel `guest_progress` yang di-key per `device_id` (per perangkat).
--   2. `user_progress` dirapikan: 1 baris = 1 user (UNIQUE user_id) sehingga
--      progress milik user A tidak bisa "diambil alih" user B lewat device_id.
--   3. `quiz_stats` disimpan sebagai kolom agar statistik kuis guest bisa
--      ditransfer utuh ke akun saat register.
--
-- Cara pakai: buka Supabase Dashboard > SQL Editor > tempel file ini > Run.
-- Script ini idempotent (aman dijalankan lebih dari sekali).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabel baru: guest_progress (per perangkat, tanpa akun)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    keys INT DEFAULT 0,
    total_score INT DEFAULT 0,
    games_played INT DEFAULT 0,
    unlocked_provinces JSONB DEFAULT '[]'::jsonb,
    completed_games JSONB DEFAULT '{}'::jsonb,
    claimed_rewards JSONB DEFAULT '[]'::jsonb,
    quiz_stats JSONB DEFAULT '{}'::jsonb,
    guest_warning_seen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.guest_progress IS
    'Progres Mode Tamu NusaQuest, di-key per device_id (per perangkat, tanpa akun).';
COMMENT ON COLUMN public.guest_progress.guest_warning_seen IS
    'Pengganti localStorage nusaquest_guest_warning_seen: modal peringatan tamu hanya tampil sekali per perangkat.';

-- ---------------------------------------------------------------------------
-- 2. Kolom quiz_stats pada user_progress (menerima hasil transfer data tamu)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_progress
    ADD COLUMN IF NOT EXISTS quiz_stats JSONB DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. Rapikan user_progress: identitas user = user_id, bukan device_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_progress ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS user_progress_device_id_key;

-- 1 baris per user (aman: saat migrasi ini dibuat, semua baris punya user_id unik)
ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_key;
ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_user_id_key UNIQUE (user_id);

COMMENT ON COLUMN public.user_progress.device_id IS
    'Legacy/jejak perangkat saat akun dibuat. Identitas resmi user adalah user_id.';

-- ---------------------------------------------------------------------------
-- 4. RLS + policy (backend memakai service role, policy ini untuk konsistensi)
-- ---------------------------------------------------------------------------
ALTER TABLE public.guest_progress ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT * FROM (VALUES
            ('Public read guest_progress',   'SELECT', 'USING (true)'),
            ('Public insert guest_progress', 'INSERT', 'WITH CHECK (true)'),
            ('Public update guest_progress', 'UPDATE', 'USING (true)'),
            ('Public delete guest_progress', 'DELETE', 'USING (true)')
        ) AS t(name, cmd, clause)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'guest_progress'
              AND policyname = pol.name
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.guest_progress FOR %s %s',
                pol.name, pol.cmd, pol.clause
            );
        END IF;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Verifikasi
-- ---------------------------------------------------------------------------
-- SELECT COUNT(*) FROM public.guest_progress;
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.user_progress'::regclass;
