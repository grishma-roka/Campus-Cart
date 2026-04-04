# Campus Cart

A campus-based marketplace app for students to buy, sell, borrow, and deliver items easily.

## Key Features

### 🛒 Marketplace (Buy/Sell)
- Browse items by category.
- Advanced search with smart suggestions.
- Direct purchase and shopping cart functionality.
- Seller dashboard to manage listings.

### 🤝 Borrowing System
- Dedicated marketplace for borrowing items temporarily.
- Request-based flow with seller approval.
- Direct chat between borrower and owner for coordination.

### 🚲 Campus Delivery (Rider Mode)
- Students can apply as riders to deliver orders on campus.
- Real-time delivery tracking and status updates.
- Automated rider registration with license verification.

---

## Rider Registration & OCR Logic

Automated license verification system for Campus Cart rider registration using Optical Character Recognition (OCR) technology powered by **Tesseract.js**.

### 🔍 How It Works
1.  **Image Prep**: When a user uploads a license photo, the backend (using **Sharp**) resizes and sharpens the image to maximize OCR accuracy.
2.  **Data Extraction**: The OCR engine extracts the License Number and Expiration Date.
3.  **Validation**:
    - **Verified**: Future expiry date found = pending admin approval.
    - **Expired**: Past expiry date found = **Auto-rejected**.
    - **Manual Review**: OCR failed to read data = Admin must check manually.

### ⚠️ UI Flow & Error Handling
- **Structured Error Responses**: The backend returns specific codes like `LICENSE_EXPIRED` or `OCR_FAILED`.
-  **Interactive Modals**: The registration page displays a sleek, animated modal on failure, allowing users to "Try Again" or "Upload Clearer Photo" without losing their form data.
- **Admin Dashboard**: Admins view a verification panel showing the original image alongside the extracted data and confidence scores.

---

## Technical Stack

- **Frontend**: React, Lucide-React, Axios.
- **Backend**: Node.js, Express, MySQL.
- **Tools**: Tesseract.js (OCR), Sharp (Image Processing), Multer (FileUploads).

## Developer Setup

1. `npm install` in both root and backend/frontend directories.
2. Setup MySQL database using `backend/db/schema.sql`.
3. Configure `.env` in the backend.
4. Run `npm start` for frontend and `node server.js` for backend.
