-- Add user registration fields to rider_requests table
USE campus_cart;

ALTER TABLE rider_requests 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS email VARCHAR(100),
ADD COLUMN IF NOT EXISTS password VARCHAR(255),
ADD COLUMN IF NOT EXISTS student_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Make user_id nullable since riders won't have user accounts until approved
ALTER TABLE rider_requests 
MODIFY COLUMN user_id INT NULL;

-- Add unique constraint on email to prevent duplicate applications
ALTER TABLE rider_requests 
ADD UNIQUE KEY unique_rider_email (email);
