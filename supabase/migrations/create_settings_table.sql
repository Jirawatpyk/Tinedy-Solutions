-- Create settings table for storing application settings
-- Settings are stored as key-value pairs with metadata

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- General Settings
  business_name TEXT DEFAULT 'Tinedy Solutions',
  business_email TEXT DEFAULT 'contact@tinedy.com',
  business_phone TEXT DEFAULT '02-123-4567',
  business_address TEXT DEFAULT '123 Business Street, Bangkok, Thailand',
  business_description TEXT,
  business_logo_url TEXT,

  -- Booking Settings
  time_slot_duration INTEGER DEFAULT 60, -- minutes
  min_advance_booking INTEGER DEFAULT 24, -- hours
  max_booking_window INTEGER DEFAULT 60, -- days
  cancellation_hours INTEGER DEFAULT 24, -- hours before booking
  require_deposit BOOLEAN DEFAULT false,
  deposit_percentage INTEGER DEFAULT 30, -- percentage

  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  notify_new_booking BOOLEAN DEFAULT true,
  notify_cancellation BOOLEAN DEFAULT true,
  notify_payment BOOLEAN DEFAULT true,
  reminder_hours INTEGER DEFAULT 24, -- hours before booking

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON public.settings(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read settings
CREATE POLICY "Admins can view settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON public.settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON public.settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default settings row if none exists
INSERT INTO public.settings (id, business_name, business_email, business_phone, business_address)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Tinedy Solutions',
  'contact@tinedy.com',
  '02-123-4567',
  '123 Business Street, Bangkok, Thailand'
)
ON CONFLICT (id) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

COMMENT ON TABLE public.settings IS 'Application settings for business configuration';
COMMENT ON COLUMN public.settings.time_slot_duration IS 'Default booking time slot duration in minutes';
COMMENT ON COLUMN public.settings.min_advance_booking IS 'Minimum hours in advance for booking';
COMMENT ON COLUMN public.settings.max_booking_window IS 'Maximum days in advance for booking';
COMMENT ON COLUMN public.settings.cancellation_hours IS 'Free cancellation period in hours before booking';
COMMENT ON COLUMN public.settings.reminder_hours IS 'Send reminder notifications X hours before booking';
