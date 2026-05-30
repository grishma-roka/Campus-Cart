import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ErrorModal from "../components/ErrorModal";
import { GraduationCap, Camera } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    student_id: "",
    role: "buyer",
    license_number: "",
    license_image: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    icon: "",
    actionButton: null
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setError("Please upload only JPG or PNG images");
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      
      setForm({ ...form, license_image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate Herald College email format (stricter pattern)
    const emailPattern = /^np[0-9]{2}[a-z0-9]+@heraldcollege\.edu\.np$/;
    if (!emailPattern.test(form.email)) {
      setError("Invalid email! Please use your Herald College institutional email starting with 'np' (e.g., np03cs4a230143@heraldcollege.edu.np)");
      setLoading(false);
      return;
    }

    // Validate license number format for riders
    if (form.role === 'rider') {
      const licensePattern = /^[0-9]{2}-[0-9]{2}-[0-9]{8}$/;
      if (!form.license_number) {
        setError("License number is required for rider registration");
        setLoading(false);
        return;
      }
      if (!licensePattern.test(form.license_number)) {
        setError("Invalid license format! Use format: XX-XX-XXXXXXXX (e.g., 03-06-00354234)");
        setLoading(false);
        return;
      }
      // Note: License image is optional for now, can be uploaded later
    }

    try {
      // For riders: Skip user registration, go directly to rider application
      if (form.role === 'rider') {
        if (!form.license_number) {
          setError("License number is required for rider registration");
          setLoading(false);
          return;
        }

        if (!form.license_image) {
          setError("License image is required for rider registration");
          setLoading(false);
          return;
        }

        // Create FormData with all registration data
        const formData = new FormData();
        formData.append('full_name', form.full_name);
        formData.append('email', form.email);
        formData.append('password', form.password);
        formData.append('student_id', form.student_id);
        formData.append('license_number', form.license_number);
        formData.append('license_image', form.license_image);

        // Submit rider application directly
        try {
          const response = await fetch('http://localhost:5000/api/auth/register-rider', {
            method: 'POST',
            body: formData
          });

          const data = await response.json();

          if (response.ok && data.success) {
            setSuccess("Rider application submitted successfully! Admin will review your license and notify you via email. You'll be able to login after approval.");
            setTimeout(() => navigate("/login"), 4000);
          } else {
            // Handle specific error types
            if (data.error === 'LICENSE_EXPIRED') {
              setModalConfig({
                title: "License Expired",
                message: data.message || "Your license has already expired. Please upload a valid license.",
                icon: "⚠️",
                actionButton: {
                  label: "Upload Again",
                  onClick: () => {
                    setShowErrorModal(false);
                    setForm({ ...form, license_image: null });
                    setImagePreview(null);
                    document.getElementById('license_image')?.click();
                  }
                }
              });
              setShowErrorModal(true);
              setLoading(false);
              return;
            } else if (data.error === 'OCR_FAILED') {
              setModalConfig({
                title: "License Verification Failed",
                message: data.message || "We couldn't verify your license automatically. Please ensure the image is clear and all text is readable.",
                icon: "🔍",
                actionButton: {
                  label: "Try Again",
                  onClick: () => {
                    setShowErrorModal(false);
                    setForm({ ...form, license_image: null });
                    setImagePreview(null);
                    document.getElementById('license_image')?.click();
                  }
                }
              });
              setShowErrorModal(true);
              setLoading(false);
              return;
            } else {
              setError(data.message || data.error || "Failed to submit rider application");
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Rider application error:', err);
          setError("Failed to submit rider application. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        // For buyers and sellers: Normal registration flow
        const result = await register({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          student_id: form.student_id,
          role: form.role
        });
        
        if (result.success) {
          setSuccess("Registration successful! Please login.");
          setTimeout(() => navigate("/login"), 3000);
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError("Registration failed. Please try again.");
    }
    
    setLoading(false);
  };

  return (
    <>
      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        icon={modalConfig.icon}
        actionButton={modalConfig.actionButton}
      />
      
      <div style={styles.container}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>Join Campus Cart</h2>
        
        {/* Institutional Email Notice */}
        <div style={styles.noticeBox}>
          <div style={styles.noticeIcon}><GraduationCap size={44} color="#FFF" /></div>
          <div style={styles.noticeContent}>
            <h4 style={styles.noticeTitle}>Herald College Students Only</h4>
            <p style={styles.noticeText}>
              To keep this community safe and exclusive to our student body, we require a valid institutional email to get started.
            </p>
            <p style={styles.noticeText}>
              Whether you're here to buy, sell, or ride, you must register using the format:
            </p>
            <div style={styles.emailExample}>
              <strong>your-id@heraldcollege.edu.np</strong>
            </div>
            <p style={styles.noticeExample}>
              Example: <code style={styles.codeText}>np03cs4a230143@heraldcollege.edu.np</code>
            </p>
            <p style={styles.noticeWarning}>
              If your email doesn't match this pattern, the system won't let you through. Let's keep it within the campus family!
            </p>
          </div>
        </div>
        
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name *</label>
            <input
              name="full_name"
              placeholder="Enter your full name"
              value={form.full_name}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address *</label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email address"
              value={form.email}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Student ID *</label>
            <input
              name="student_id"
              placeholder="Enter your student ID"
              value={form.student_id}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password *</label>
            <input
              name="password"
              type="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Role *</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="buyer">Buyer - Browse and purchase items</option>
              <option value="seller">Seller - List and sell items</option>
              <option value="rider">Rider - Deliver items (Requires Admin Approval)</option>
            </select>
          </div>

          {/* Show license fields only when rider is selected */}
          {form.role === 'rider' && (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>License Number * (Format: XX-XX-XXXXXXXX)</label>
                <input
                  name="license_number"
                  placeholder="e.g., 03-06-00354234"
                  value={form.license_number}
                  onChange={handleChange}
                  required={form.role === 'rider'}
                  style={styles.input}
                  pattern="[0-9]{2}-[0-9]{2}-[0-9]{8}"
                />
                <small style={styles.helpText}>Enter your license number exactly as shown on your card</small>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>License Image * (JPG or PNG, Max 5MB)</label>
                <div style={styles.fileUploadContainer}>
                  <input
                    type="file"
                    id="license_image"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    required={form.role === 'rider'}
                    style={styles.fileInput}
                  />
                  <label htmlFor="license_image" style={styles.fileLabel}>
                    <span style={styles.uploadIcon}><Camera size={24} color="#64748b" /></span>
                    <span style={styles.uploadText}>
                      {form.license_image ? form.license_image.name : 'Tap to upload license photo'}
                    </span>
                  </label>
                </div>
                {imagePreview && (
                  <div style={styles.imagePreviewContainer}>
                    <img src={imagePreview} alt="License preview" style={styles.imagePreview} />
                    <button 
                      type="button"
                      onClick={() => {
                        setForm({ ...form, license_image: null });
                        setImagePreview(null);
                      }}
                      style={styles.removeImageButton}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
                <small style={styles.helpText}>Upload a clear photo of your driving license</small>
              </div>
            </>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Registering..." : 
             form.role === 'rider' ? "Register & Apply for Rider" : "Register"}
          </button>
        </form>
        
        <p style={styles.linkText}>
          Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
        </p>
      </div>
    </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#EAF4FE',
    padding: '1rem'
  },
  formCard: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  title: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#333'
  },
  noticeBox: {
    background: 'linear-gradient(135deg, #F88000 0%, #FF8C00 100%)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    color: 'white',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3)'
  },
  noticeIcon: {
    fontSize: '32px',
    textAlign: 'center',
    marginBottom: '0.5rem'
  },
  noticeContent: {
    textAlign: 'center'
  },
  noticeTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'white'
  },
  noticeText: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    opacity: 0.95
  },
  emailExample: {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '0.75rem',
    borderRadius: '8px',
    margin: '0.75rem 0',
    fontSize: '1rem',
    fontFamily: 'monospace',
    backdropFilter: 'blur(10px)'
  },
  noticeExample: {
    margin: '0.75rem 0',
    fontSize: '0.85rem',
    opacity: 0.9
  },
  codeText: {
    background: 'rgba(255, 255, 255, 0.25)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.9rem'
  },
  noticeWarning: {
    margin: '0.75rem 0 0 0',
    fontSize: '0.85rem',
    fontWeight: '600',
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '0.5rem',
    borderRadius: '6px',
    backdropFilter: 'blur(10px)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '0.5rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '0.5rem'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box'
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: '#fff',
    width: '100%',
    boxSizing: 'border-box'
  },
  helpText: {
    fontSize: '0.8rem',
    color: '#666',
    marginTop: '0.25rem',
    display: 'block'
  },
  fileUploadContainer: {
    position: 'relative',
    marginBottom: '0.5rem'
  },
  fileInput: {
    position: 'absolute',
    opacity: 0,
    width: '0.1px',
    height: '0.1px',
    overflow: 'hidden',
    zIndex: -1
  },
  fileLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    justifyContent: 'center'
  },
  uploadIcon: {
    fontSize: '24px'
  },
  uploadText: {
    fontSize: '0.9rem',
    color: '#374151',
    fontWeight: '500'
  },
  imagePreviewContainer: {
    marginTop: '1rem',
    position: 'relative',
    display: 'inline-block',
    width: '100%'
  },
  imagePreview: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '2px solid #e5e7eb'
  },
  removeImageButton: {
    marginTop: '0.5rem',
    padding: '0.5rem 1rem',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%'
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#F88000',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
    fontWeight: '600'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  linkText: {
    textAlign: 'center',
    marginTop: '1rem',
    color: '#666'
  },
  link: {
    color: '#F88000',
    textDecoration: 'none',
    fontWeight: '600'
  }
};
