-- URGENT ROLLBACK: Remove New Booking Trigger AND Function (Causing Login Issues)
-- Date: 2025-02-04
-- Issue: Migration 20250204_fix_new_booking_notification.sql caused login failure
-- Solution: Remove function with CASCADE to drop all dependent triggers

-- ===================================================================
-- Remove the problematic function with CASCADE
-- This will automatically drop all triggers that depend on it
-- ===================================================================
DROP FUNCTION IF EXISTS public.notify_admins_new_booking() CASCADE;

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ ROLLBACK COMPLETE: Removed function notify_admins_new_booking and all dependent triggers';
  RAISE NOTICE '⚠️ New booking notifications are now COMPLETELY DISABLED until issue is resolved';
END $$;
