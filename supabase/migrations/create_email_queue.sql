-- Create email_queue table for tracking all email sending
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL, -- 'booking_confirmation', 'payment_link', 'payment_confirmation', 'payment_reminder', 'booking_reminder', 'booking_rescheduled'
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  subject TEXT,
  html_content TEXT,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_booking_id ON email_queue(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_email_type ON email_queue(email_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- Add RLS policies
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to email_queue"
  ON email_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE email_queue IS 'Queue for tracking all email sending with retry mechanism';
