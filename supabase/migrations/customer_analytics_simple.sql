-- Simplified Customer Analytics Views for Phase 2
-- Create simple, performant database views

-- ============================================
-- View 1: Customer Lifetime Value (Simplified)
-- ============================================
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
  c.id,
  c.full_name,
  c.email,
  c.relationship_level,
  c.created_at as customer_since,
  COUNT(b.id) as total_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN sp.price ELSE 0 END), 0)::NUMERIC as lifetime_value,
  COALESCE(AVG(CASE WHEN b.status = 'completed' THEN sp.price END), 0)::NUMERIC as avg_booking_value,
  MAX(b.booking_date) as last_booking_date,
  MIN(b.booking_date) as first_booking_date,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::INTEGER as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)::INTEGER as cancelled_bookings,
  COUNT(CASE WHEN b.status = 'no_show' THEN 1 END)::INTEGER as no_show_bookings,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END)::INTEGER as pending_bookings,
  -- Simple calculation: days since last booking
  COALESCE((CURRENT_DATE - MAX(b.booking_date))::INTEGER, NULL) as days_since_last_booking,
  -- Simple calculation: customer age in days
  (CURRENT_DATE - c.created_at::DATE)::INTEGER as customer_tenure_days
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN service_packages sp ON b.service_package_id = sp.id
GROUP BY c.id, c.full_name, c.email, c.relationship_level, c.created_at;

-- ============================================
-- Indexes for Performance
-- ============================================
-- Add index for service_package_id if not exists
CREATE INDEX IF NOT EXISTS idx_bookings_service_package_id ON bookings(service_package_id);

-- Composite index for faster customer queries
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status_date
  ON bookings(customer_id, status, booking_date DESC);
