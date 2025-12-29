-- Migration: Add Soft Delete to service_packages_v2
-- Date: 2025-12-29

-- Add soft delete columns
ALTER TABLE service_packages_v2
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_service_packages_v2_deleted_at ON service_packages_v2(deleted_at);
