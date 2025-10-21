-- Create booking_status_history table
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add index for faster queries
CREATE INDEX idx_booking_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX idx_booking_status_history_created_at ON booking_status_history(created_at DESC);

-- Enable RLS
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can view all history
CREATE POLICY "Admin can view all booking status history"
  ON booking_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Staff can view history for their own bookings
CREATE POLICY "Staff can view their booking status history"
  ON booking_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_status_history.booking_id
      AND bookings.staff_id = auth.uid()
    )
  );

-- Admin can insert history
CREATE POLICY "Admin can insert booking status history"
  ON booking_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Staff can insert history for their own bookings
CREATE POLICY "Staff can insert their booking status history"
  ON booking_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_status_history.booking_id
      AND bookings.staff_id = auth.uid()
    )
  );

-- Create function to automatically log status changes
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO booking_status_history (
      booking_id,
      changed_by,
      old_status,
      new_status,
      notes
    ) VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.staff_id, '00000000-0000-0000-0000-000000000000'::uuid),
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'Booking created'
        ELSE 'Status changed'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log status changes
DROP TRIGGER IF EXISTS booking_status_change_trigger ON bookings;
CREATE TRIGGER booking_status_change_trigger
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_booking_status_change();

-- Add comment
COMMENT ON TABLE booking_status_history IS 'Stores history of booking status changes for audit trail and timeline display';
