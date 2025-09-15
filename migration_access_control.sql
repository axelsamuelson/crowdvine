-- Migration for access control system
-- Creates tables for managing platform access requests and invitation codes

-- Access requests table
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitation codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255), -- Optional: tie to specific email
    created_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User access table (tracks who has access)
CREATE TABLE IF NOT EXISTS user_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    invitation_code_id UUID REFERENCES invitation_codes(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON invitation_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_user_access_user_id ON user_access(user_id);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for access_requests
CREATE POLICY "Allow admins to manage access requests" ON access_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow users to view their own access requests" ON access_requests
    FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Allow public to insert access requests" ON access_requests
    FOR INSERT WITH CHECK (true);

-- RLS Policies for invitation_codes
CREATE POLICY "Allow admins to manage invitation codes" ON invitation_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow public to read active invitation codes" ON invitation_codes
    FOR SELECT USING (is_active = true);

-- RLS Policies for user_access
CREATE POLICY "Allow admins to manage user access" ON user_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow users to view their own access" ON user_access
    FOR SELECT USING (user_id = auth.uid());

-- Function to generate 20-digit invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate a 20-digit random number
        code := LPAD(FLOOR(RANDOM() * 100000000000000000000)::TEXT, 20, '0');
        
        -- Check if code already exists
        SELECT COUNT(*) INTO exists_count FROM invitation_codes WHERE invitation_codes.code = code;
        
        -- If code doesn't exist, break the loop
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to validate invitation code
CREATE OR REPLACE FUNCTION validate_invitation_code(code_input VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    code_exists BOOLEAN;
    code_active BOOLEAN;
    code_expired BOOLEAN;
BEGIN
    -- Check if code exists and is active
    SELECT 
        EXISTS(SELECT 1 FROM invitation_codes WHERE code = code_input),
        COALESCE((SELECT is_active FROM invitation_codes WHERE code = code_input), false),
        COALESCE((SELECT expires_at < NOW() FROM invitation_codes WHERE code = code_input), false)
    INTO code_exists, code_active, code_expired;
    
    -- Return true only if code exists, is active, and not expired
    RETURN code_exists AND code_active AND NOT code_expired;
END;
$$ LANGUAGE plpgsql;

-- Function to use invitation code
CREATE OR REPLACE FUNCTION use_invitation_code(code_input VARCHAR(20), user_email VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    code_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- Validate the code first
    IF NOT validate_invitation_code(code_input) THEN
        RETURN false;
    END IF;
    
    -- Get the code ID
    SELECT id INTO code_id FROM invitation_codes WHERE code = code_input;
    
    -- Check if user already has access
    SELECT EXISTS(SELECT 1 FROM user_access WHERE user_id = auth.uid()) INTO user_exists;
    
    IF user_exists THEN
        RETURN false; -- User already has access
    END IF;
    
    -- Mark code as used and grant access
    UPDATE invitation_codes 
    SET used_at = NOW(), used_by = auth.uid(), is_active = false
    WHERE id = code_id;
    
    -- Grant user access
    INSERT INTO user_access (user_id, invitation_code_id, granted_by)
    VALUES (auth.uid(), code_id, auth.uid());
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;
