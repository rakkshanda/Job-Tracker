-- Update the status CHECK constraint to include all statuses
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the old constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Step 2: Add the new constraint with all statuses including resume_screening
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
CHECK (status IN ('saved', 'applied', 'resume_screening', 'interview', 'offer', 'rejected', 'withdrawn', 'ended'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'jobs'::regclass AND conname = 'jobs_status_check';


