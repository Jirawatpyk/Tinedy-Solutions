-- Enable Realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Comment
COMMENT ON TABLE bookings IS 'Bookings table with realtime enabled for auto-refresh';
