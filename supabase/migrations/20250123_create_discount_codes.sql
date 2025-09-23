-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  discount_amount_cents INTEGER, -- For fixed amount discounts
  min_order_amount_cents INTEGER DEFAULT 0,
  max_discount_amount_cents INTEGER, -- Maximum discount amount
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER, -- NULL means unlimited
  current_usage INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Track who earned this discount
  earned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  earned_for_invitation_id UUID REFERENCES invitation_codes(id) ON DELETE SET NULL,
  
  -- Track usage
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  order_id VARCHAR(255), -- Reference to the order where it was used
  
  CONSTRAINT valid_discount CHECK (
    (discount_percentage IS NOT NULL AND discount_amount_cents IS NULL) OR
    (discount_percentage IS NULL AND discount_amount_cents IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_earned_by ON discount_codes(earned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_earned_for_invitation ON discount_codes(earned_for_invitation_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active, expires_at);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own discount codes" ON discount_codes
  FOR SELECT USING (auth.uid() = earned_by_user_id);

CREATE POLICY "Users can view their own used discount codes" ON discount_codes
  FOR SELECT USING (auth.uid() = used_by_user_id);

CREATE POLICY "Admins can manage all discount codes" ON discount_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Function to generate discount code
CREATE OR REPLACE FUNCTION generate_discount_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_code VARCHAR(50);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM discount_codes WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create invitation reward discount
CREATE OR REPLACE FUNCTION create_invitation_reward_discount(
  p_user_id UUID,
  p_invitation_id UUID,
  p_discount_percentage INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  new_discount_id UUID;
  discount_code VARCHAR(50);
BEGIN
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
    p_discount_percentage,
    true,
    1, -- Can only be used once
    NOW() + INTERVAL '30 days', -- Expires in 30 days
    p_user_id,
    p_invitation_id
  ) RETURNING id INTO new_discount_id;
  
  RETURN new_discount_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and use discount code
CREATE OR REPLACE FUNCTION use_discount_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_order_amount_cents INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  discount_amount_cents INTEGER,
  error_message TEXT
) AS $$
DECLARE
  discount_record RECORD;
  calculated_discount INTEGER;
  final_discount INTEGER;
BEGIN
  -- Find the discount code
  SELECT * INTO discount_record
  FROM discount_codes
  WHERE code = p_code
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
  AND (usage_limit IS NULL OR current_usage < usage_limit);
  
  -- Check if discount exists and is valid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Invalid or expired discount code'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum order amount
  IF p_order_amount_cents < discount_record.min_order_amount_cents THEN
    RETURN QUERY SELECT false, 0, 'Order amount too low for this discount'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount amount
  IF discount_record.discount_percentage IS NOT NULL THEN
    calculated_discount := (p_order_amount_cents * discount_record.discount_percentage) / 100;
    
    -- Apply maximum discount limit if set
    IF discount_record.max_discount_amount_cents IS NOT NULL THEN
      final_discount := LEAST(calculated_discount, discount_record.max_discount_amount_cents);
    ELSE
      final_discount := calculated_discount;
    END IF;
  ELSE
    final_discount := discount_record.discount_amount_cents;
  END IF;
  
  -- Update usage
  UPDATE discount_codes
  SET 
    current_usage = current_usage + 1,
    used_by_user_id = p_user_id,
    used_at = NOW(),
    updated_at = NOW()
  WHERE id = discount_record.id;
  
  RETURN QUERY SELECT true, final_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
