import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function RoleSwitcher({ currentMode, onModeChange }) {
  const { userRoles, becomeSeller, applyForRider } = useAuth();
  const [showRiderForm, setShowRiderForm] = useState(false);
  const [riderFormData, setRiderFormData] = useState({
    license_number: '',
    license_issue_date: '',
    license_expiry_date: '',
    license_image: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const handleBecomeSeller = async () => {
    if (!userRoles?.is_seller) {
      const result = await becomeSeller();
      if (result.success) {
        alert(result.message);
        window.location.reload(); // Refresh to update roles
      } else {
        alert(result.error);
      }
    } else {
      onModeChange('seller');
    }
  };

  const handleApplyRider = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const errors = {};
    if (!riderFormData.license_number.trim()) {
      errors.license_number = 'License number is required';
    }
    if (!riderFormData.license_image.trim()) {
      errors.license_image = 'License image URL is required';
    }
    if (!riderFormData.license_issue_date) {
      errors.license_issue_date = 'License issue date is required';
    }
    if (!riderFormData.license_expiry_date) {
      errors.license_expiry_date = 'License expiry date is required';
    }
    
    // Check if expiry date is in the future
    if (riderFormData.license_expiry_date) {
      const expiryDate = new Date(riderFormData.license_expiry_date);
      const today = new Date();
      if (expiryDate <= today) {
        errors.license_expiry_date = 'License must not be expired';
      }
    }
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      alert('Please fix the errors in the form before submitting.');
      return;
    }
    
    const result = await applyForRider(riderFormData);
    if (result.success) {
      alert(result.message);
      setShowRiderForm(false);
      setRiderFormData({
        license_number: '',
        license_issue_date: '',
        license_expiry_date: '',
        license_image: ''
      });
      setImagePreview('');
      setFormErrors({});
    } else {
      alert(result.error);
    }
  };

  const handleImageUrlChange = (url) => {
    setRiderFormData({
      ...riderFormData,
      license_image: url
    });
    setImagePreview(url);
  };

  const availableRoles = userRoles?.available_roles || [];

  return (
    <div style={styles.container}>
      <div style={styles.currentMode}>
        <span style={styles.modeLabel}>Current Mode:</span>
        <span style={{
          ...styles.modeBadge,
          backgroundColor: getModeColor(currentMode)
        }}>
          {currentMode.toUpperCase()}
        </span>
      </div>

      <div style={styles.switchButtons}>
        {/* Buyer Mode */}
        {availableRoles.includes('buyer') && (
          <button
            onClick={() => onModeChange('buyer')}
            style={{
              ...styles.switchButton,
              backgroundColor: currentMode === 'buyer' ? '#3498db' : '#ecf0f1',
              color: currentMode === 'buyer' ? '#fff' : '#2c3e50'
            }}
          >
            🛒 Buyer Mode
          </button>
        )}

        {/* Seller Mode */}
        {availableRoles.includes('seller') ? (
          <button
            onClick={() => onModeChange('seller')}
            style={{
              ...styles.switchButton,
              backgroundColor: currentMode === 'seller' ? '#27ae60' : '#ecf0f1',
              color: currentMode === 'seller' ? '#fff' : '#2c3e50'
            }}
          >
            🏪 Seller Mode
          </button>
        ) : (
          <button
            onClick={handleBecomeSeller}
            style={styles.becomeButton}
          >
            ➕ Become Seller
          </button>
        )}

        {/* Rider Mode */}
        {availableRoles.includes('rider') ? (
          <button
            onClick={() => onModeChange('rider')}
            style={{
              ...styles.switchButton,
              backgroundColor: currentMode === 'rider' ? '#f39c12' : '#ecf0f1',
              color: currentMode === 'rider' ? '#fff' : '#2c3e50'
            }}
          >
            🚚 Rider Mode
          </button>
        ) : (
          <button
            onClick={() => setShowRiderForm(true)}
            style={styles.applyButton}
          >
            📝 Apply for Rider
          </button>
        )}

        {/* Admin Mode */}
        {availableRoles.includes('admin') && (
          <button
            onClick={() => onModeChange('admin')}
            style={{
              ...styles.switchButton,
              backgroundColor: currentMode === 'admin' ? '#e74c3c' : '#ecf0f1',
              color: currentMode === 'admin' ? '#fff' : '#2c3e50'
            }}
          >
            ⚙️ Admin Mode
          </button>
        )}
      </div>

      {/* Rider Application Form Modal */}
      {showRiderForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Apply to Become a Rider</h3>
            <p style={styles.formDescription}>
              📋 All fields are required. Your license image will be reviewed by admin before approval.
            </p>
            <form onSubmit={handleApplyRider}>
              <div style={styles.formGroup}>
                <label>License Number *</label>
                <input
                  type="text"
                  required
                  value={riderFormData.license_number}
                  onChange={(e) => setRiderFormData({
                    ...riderFormData,
                    license_number: e.target.value
                  })}
                  style={{
                    ...styles.input,
                    borderColor: formErrors.license_number ? '#e74c3c' : '#e9ecef'
                  }}
                  placeholder="Enter your license number"
                />
                {formErrors.license_number && (
                  <span style={styles.errorText}>{formErrors.license_number}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label>License Issue Date *</label>
                <input
                  type="date"
                  required
                  value={riderFormData.license_issue_date}
                  onChange={(e) => setRiderFormData({
                    ...riderFormData,
                    license_issue_date: e.target.value
                  })}
                  style={{
                    ...styles.input,
                    borderColor: formErrors.license_issue_date ? '#e74c3c' : '#e9ecef'
                  }}
                />
                {formErrors.license_issue_date && (
                  <span style={styles.errorText}>{formErrors.license_issue_date}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label>License Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={riderFormData.license_expiry_date}
                  onChange={(e) => setRiderFormData({
                    ...riderFormData,
                    license_expiry_date: e.target.value
                  })}
                  style={{
                    ...styles.input,
                    borderColor: formErrors.license_expiry_date ? '#e74c3c' : '#e9ecef'
                  }}
                />
                {formErrors.license_expiry_date && (
                  <span style={styles.errorText}>{formErrors.license_expiry_date}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label>License Image URL *</label>
                <input
                  type="url"
                  required
                  value={riderFormData.license_image}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  style={{
                    ...styles.input,
                    borderColor: formErrors.license_image ? '#e74c3c' : '#e9ecef'
                  }}
                  placeholder="https://example.com/license-image.jpg"
                />
                {formErrors.license_image && (
                  <span style={styles.errorText}>{formErrors.license_image}</span>
                )}
                <small style={styles.helpText}>
                  📷 Upload your license image to a service like Imgur, Google Drive, or Dropbox and paste the direct image URL here.
                </small>
              </div>

              {imagePreview && (
                <div style={styles.imagePreview}>
                  <label>License Image Preview:</label>
                  <img 
                    src={imagePreview} 
                    alt="License Preview" 
                    style={styles.previewImage}
                    onError={() => setImagePreview('')}
                  />
                </div>
              )}

              <div style={styles.formActions}>
                <button type="submit" style={styles.submitButton}>
                  Submit Application
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowRiderForm(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const getModeColor = (mode) => {
  const colors = {
    buyer: '#3498db',
    seller: '#27ae60',
    rider: '#f39c12',
    admin: '#e74c3c'
  };
  return colors[mode] || '#95a5a6';
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '1rem'
  },
  currentMode: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  modeLabel: {
    fontSize: '0.9rem',
    color: '#666',
    fontWeight: '500'
  },
  modeBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#fff'
  },
  switchButtons: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  switchButton: {
    padding: '0.5rem 1rem',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  },
  becomeButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  applyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f39c12',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  formDescription: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '1rem',
    marginTop: '0.25rem',
    transition: 'border-color 0.3s ease'
  },
  errorText: {
    color: '#e74c3c',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
    display: 'block'
  },
  helpText: {
    color: '#666',
    fontSize: '0.8rem',
    marginTop: '0.5rem',
    display: 'block',
    lineHeight: '1.4'
  },
  imagePreview: {
    marginBottom: '1rem'
  },
  previewImage: {
    width: '100%',
    maxWidth: '300px',
    height: 'auto',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    marginTop: '0.5rem'
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem'
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f39c12',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#95a5a6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};