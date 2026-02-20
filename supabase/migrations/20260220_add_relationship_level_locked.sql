-- Migration: Add relationship_level_locked column to customers table
-- Run this in Supabase SQL Editor BEFORE deploying T2-T8

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS relationship_level_locked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customers_rel_level_locked
  ON customers(relationship_level_locked);
