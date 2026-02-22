-- Prevent duplicate reminders at DB level (race condition proof)
-- Covers: cron overlap, manual+auto simultaneous sends
-- One row per booking_id + email_type combination
-- Retries are handled by UPDATE-ing existing rows (not INSERT-ing new ones)
-- See send-booking-reminder: on unique_violation, checks existing status
--   - 'sent'   → skip (already delivered)
--   - 'failed'  → reset to pending, retry sending
--   - 'pending' → skip (in progress)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_booking_reminder_unique
ON email_queue(booking_id, email_type);
