-- Migration 066: Add business profile fields for restaurants, wine bars, etc.
-- These fields are specifically for B2B users (businesses)

-- Add business-specific fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS organization_number TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'Sweden',
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
ADD COLUMN IF NOT EXISTS opening_hours TEXT,
ADD COLUMN IF NOT EXISTS employee_count INTEGER;

-- Add comment to document business fields
COMMENT ON COLUMN profiles.company_name IS 'Company/business name for B2B accounts';
COMMENT ON COLUMN profiles.organization_number IS 'Organization number (Swedish: organisationsnummer)';
COMMENT ON COLUMN profiles.vat_number IS 'VAT registration number (Swedish: momsregistreringsnummer)';
COMMENT ON COLUMN profiles.business_type IS 'Type of business (restaurant, wine bar, bar, hotel, etc.)';
COMMENT ON COLUMN profiles.billing_address IS 'Billing address (can differ from delivery address)';
COMMENT ON COLUMN profiles.billing_city IS 'Billing city';
COMMENT ON COLUMN profiles.billing_postal_code IS 'Billing postal code';
COMMENT ON COLUMN profiles.billing_country IS 'Billing country';
COMMENT ON COLUMN profiles.contact_person IS 'Primary contact person name';
COMMENT ON COLUMN profiles.delivery_instructions IS 'Special delivery instructions for the business';
COMMENT ON COLUMN profiles.opening_hours IS 'Opening hours (for delivery scheduling)';
COMMENT ON COLUMN profiles.employee_count IS 'Number of employees (optional)';

-- Create index for faster lookups on business fields
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_number ON profiles(organization_number);
CREATE INDEX IF NOT EXISTS idx_profiles_business_type ON profiles(business_type);
