-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Set replica identity to FULL to get old and new values in realtime events
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Comment
COMMENT ON TABLE messages IS 'Messages table with realtime enabled for chat functionality';
