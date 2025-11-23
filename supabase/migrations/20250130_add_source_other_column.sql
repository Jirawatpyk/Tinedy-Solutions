-- Add source_other column to customers table
-- For storing additional details when source is "other"

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS source_other VARCHAR(255);

-- Add comment to explain the column
COMMENT ON COLUMN customers.source_other IS 'Additional details when source is "other"';
