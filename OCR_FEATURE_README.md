# OCR-Based License Verification Feature

## Overview
Automated license verification system for Campus Cart rider registration using Optical Character Recognition (OCR) technology.

## Features Implemented

### 1. **Automatic License Verification**
- ✅ Extracts license number from uploaded images
- ✅ Extracts expiration date automatically
- ✅ Validates expiration date (auto-rejects expired licenses)
- ✅ Provides OCR confidence score
- ✅ Stores raw OCR text for audit trail

### 2. **File Upload Security**
- ✅ File type validation (JPG/PNG only)
- ✅ File size limit (5MB maximum)
- ✅ Secure storage in non-public directory
- ✅ Unique filename generation

### 3. **Verification Statuses**
- **verified**: License is valid and expiry date is in the future
- **expired**: License expiration date is in the past (auto-rejected)
- **needs_manual_review**: OCR couldn't extract required data
- **pending**: Awaiting admin review
- **rejected**: Admin rejected the application

### 4. **Admin Dashboard Integration**
- ✅ Display extracted license number
- ✅ Display extracted expiration date
- ✅ Show OCR confidence level
- ✅ License image preview
- ✅ Verification status badges
- ✅ Auto-rejection indicators
- ✅ Rejection reason display

### 5. **Email Notifications**
- ✅ Auto-rejection email (expired license)
- ✅ Manual review notification (to admin)
- ✅ Approval request (to admin)
- ✅ Detailed OCR results in emails

### 6. **Security & Compliance**
- ✅ Backend-only OCR processing
- ✅ JWT authentication on all routes
- ✅ No sensitive data in frontend logs
- ✅ Secure image storage
- ✅ Audit trail logging

## Technical Stack

### Backend Dependencies
- **tesseract.js**: OCR engine for text extraction
- **sharp**: Image preprocessing for better OCR accuracy
- **multer**: File upload handling

### Database Schema
```sql
ALTER TABLE rider_requests ADD:
- extracted_license_number VARCHAR(100)
- extracted_expiry_date DATE
- verification_status ENUM(...)
- ocr_confidence DECIMAL(5,2)
- ocr_raw_text TEXT
- auto_rejected BOOLEAN
- rejection_reason TEXT
```

## How It Works

### 1. Rider Registration Flow
```
User uploads license image
    ↓
Backend receives file
    ↓
Image preprocessing (grayscale, sharpen, normalize)
    ↓
OCR extraction (Tesseract.js)
    ↓
Parse license number & expiry date
    ↓
Validate expiration date
    ↓
Determine verification status
    ↓
Store in database
    ↓
Send appropriate email notification
```

### 2. Verification Logic
```javascript
if (no data extracted) {
  status = 'needs_manual_review'
  notify admin
} else if (expiry date < today) {
  status = 'expired'
  auto_reject = true
  notify rider
} else if (expiry date valid) {
  status = 'verified'
  notify admin for approval
} else {
  status = 'needs_manual_review'
  notify admin
}
```

### 3. Admin Review Process
```
Admin logs in
    ↓
Views rider requests
    ↓
Sees OCR verification data:
  - Extracted license number
  - Extracted expiry date
  - OCR confidence score
  - Verification status
  - License image preview
    ↓
Makes decision:
  - Approve (if verified)
  - Reject (if issues found)
  - Request re-upload (if needed)
```

## OCR Accuracy

### Supported License Formats
- **License Number**: XX-XX-XXXXXXXX (e.g., 03-06-00354234)
- **Date Formats**:
  - DD/MM/YYYY
  - DD-MM-YYYY
  - YYYY-MM-DD
  - DD MMM YYYY (e.g., 15 Jan 2025)

### Image Preprocessing
1. Resize to optimal width (2000px)
2. Convert to grayscale
3. Normalize contrast
4. Sharpen edges

### Confidence Scoring
- OCR provides confidence score (0-100%)
- Displayed to admin for decision support
- Low confidence triggers manual review

## API Endpoints

### POST /api/auth/register-rider
**Request:**
```javascript
FormData {
  user_id: number,
  license_number: string,
  license_image: File (JPG/PNG, max 5MB)
}
```

**Response:**
```javascript
{
  message: string,
  license_image: string,
  verification_status: string,
  auto_rejected: boolean,
  ocr_confidence: number,
  extracted_expiry_date: string
}
```

### GET /api/admin/rider-requests
**Response:**
```javascript
[{
  id: number,
  user_id: number,
  full_name: string,
  email: string,
  license_number: string,
  license_image: string,
  extracted_license_number: string,
  extracted_expiry_date: date,
  verification_status: string,
  ocr_confidence: number,
  auto_rejected: boolean,
  rejection_reason: string,
  status: string,
  created_at: timestamp
}]
```

## Testing the Feature

### 1. Register as Rider
1. Go to registration page
2. Select "Rider" role
3. Fill in details
4. Upload clear license image
5. Submit application

### 2. Check OCR Results
- If license expired → Auto-rejected with email
- If OCR fails → Manual review notification
- If valid → Pending admin approval

### 3. Admin Review
1. Login as admin
2. Go to "Rider Requests" tab
3. View OCR verification data
4. Review license image
5. Approve or reject

## Error Handling

### OCR Failures
- Gracefully handles OCR errors
- Falls back to manual review
- Logs error details for debugging

### File Upload Errors
- Validates file type and size
- Returns clear error messages
- Prevents invalid uploads

### Database Errors
- Transaction rollback on failure
- Detailed error logging
- User-friendly error messages

## Performance Considerations

### OCR Processing Time
- Average: 3-5 seconds per image
- Depends on image size and quality
- Runs asynchronously (non-blocking)

### Image Storage
- Stored in `backend/uploads/licenses/`
- Not publicly accessible
- Unique filenames prevent conflicts

### Database Optimization
- Indexed fields for fast queries
- Efficient JOIN operations
- Minimal data storage

## Future Enhancements

### Potential Improvements
1. **Multiple OCR Engines**: Fallback to Google Vision API if Tesseract fails
2. **Image Quality Check**: Validate image clarity before OCR
3. **Batch Processing**: Process multiple applications simultaneously
4. **ML Model**: Train custom model for license recognition
5. **Real-time Validation**: Check license against government database
6. **Mobile Optimization**: Better handling of mobile-captured images

## Troubleshooting

### Common Issues

**Issue**: OCR not extracting data
**Solution**: 
- Ensure image is clear and well-lit
- Check license text is readable
- Try different image format (JPG vs PNG)

**Issue**: Wrong expiry date extracted
**Solution**:
- Manual review by admin
- Admin can override OCR results

**Issue**: File upload fails
**Solution**:
- Check file size (< 5MB)
- Verify file type (JPG/PNG only)
- Check server disk space

## Security Notes

### Data Protection
- License images stored securely
- No public access to uploads folder
- JWT authentication required
- Sensitive data not logged

### Compliance
- GDPR-compliant data handling
- Audit trail for all decisions
- Secure data transmission (HTTPS)
- Right to deletion supported

## Maintenance

### Regular Tasks
1. Monitor OCR accuracy rates
2. Review auto-rejection patterns
3. Clean up old license images
4. Update OCR patterns as needed
5. Check disk space usage

### Logs to Monitor
- OCR processing times
- Extraction success rates
- Auto-rejection reasons
- Manual review frequency

## Support

For issues or questions:
1. Check backend logs for OCR errors
2. Review admin dashboard for verification status
3. Contact system administrator
4. Submit bug report with sample image

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintained by**: Campus Cart Development Team
