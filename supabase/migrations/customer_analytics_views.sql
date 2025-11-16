-- Customer Analytics Views for Phase 2
-- Create database views for customer lifetime value and engagement tracking

-- ============================================
-- View 1: Customer Lifetime Value & Booking Stats
-- ============================================
-- This view calculates comprehensive booking statistics for each customer
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
  c.id,
  c.full_name,
  c.email,
  c.relationship_level,
  c.created_at as customer_since,
  COUNT(b.id) as total_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_price ELSE 0 END), 0) as lifetime_value,
  COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_price END), 0) as avg_booking_value,
  MAX(b.booking_date) as last_booking_date,
  MIN(b.booking_date) as first_booking_date,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COUNT(CASE WHEN b.status = 'no_show' THEN 1 END) as no_show_bookings,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
  -- Calculate days since last booking
  CASE
    WHEN MAX(b.booking_date) IS NOT NULL THEN
      (CURRENT_DATE - MAX(b.booking_date))::INTEGER
    ELSE NULL
  END as days_since_last_booking,
  -- Calculate customer tenure in days
  (CURRENT_DATE - c.created_at::DATE)::INTEGER as customer_tenure_days
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN service_packages sp ON b.service_package_id = sp.id
GROUP BY c.id, c.full_name, c.email, c.relationship_level, c.created_at;

-- Add comment
COMMENT ON VIEW customer_lifetime_value IS 'Comprehensive customer booking statistics and lifetime value calculation';


-- ============================================
-- View 2: Customer Engagement Status
-- ============================================
-- This view determines customer engagement level based on recent activity
CREATE OR REPLACE VIEW customer_engagement AS
SELECT
  c.id,
  c.full_name,
  c.email,
  c.relationship_level,
  c.preferred_contact_method,
  -- Determine engagement status based on last booking
  CASE
    WHEN MAX(b.booking_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 'active'
    WHEN MAX(b.booking_date) >= CURRENT_DATE - INTERVAL '60 days' THEN 'at_risk'
    WHEN MAX(b.booking_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 'inactive_recent'
    WHEN MAX(b.booking_date) < CURRENT_DATE - INTERVAL '90 days' THEN 'inactive'
    WHEN MAX(b.booking_date) IS NULL THEN 'never_booked'
    ELSE 'new'
  END as engagement_status,
  -- Count bookings in different time periods
  COUNT(CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as bookings_last_30_days,
  COUNT(CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as bookings_last_90_days,
  COUNT(CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '180 days' THEN 1 END) as bookings_last_180_days,
  MAX(b.booking_date) as last_booking_date,
  COUNT(b.id) as total_bookings
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
GROUP BY c.id, c.full_name, c.email, c.relationship_level, c.preferred_contact_method;

-- Add comment
COMMENT ON VIEW customer_engagement IS 'Customer engagement status based on booking activity';


-- ============================================
-- View 3: Customer Service Preferences
-- ============================================
-- This view shows which services each customer prefers
CREATE OR REPLACE VIEW customer_service_preferences AS
SELECT
  c.id as customer_id,
  c.full_name,
  sp.id as service_id,
  sp.name as service_name,
  sp.service_type,
  COUNT(b.id) as times_booked,
  MAX(b.booking_date) as last_booked,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_price ELSE 0 END), 0) as total_spent,
  -- Rank services by booking frequency for each customer
  ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY COUNT(b.id) DESC) as preference_rank
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN service_packages sp ON b.service_package_id = sp.id
WHERE b.id IS NOT NULL
GROUP BY c.id, c.full_name, sp.id, sp.name, sp.service_type;

-- Add comment
COMMENT ON VIEW customer_service_preferences IS 'Customer service preferences ranked by booking frequency';


-- ============================================
-- Indexes for Performance
-- ============================================
-- These indexes will improve query performance on the bookings table
-- Note: Some indexes already exist in the main schema, these are additional or ensure they exist
CREATE INDEX IF NOT EXISTS idx_bookings_service_package_id ON bookings(service_package_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status_date
  ON bookings(customer_id, status, booking_date DESC);

COMMENT ON INDEX idx_bookings_customer_status_date IS 'Composite index for customer booking queries with status and date filtering';
