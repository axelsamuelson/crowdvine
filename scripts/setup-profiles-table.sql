-- Kontrollera att profiles-tabellen finns och har rätt struktur
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skapa index för bättre prestanda
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- RLS-policy för profiles (tillåt alla operationer för admin)
CREATE POLICY IF NOT EXISTS "Allow all operations for admin" ON profiles
  FOR ALL USING (role = 'admin');

-- RLS-policy för användare att läsa sin egen profil
CREATE POLICY IF NOT EXISTS "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- RLS-policy för användare att uppdatera sin egen profil
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Aktivera RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
