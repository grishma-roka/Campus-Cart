const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../config/upload');

const router = express.Router();

/* ---------------------- REGISTER ---------------------- */
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, student_id, role } = req.body;

    console.log('📝 Registration attempt:', { email, role });

    // Validate Herald College email format (stricter pattern starting with 'np')
    const emailPattern = /^np[0-9]{2}[a-z0-9]+@heraldcollege\.edu\.np$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ 
        error: "Invalid email! Please use your Herald College institutional email starting with 'np' (e.g., np03cs4a230143@heraldcollege.edu.np)" 
      });
    }

    // Check existing email
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // For riders: Don't create user account yet, just store registration data
    if (role === 'rider') {
      console.log('🏍️ Rider registration - storing data for later user creation');
      
      // Store registration data temporarily (will be used after admin approval)
      // Return special response indicating rider application flow
      res.json({ 
        message: "Registration data received. Please upload your license for verification.", 
        isRiderApplication: true,
        tempData: {
          full_name,
          email,
          student_id,
          password // Will be hashed when user is created after approval
        },
        requiresRiderApplication: true,
        canLoginImmediately: false
      });
      return;
    }

    // For buyers and sellers: Create user account immediately
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'buyer';
    
    const [result] = await db.query(
      "INSERT INTO users (full_name, email, password, student_id, role, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [full_name, email, hashedPassword, student_id, userRole, true]
    );

    console.log(`✅ User registered: ${email} (role: ${userRole})`);

    res.json({ 
      message: "User registered successfully", 
      userId: result.insertId,
      requiresRiderApplication: false,
      canLoginImmediately: true
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- RIDER APPLICATION WITH FILE UPLOAD ---------------------- */
router.post('/register-rider', upload.single('license_image'), async (req, res) => {
  try {
    const { full_name, email, password, student_id, license_number } = req.body;
    
    console.log('🏍️ Rider application received:', { email, license_number, hasFile: !!req.file });
    
    // Validate all required fields
    if (!full_name || !email || !password || !student_id || !license_number) {
      return res.status(400).json({ 
        error: "All fields are required for rider registration." 
      });
    }

    // Check if email already exists in users or rider_requests
    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    const [existingRequest] = await db.query("SELECT id FROM rider_requests WHERE email = ?", [email]);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already registered as a user" });
    }
    
    if (existingRequest.length > 0) {
      return res.status(400).json({ error: "Rider application already submitted with this email" });
    }
    
    // Validate license number format
    const licensePattern = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{8}$/i;
    if (!licensePattern.test(license_number)) {
      return res.status(400).json({ 
        error: "Invalid license format! Use format: XX-XX-XXXXXXXX (e.g., 03-06-00354234)" 
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        error: "License image is required" 
      });
    }

    const license_image = req.file.path;
    const fullImagePath = req.file.path;

    console.log('💾 Processing license image with OCR...');
    
    // Process license image with OCR
    const ocrService = require('../services/ocrService');
    const ocrResult = await ocrService.processLicense(fullImagePath);
    
    console.log('📊 OCR Result:', ocrResult);

    // Hash password for storage (will be used when user is created after approval)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert rider request with user data and OCR results
    const [result] = await db.query(
      `INSERT INTO rider_requests (
        full_name, email, password, student_id,
        license_number, license_image,
        extracted_license_number, extracted_expiry_date,
        verification_status, ocr_confidence, ocr_raw_text,
        auto_rejected, rejection_reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name,
        email,
        hashedPassword,
        student_id,
        license_number,
        license_image,
        ocrResult.extractedLicenseNumber,
        ocrResult.extractedExpiryDate,
        ocrResult.verificationStatus,
        ocrResult.ocrConfidence,
        ocrResult.ocrRawText,
        ocrResult.autoRejected,
        ocrResult.rejectionReason,
        ocrResult.autoRejected ? 'rejected' : 'pending'
      ]
    );

    console.log('✅ Rider request created successfully');

    // Send email notifications
    const sendMail = require('../utils/sendEmail');
    
    if (ocrResult.autoRejected) {
      // Send auto-rejection email
      console.log('📧 Sending auto-rejection email...');
      await sendMail(
        'Rider Application - License Verification Failed',
        `Hello ${full_name},

❌ Your rider application has been automatically rejected due to license verification issues.

📋 Verification Details:
License Number: ${license_number}
Reason: ${ocrResult.rejectionReason}

🔄 What you can do:
• Ensure your license is valid and not expired
• Upload a clear, high-quality image of your license
• Make sure all text on the license is readable
• Reapply with a valid license at: http://localhost:3000/register

📞 Questions? Contact support for assistance.

Thank you for your interest in Campus Cart.

Best regards,
Campus Cart Team`
      );
      console.log('✅ Auto-rejection email sent');
    } else if (ocrResult.verificationStatus === 'needs_manual_review') {
      // Notify admin for manual review
      console.log('📧 Sending manual review notification to admin...');
      await sendMail(
        '⚠️ Rider Application Needs Manual Review - Campus Cart',
        `New rider application requires manual review:

👤 Applicant: ${full_name}
📧 Email: ${email}
🆔 Student ID: ${student_id}
🪪 License Number: ${license_number}

⚠️ OCR Verification Status: ${ocrResult.verificationStatus}
📝 Reason: ${ocrResult.rejectionReason}

🔍 OCR Results:
• Extracted License: ${ocrResult.extractedLicenseNumber || 'Not detected'}
• Extracted Expiry: ${ocrResult.extractedExpiryDate || 'Not detected'}
• Confidence: ${ocrResult.ocrConfidence}%

👉 Please review the license image manually in the admin panel.

Login to admin panel: http://localhost:3000/login`
      );
      console.log('✅ Manual review notification sent');
    } else {
      // Send normal pending notification to admin
      console.log('📧 Sending approval request to admin...');
      await sendMail(
        'New Rider Application - Campus Cart',
        `New rider application received and awaiting your approval:

👤 Name: ${full_name}
📧 Email: ${email}
🆔 Student ID: ${student_id}
🪪 License Number: ${license_number}

✅ OCR Verification: ${ocrResult.verificationStatus}
📅 License Expiry: ${ocrResult.extractedExpiryDate || 'Not detected'}
🎯 Confidence: ${ocrResult.ocrConfidence}%

⚠️ IMPORTANT: User account will be created only after you approve this request.

Please review this application in the admin panel.

Login to admin panel: http://localhost:3000/login`
      );
      console.log('✅ Admin notification sent');
    }

    // Prepare response based on verification status
    if (ocrResult.autoRejected && ocrResult.verificationStatus === 'expired') {
      // License is expired - return error response
      console.log('❌ License expired - returning error response');
      return res.status(400).json({
        success: false,
        error: "LICENSE_EXPIRED",
        message: "Your license has already expired. Please upload a valid license.",
        extracted_expiry_date: ocrResult.extractedExpiryDate,
        verification_status: ocrResult.verificationStatus
      });
    } else if (ocrResult.verificationStatus === 'needs_manual_review') {
      // OCR couldn't extract data properly
      console.log('⚠️ Manual review required - returning warning response');
      return res.status(400).json({
        success: false,
        error: "OCR_FAILED",
        message: "We couldn't verify your license automatically. Please ensure the image is clear and all text is readable, then try again.",
        verification_status: ocrResult.verificationStatus,
        rejection_reason: ocrResult.rejectionReason
      });
    }

    // License is valid - proceed with normal response
    res.json({ 
      success: true,
      message: "Rider application submitted successfully! Admin will review and notify you via email. You'll be able to login after approval.",
      license_image,
      verification_status: ocrResult.verificationStatus,
      ocr_confidence: ocrResult.ocrConfidence,
      extracted_expiry_date: ocrResult.extractedExpiryDate
    });

  } catch (error) {
    console.error('❌ Rider registration error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- LOGIN ---------------------- */
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt received:', { email: req.body.email });
    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    console.log('📊 Database query result:', rows.length > 0 ? 'User found' : 'User not found');

    if (rows.length === 0) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];
    console.log('👤 User details:', { id: user.id, email: user.email, role: user.role, is_active: user.is_active });

    // Check if user is active (only for deactivated accounts)
    if (!user.is_active) {
      console.log('❌ Login failed: Account deactivated');
      return res.status(403).json({ 
        error: "Your account has been deactivated. Please contact admin.",
        accountDeactivated: true
      });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match:', match ? 'Yes' : 'No');
    
    if (!match) {
      console.log('❌ Login failed: Invalid password');
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check rider approval status (skip for admins)
    if (!user.is_admin && (user.role === 'rider' || user.is_rider)) {
      console.log('🏍️ Checking rider approval status...');
      const [riderRequests] = await db.query(
        "SELECT status FROM rider_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [user.id]
      );

      if (riderRequests.length === 0) {
        console.log('❌ Login failed: No rider application found');
        return res.status(403).json({ 
          error: "No rider application found. Please apply to become a rider first.",
          riderStatus: 'no_application'
        });
      }

      const riderStatus = riderRequests[0].status;
      console.log('🏍️ Rider status:', riderStatus);

      if (riderStatus === 'pending') {
        console.log('⏳ Login blocked: Rider application pending');
        return res.status(403).json({ 
          error: "Your rider account is awaiting admin approval.",
          riderStatus: 'pending'
        });
      }

      if (riderStatus === 'rejected') {
        console.log('❌ Login blocked: Rider application rejected');
        return res.status(403).json({ 
          error: "Your rider request was rejected. Please contact admin.",
          riderStatus: 'rejected'
        });
      }

      // Only 'approved' riders can proceed
      if (riderStatus !== 'approved') {
        console.log('❌ Login blocked: Invalid rider status');
        return res.status(403).json({ 
          error: "Your rider account status is invalid. Please contact admin.",
          riderStatus: riderStatus
        });
      }

      console.log('✅ Rider approved - login allowed');
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log('✅ Login successful for user:', user.email);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_buyer: !!user.is_buyer,
        is_seller: !!user.is_seller,
        is_rider: !!user.is_rider,
        is_admin: !!user.is_admin,
        student_id: user.student_id,
        created_at: user.created_at,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- GET CURRENT USER ---------------------- */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      "SELECT id, full_name, email, role, is_buyer, is_seller, is_rider, is_admin, student_id, phone, profile_image, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- INCOME SUMMARY ---------------------- */
router.get('/income-summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await db.query(
      "SELECT role, is_buyer, is_seller, is_rider FROM users WHERE id = ?",
      [userId]
    );
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const u = userRows[0];

    const result = {};

    // SELLER income: sum of all confirmed/delivered orders where they are seller
    if (u.role === 'seller' || u.is_seller) {
      const [sellerRows] = await db.query(`
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_sales,
          SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as delivered_amount,
          SUM(CASE WHEN status = 'pending' OR status = 'confirmed' OR status = 'assigned' OR status = 'picked_up' THEN total_amount ELSE 0 END) as pending_amount
        FROM orders WHERE seller_id = ? AND status != 'cancelled'
      `, [userId]);
      result.seller = sellerRows[0];
    }

    // BUYER spending: total amount spent on all non-cancelled orders
    if (u.is_buyer || u.role === 'buyer') {
      const [buyerRows] = await db.query(`
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_spent,
          SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as delivered_amount,
          SUM(CASE WHEN status IN ('pending','confirmed','assigned','picked_up') THEN total_amount ELSE 0 END) as pending_amount
        FROM orders WHERE buyer_id = ? AND status != 'cancelled'
      `, [userId]);
      result.buyer = buyerRows[0];
    }

    // RIDER income: delivery fees from completed deliveries
    if (u.role === 'rider' || u.is_rider) {
      const [riderRows] = await db.query(`
        SELECT
          COUNT(*) as total_deliveries,
          SUM(CASE WHEN status = 'delivered' THEN delivery_fee ELSE 0 END) as total_earned,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed,
          COUNT(CASE WHEN status IN ('assigned','picked_up') THEN 1 END) as active
        FROM deliveries WHERE rider_id = ?
      `, [userId]);
      result.rider = riderRows[0];
    }

    // BORROW LENDER income: total cost from returned borrow requests where user is the lender
    const [borrowLendRows] = await db.query(`
      SELECT
        COUNT(*) as total_lent,
        SUM(CASE WHEN status = 'returned' THEN total_cost ELSE 0 END) as total_earned,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as currently_active
      FROM borrow_requests WHERE seller_id = ?
    `, [userId]);
    if (borrowLendRows[0].total_lent > 0) {
      result.borrow_lender = borrowLendRows[0];
    }

    // BORROW BORROWER spending: total cost from borrow requests they placed
    const [borrowSpendRows] = await db.query(`
      SELECT
        COUNT(*) as total_borrowed,
        SUM(CASE WHEN status = 'returned' THEN total_cost ELSE 0 END) as total_spent,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as currently_active
      FROM borrow_requests WHERE borrower_id = ?
    `, [userId]);
    if (borrowSpendRows[0].total_borrowed > 0) {
      result.borrow_borrower = borrowSpendRows[0];
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- UPDATE PROFILE ---------------------- */
router.put('/profile', authMiddleware, upload.single('profile_image'), async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const userId = req.user.id;

    if (req.file) {
      const profile_image = req.file.path;
      await db.query(
        "UPDATE users SET full_name = ?, phone = ?, profile_image = ? WHERE id = ?",
        [full_name, phone, profile_image, userId]
      );
    } else {
      await db.query(
        "UPDATE users SET full_name = ?, phone = ? WHERE id = ?",
        [full_name, phone, userId]
      );
    }

    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
const requireRole = require('../middlewares/roleMiddleware');

// Example: only sellers can access
router.get('/seller-only', authMiddleware, requireRole(['seller']), (req, res) => {
  res.json({ message: "Hello Seller! Access granted." });
});

// Example: only riders can access
router.get('/rider-only', authMiddleware, requireRole(['rider']), (req, res) => {
  res.json({ message: "Hello Rider! Access granted." });
});

// Example: only admin can access
router.get('/admin-only', authMiddleware, requireRole(['admin']), (req, res) => {
  res.json({ message: "Hello Admin! Access granted." });
});


module.exports = router;
