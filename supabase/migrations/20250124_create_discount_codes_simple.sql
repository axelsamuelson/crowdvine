-- Simple discount_codes table creation
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percentage INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER DEFAULT 1,
  current_usage INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  earned_by_user_id UUID REFERENCES auth.users(id),
  earned_for_invitation_id UUID REFERENCES invitation_codes(id),
  used_by_user_id UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy
CREATE POLICY "Users can view their own discount codes" ON discount_codes
  FOR SELECT USING (auth.uid() = earned_by_user_id);

-- Function to generate discount code
CREATE OR REPLACE FUNCTION generate_discount_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_code VARCHAR(50);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM discount_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create invitation reward discount
CREATE OR REPLACE FUNCTION create_invitation_reward_discount(
  p_user_id UUID,
  p_invitation_id UUID,
  p_discount_percentage INTEGER DEFAULT 5,
  p_reward_tier TEXT DEFAULT 'account_created'
)
RETURNS UUID AS $$
DECLARE
  new_discount_id UUID;
  discount_code VARCHAR(50);
  final_discount_percentage INTEGER;
BEGIN
  -- Determine discount percentage based on reward tier
  CASE p_reward_tier
    WHEN 'account_created' THEN
      final_discount_percentage := 5;
    WHEN 'reservation_made' THEN
      final_discount_percentage := 10;
    ELSE
      final_discount_percentage := p_discount_percentage;
  END CASE;
  
  -- Generate unique discount code
  discount_code := generate_discount_code();
  
  -- Create discount code
  INSERT INTO discount_codes (
    code,
    discount_percentage,
    is_active,
    usage_limit,
    expires_at,
    earned_by_user_id,
    earned_for_invitation_id
  ) VALUES (
    discount_code,
    final_discount_percentage,
    true,
    1,
    NOW() + INTERVAL '30 days',
    p_user_id,
    p_invitation_id
  ) RETURNING id INTO new_discount_id;
  
  RETURN new_discount_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
