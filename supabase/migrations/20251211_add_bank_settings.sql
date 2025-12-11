-- Add payment settings columns to settings table
-- This allows admin to configure payment details (Bank Transfer & PromptPay)

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'ธนาคารกสิกรไทย (KBANK)',
ADD COLUMN IF NOT EXISTS bank_account_name TEXT DEFAULT 'Tinedy Solutions',
ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT 'XXX-X-XXXXX-X',
ADD COLUMN IF NOT EXISTS promptpay_id TEXT DEFAULT 'XXXXXXXXXX';

-- Add comment for documentation
COMMENT ON COLUMN settings.bank_name IS 'Bank name for transfer payments (e.g., ธนาคารกสิกรไทย (KBANK))';
COMMENT ON COLUMN settings.bank_account_name IS 'Account holder name for bank transfers';
COMMENT ON COLUMN settings.bank_account_number IS 'Bank account number for transfers';
COMMENT ON COLUMN settings.promptpay_id IS 'PromptPay ID (phone number or national ID) for QR payments';
