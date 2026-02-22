-- Add OCR verification fields to rider_requests table
USE campus_cart;

ALTER TABLE rider_requests 
ADD COLUMN IF NOT EXISTS extracted_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS extracted_expiry_date DATE,
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'verified', 'expired', 'needs_manual_review', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT,
ADD COLUMN IF NOT EXISTS auto_rejected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing records to have default verification_status
UPDATE rider_requests SET verification_status = 'pending' WHERE verification_status IS NULL;
