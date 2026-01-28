-- Migration 067: Create wine tasting session tables
-- This enables digital wine tasting sessions with QR codes, ratings, and real-time synchronization

-- Step 1: Create wine_tasting_sessions table
CREATE TABLE IF NOT EXISTS wine_tasting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    current_wine_index INTEGER DEFAULT 0,
    wine_order UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create wine_tasting_participants table
CREATE TABLE IF NOT EXISTS wine_tasting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES wine_tasting_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    participant_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_anonymous BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create wine_tasting_ratings table
CREATE TABLE IF NOT EXISTS wine_tasting_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES wine_tasting_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES wine_tasting_participants(id) ON DELETE CASCADE,
    wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 100),
    comment TEXT,
    tasted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, participant_id, wine_id)
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasting_sessions_code ON wine_tasting_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_tasting_sessions_created_by ON wine_tasting_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_tasting_sessions_status ON wine_tasting_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tasting_participants_session ON wine_tasting_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_tasting_participants_user ON wine_tasting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tasting_participants_code ON wine_tasting_participants(participant_code);
CREATE INDEX IF NOT EXISTS idx_tasting_ratings_session ON wine_tasting_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_tasting_ratings_participant ON wine_tasting_ratings(participant_id);
CREATE INDEX IF NOT EXISTS idx_tasting_ratings_wine ON wine_tasting_ratings(wine_id);
CREATE INDEX IF NOT EXISTS idx_tasting_ratings_session_wine ON wine_tasting_ratings(session_id, wine_id);

-- Step 5: Create function to generate unique session code
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(20) := 'TASTING-';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    WHILE EXISTS (SELECT 1 FROM wine_tasting_sessions WHERE session_code = result) LOOP
        result := 'TASTING-';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to generate unique participant code
CREATE OR REPLACE FUNCTION generate_participant_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(20) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    WHILE EXISTS (SELECT 1 FROM wine_tasting_participants WHERE participant_code = result) LOOP
        result := '';
        FOR i IN 1..12 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wine_tasting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wine_tasting_sessions_updated_at
    BEFORE UPDATE ON wine_tasting_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_wine_tasting_updated_at();

CREATE TRIGGER wine_tasting_ratings_updated_at
    BEFORE UPDATE ON wine_tasting_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_wine_tasting_updated_at();

-- Step 8: Add comments to document the tables
COMMENT ON TABLE wine_tasting_sessions IS 'Wine tasting sessions created by admins. Each session has a unique code for QR access.';
COMMENT ON TABLE wine_tasting_participants IS 'Participants in wine tasting sessions. Can be anonymous or linked to user accounts.';
COMMENT ON TABLE wine_tasting_ratings IS 'Ratings and comments for wines in tasting sessions. Ratings are 0-100 scale.';

COMMENT ON COLUMN wine_tasting_sessions.session_code IS 'Unique code for QR access (e.g., TASTING-ABC123)';
COMMENT ON COLUMN wine_tasting_sessions.current_wine_index IS 'Index in wine_order array indicating which wine is currently being tasted';
COMMENT ON COLUMN wine_tasting_sessions.wine_order IS 'Array of wine UUIDs in the order they should be tasted';
COMMENT ON COLUMN wine_tasting_ratings.rating IS 'Rating from 0-100 points';
