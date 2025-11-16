-- Fix Customer Lifetime Value to use payment_status instead of booking status
-- This aligns with the Reports & Analytics page which uses payment_status = 'paid' for revenue calculations

DROP VIEW IF EXISTS customer_lifetime_value CASCADE;

CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
  c.id,
  c.full_name,
  c.email,
  c.relationship_level,
  c.created_at as customer_since,
  COUNT(b.id) as total_bookings,

  -- FIXED: Use payment_status = 'paid' instead of status = 'completed'
  COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) as lifetime_value,
  COALESCE(AVG(CASE WHEN b.payment_status = 'paid' THEN b.total_price END), 0) as avg_booking_value,

  -- Last booking date: only past service dates (booking_date <= today)
  -- This excludes future/upcoming bookings
  MAX(CASE WHEN b.booking_date <= CURRENT_DATE THEN b.booking_date END) as last_booking_date,
  MIN(b.booking_date) as first_booking_date,

  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COUNT(CASE WHEN b.status = 'no_show' THEN 1 END) as no_show_bookings,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,

  -- Days since last completed service (excludes future bookings)
  CASE
    WHEN MAX(CASE WHEN b.booking_date <= CURRENT_DATE THEN b.booking_date END) IS NOT NULL THEN
      (CURRENT_DATE - MAX(CASE WHEN b.booking_date <= CURRENT_DATE THEN b.booking_date END))::INTEGER
    ELSE NULL
  END as days_since_last_booking,

  -- Calculate customer tenure in days
  (CURRENT_DATE - c.created_at::DATE)::INTEGER as customer_tenure_days
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN service_packages sp ON b.service_package_id = sp.id
GROUP BY c.id, c.full_name, c.email, c.relationship_level, c.created_at;

COMMENT ON VIEW customer_lifetime_value IS 'Customer booking statistics - lifetime_value calculated from paid bookings (payment_status = paid), last_booking_date shows most recent PAST service date (excludes future bookings)';
