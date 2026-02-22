const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * OCR Service for License Verification
 * Extracts license number and expiration date from license images
 */

class OCRService {
  constructor() {
    this.worker = null;
  }

  /**
   * Initialize Tesseract worker
   */
  async initialize() {
    if (!this.worker) {
      console.log('🔧 Initializing OCR worker...');
      this.worker = await Tesseract.createWorker('eng');
      console.log('✅ OCR worker initialized');
    }
    return this.worker;
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  async preprocessImage(imagePath) {
    try {
      console.log('🖼️ Preprocessing image:', imagePath);
      
      const processedPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '_processed.jpg');
      
      await sharp(imagePath)
        .resize(2000, null, { // Resize to optimal width
          withoutEnlargement: true,
          fit: 'inside'
        })
        .grayscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen edges
        .toFile(processedPath);
      
      console.log('✅ Image preprocessed:', processedPath);
      return processedPath;
    } catch (error) {
      console.error('❌ Image preprocessing failed:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  /**
   * Extract text from license image using OCR
   */
  async extractText(imagePath) {
    try {
      await this.initialize();
      
      // Preprocess image
      const processedPath = await this.preprocessImage(imagePath);
      
      console.log('🔍 Running OCR on image...');
      const { data } = await this.worker.recognize(processedPath);
      
      console.log('✅ OCR completed');
      console.log('📝 Confidence:', data.confidence);
      console.log('📄 Extracted text length:', data.text.length);
      
      // Clean up processed image
      if (processedPath !== imagePath) {
        try {
          await fs.unlink(processedPath);
        } catch (err) {
          console.log('⚠️ Could not delete processed image:', err.message);
        }
      }
      
      return {
        text: data.text,
        confidence: data.confidence
      };
    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Extract license number from OCR text
   * Supports various license number formats
   */
  extractLicenseNumber(text) {
    console.log('🔍 Extracting license number...');
    
    // Common license number patterns
    const patterns = [
      /(?:License|Licence|DL|No\.?)\s*:?\s*([A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{8})/i,
      /(?:License|Licence|DL|No\.?)\s*:?\s*([A-Z]{2}\d{2}\s?\d{11})/i,
      /\b([A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{8})\b/,
      /\b([A-Z]{2}\d{13,15})\b/,
      /\b(\d{2}-\d{2}-\d{8})\b/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const licenseNumber = match[1].trim();
        console.log('✅ License number found:', licenseNumber);
        return licenseNumber;
      }
    }

    console.log('⚠️ No license number found');
    return null;
  }

  /**
   * Extract expiration date from OCR text
   */
  extractExpiryDate(text) {
    console.log('🔍 Extracting expiration date...');
    
    // Common date patterns
    const patterns = [
      // DD/MM/YYYY or DD-MM-YYYY
      /(?:Expir(?:y|ation)|Valid\s+(?:Until|Till|Thru)|Exp\.?)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      // YYYY-MM-DD
      /(?:Expir(?:y|ation)|Valid\s+(?:Until|Till|Thru)|Exp\.?)\s*:?\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
      // DD MMM YYYY or DD MMMM YYYY
      /(?:Expir(?:y|ation)|Valid\s+(?:Until|Till|Thru)|Exp\.?)\s*:?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
      // Standalone dates
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,
      /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/
    ];

    const foundDates = [];

    for (const pattern of patterns) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        const dateStr = match[1].trim();
        const parsedDate = this.parseDate(dateStr);
        if (parsedDate) {
          foundDates.push(parsedDate);
        }
      }
    }

    // Return the latest date (most likely to be expiry)
    if (foundDates.length > 0) {
      const latestDate = foundDates.reduce((latest, current) => 
        current > latest ? current : latest
      );
      console.log('✅ Expiration date found:', latestDate.toISOString().split('T')[0]);
      return latestDate;
    }

    console.log('⚠️ No expiration date found');
    return null;
  }

  /**
   * Parse date string to Date object
   */
  parseDate(dateStr) {
    try {
      // Try DD/MM/YYYY or DD-MM-YYYY
      let match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JS months are 0-indexed
        const year = parseInt(match[3]);
        const date = new Date(year, month, day);
        if (this.isValidDate(date)) return date;
      }

      // Try YYYY-MM-DD
      match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        const date = new Date(year, month, day);
        if (this.isValidDate(date)) return date;
      }

      // Try DD MMM YYYY
      const monthNames = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      match = dateStr.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})/i);
      if (match) {
        const day = parseInt(match[1]);
        const monthStr = match[2].toLowerCase();
        const year = parseInt(match[3]);
        const month = monthNames[monthStr];
        if (month !== undefined) {
          const date = new Date(year, month, day);
          if (this.isValidDate(date)) return date;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate if date is reasonable
   */
  isValidDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return false;
    const year = date.getFullYear();
    return year >= 2000 && year <= 2100; // Reasonable range
  }

  /**
   * Check if license is expired
   */
  isExpired(expiryDate) {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate < today;
  }

  /**
   * Main method to process license image
   */
  async processLicense(imagePath) {
    try {
      console.log('🚀 Starting license verification for:', imagePath);
      
      // Extract text using OCR
      const { text, confidence } = await this.extractText(imagePath);
      
      // Extract license details
      const licenseNumber = this.extractLicenseNumber(text);
      const expiryDate = this.extractExpiryDate(text);
      
      // Determine verification status
      let verificationStatus = 'pending';
      let autoRejected = false;
      let rejectionReason = null;

      if (!licenseNumber && !expiryDate) {
        verificationStatus = 'needs_manual_review';
        rejectionReason = 'OCR could not extract license details. Manual review required.';
      } else if (expiryDate && this.isExpired(expiryDate)) {
        verificationStatus = 'expired';
        autoRejected = true;
        rejectionReason = `License expired on ${expiryDate.toISOString().split('T')[0]}`;
      } else if (expiryDate) {
        verificationStatus = 'verified';
      } else {
        verificationStatus = 'needs_manual_review';
        rejectionReason = 'Could not extract expiration date. Manual review required.';
      }

      const result = {
        extractedLicenseNumber: licenseNumber,
        extractedExpiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
        verificationStatus,
        ocrConfidence: Math.round(confidence * 100) / 100,
        ocrRawText: text.substring(0, 500), // Store first 500 chars
        autoRejected,
        rejectionReason
      };

      console.log('✅ License verification completed:', result);
      return result;

    } catch (error) {
      console.error('❌ License processing failed:', error);
      return {
        extractedLicenseNumber: null,
        extractedExpiryDate: null,
        verificationStatus: 'needs_manual_review',
        ocrConfidence: 0,
        ocrRawText: null,
        autoRejected: false,
        rejectionReason: 'OCR processing failed: ' + error.message
      };
    }
  }

  /**
   * Cleanup worker
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      console.log('🛑 OCR worker terminated');
    }
  }
}

// Export singleton instance
module.exports = new OCRService();
