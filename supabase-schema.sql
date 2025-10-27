-- Job Tracker Database Schema for Supabase
-- Run this SQL in your Supabase SQL editor

-- Create the jobs table
CREATE TABLE jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    job_id TEXT,
    status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'resume_screening', 'interview', 'offer', 'rejected', 'withdrawn', 'ended')),
    applied_date DATE DEFAULT CURRENT_DATE,
    url TEXT,
    description TEXT,
    notes TEXT,
    comments TEXT,
    source TEXT DEFAULT 'Manual Entry',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on status for faster filtering
CREATE INDEX idx_jobs_status ON jobs(status);

-- Create an index on company for faster filtering
CREATE INDEX idx_jobs_company ON jobs(company);

-- Create an index on applied_date for faster sorting
CREATE INDEX idx_jobs_applied_date ON jobs(applied_date);

-- Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
-- For now, we'll allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations for all users" ON jobs
    FOR ALL USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional)
INSERT INTO jobs (title, company, location, status, applied_date, url, description) VALUES
('Software Engineer', 'JeffreyM Consulting', 'Seattle', 'saved', '2025-01-23', 'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4303686801', 'About the job This is an FTE position with our client.'),
('Frontend Engineer', 'Numeric', 'San Francisco CA', 'saved', '2025-01-23', 'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4311132940', 'We are looking for our first Frontend Engineer to spearhead frontend efforts.'),
('Frontend Engineer', 'Numeric', 'Remote', 'saved', '2025-01-23', 'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4311132940', 'About the job Why NumericEvery business relies on accounting.');
