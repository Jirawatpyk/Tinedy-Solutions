-- Add avatar_url column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN customers.avatar_url IS 'URL to customer profile picture or avatar image';
