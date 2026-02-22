-- Add sold status to items table
USE campus_cart;

-- Add is_sold field to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT FALSE AFTER is_available;

-- Add sold_at timestamp
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP NULL AFTER is_sold;

-- Add buyer_id to track who bought the item
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS buyer_id INT NULL AFTER sold_at,
ADD FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL;

-- Update existing items to not be sold
UPDATE items SET is_sold = FALSE WHERE is_sold IS NULL;

-- Remove quantity from orders table (items are always quantity 1)
ALTER TABLE orders 
MODIFY COLUMN quantity INT DEFAULT 1;
