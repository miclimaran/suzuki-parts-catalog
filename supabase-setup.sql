-- =============================================
--  SUZUKI PARTS CATALOG — SUPABASE SETUP SQL
--  Jalankan ini di: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. TABEL PARTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.parts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  part_number TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT parts_part_number_unique UNIQUE (part_number)
);

-- 2. TABEL PROFILES (untuk menyimpan role user)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT,
  role       TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TRIGGER: Auto-buat profile saat user baru daftar
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE public.parts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- PARTS POLICIES
-- Semua user yang sudah login bisa baca
DROP POLICY IF EXISTS "Authenticated users can read parts" ON public.parts;
CREATE POLICY "Authenticated users can read parts" ON public.parts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya admin yang bisa tambah
DROP POLICY IF EXISTS "Admins can insert parts" ON public.parts;
CREATE POLICY "Admins can insert parts" ON public.parts
  FOR INSERT WITH CHECK (public.is_admin());

-- Hanya admin yang bisa update
DROP POLICY IF EXISTS "Admins can update parts" ON public.parts;
CREATE POLICY "Admins can update parts" ON public.parts
  FOR UPDATE USING (public.is_admin());

-- Hanya admin yang bisa hapus
DROP POLICY IF EXISTS "Admins can delete parts" ON public.parts;
CREATE POLICY "Admins can delete parts" ON public.parts
  FOR DELETE USING (public.is_admin());

-- PROFILES POLICIES
-- User bisa lihat profile sendiri, admin bisa lihat semua
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

-- Hanya admin yang bisa update role
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- 5. TRIGGER: Auto-update updated_at pada parts
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parts_updated_at ON public.parts;
CREATE TRIGGER parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 6. SAMPLE DATA (opsional, hapus jika tidak diperlukan)
-- =============================================
INSERT INTO public.parts (part_number, description, category, notes) VALUES
  ('22100-52S00-000', 'Dekrup Futura 2019', 'Mesin', ''),
  ('36250-M74T45-000', 'Switch Kombinasi Fronx SGX (W_AEBMCR)', 'Elektrikal', 'Varian GX/SGX dengan AEB'),
  ('36250-M74T11-000', 'Switch Kombinasi Fronx GL (N_AEBR)', 'Elektrikal', 'Varian GL tanpa AEB')
ON CONFLICT (part_number) DO NOTHING;

-- =============================================
-- SELESAI! Sekarang:
-- 1. Catat Project URL dan anon key dari Settings > API
-- 2. Masukkan ke app.js (bagian CONFIG di atas)
-- 3. Buat akun admin pertama via Authentication > Users
--    lalu ubah role-nya di Table Editor > profiles
-- =============================================
