-- Fix existing dates that are one day behind due to UTC/PST timezone issue
-- This adds one day to all applied_date values
-- Run this in your Supabase SQL Editor

-- IMPORTANT: Review your data first!
-- Check which dates will be affected:
SELECT id, title, company, applied_date, 
       applied_date + INTERVAL '1 day' as corrected_date
FROM jobs
ORDER BY applied_date DESC;

-- If the preview looks correct, run this to update:
UPDATE jobs 
SET applied_date = applied_date + INTERVAL '1 day'
WHERE applied_date IS NOT NULL;

-- Verify the update worked:
SELECT id, title, company, applied_date
FROM jobs
ORDER BY applied_date DESC
LIMIT 10;


