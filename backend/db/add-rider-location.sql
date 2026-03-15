-- Add rider location fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL,
  ADD COLUMN IF NOT EXISTS rider_availability ENUM('available', 'busy', 'offline') DEFAULT 'offline';

-- Add delivery coordinates and payment method to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_lat DECIMAL(10, 8) NULL,
  ADD COLUMN IF NOT EXISTS delivery_lng DECIMAL(11, 8) NULL,
  ADD COLUMN IF NOT EXISTS payment_method ENUM('cod', 'esewa') DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL;

-- Add delivery coordinates to deliveries table
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS delivery_lat DECIMAL(10, 8) NULL,
  ADD COLUMN IF NOT EXISTS delivery_lng DECIMAL(11, 8) NULL;
