-- Add new role columns to users table
ALTER TABLE users 
ADD COLUMN is_buyer BOOLEAN DEFAULT TRUE,
ADD COLUMN is_seller BOOLEAN DEFAULT FALSE,
ADD COLUMN is_rider BOOLEAN DEFAULT FALSE,
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Update existing users based on their current role
UPDATE users SET 
  is_buyer = TRUE,
  is_seller = CASE WHEN role = 'seller' THEN TRUE ELSE FALSE END,
  is_rider = CASE WHEN role = 'rider' THEN TRUE ELSE FALSE END,
  is_admin = CASE WHEN role = 'admin' THEN TRUE ELSE FALSE END;

-- Add new columns to rider_requests table if they don't exist
ALTER TABLE rider_requests 
ADD COLUMN license_issue_date DATE,
ADD COLUMN license_expiry_date DATE;

-- Show updated structure
SELECT 'Users table updated successfully' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT role, COUNT(*) as count FROM users GROUP BY role;