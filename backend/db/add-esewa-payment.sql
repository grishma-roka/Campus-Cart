-- Add payment fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT NULL;

-- Transactions table for platform income tracking
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  buyer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'esewa',
  transaction_id VARCHAR(100) NOT NULL,
  status ENUM('success','failed','pending') DEFAULT 'pending',
  raw_response JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
