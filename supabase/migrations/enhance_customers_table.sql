-- Enhanced Customer Management Phase 1
-- Add new columns for customer relationship tracking and Thai market features

-- Add new columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS line_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS relationship_level VARCHAR(20) DEFAULT 'new',
ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20) DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS source VARCHAR(50),
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Add check constraints
ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_relationship_level_check,
ADD CONSTRAINT customers_relationship_level_check
  CHECK (relationship_level IN ('new', 'regular', 'vip', 'inactive'));

ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_preferred_contact_method_check,
ADD CONSTRAINT customers_preferred_contact_method_check
  CHECK (preferred_contact_method IN ('phone', 'email', 'line', 'sms'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_relationship_level ON customers(relationship_level);
CREATE INDEX IF NOT EXISTS idx_customers_preferred_contact ON customers(preferred_contact_method);
CREATE INDEX IF NOT EXISTS idx_customers_tags ON customers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers(birthday);
CREATE INDEX IF NOT EXISTS idx_customers_source ON customers(source);

-- Add comments to explain columns
COMMENT ON COLUMN customers.line_id IS 'Customer LINE ID for Thai market communication';
COMMENT ON COLUMN customers.relationship_level IS 'Customer relationship status: new, regular, vip, inactive';
COMMENT ON COLUMN customers.preferred_contact_method IS 'Preferred way to contact customer: phone, email, line, sms';
COMMENT ON COLUMN customers.tags IS 'Customer tags for categorization (array of strings)';
COMMENT ON COLUMN customers.source IS 'How the customer found the business (referral, facebook, instagram, google, walk-in, website, other)';
COMMENT ON COLUMN customers.birthday IS 'Customer birthday for promotional campaigns';
COMMENT ON COLUMN customers.company_name IS 'Company name for corporate customers';
COMMENT ON COLUMN customers.tax_id IS 'Tax ID for corporate customers or receipts';

-- Note: Customer analytics view will be created in Phase 2 when booking system is fully integrated
