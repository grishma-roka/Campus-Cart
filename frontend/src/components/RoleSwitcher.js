import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ShoppingBag, Store, Plus, Bike, Settings, ClipboardList, Camera, Send } from 'lucide-react';

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
      {/* Unified Mode Switcher Group */}
      <div className="mode-switcher-group" style={styles.modeSwitcherGroup}>
        <div style={styles.modeSwitcherLabel}>
          <span className="text-sm" style={styles.labelText}>Switch Mode</span>
        </div>
        
        <div className="pill-button-group" style={styles.pillButtonGroup}>
          {/* Buyer Mode - Active Blue */}
          <button
            onClick={() => onModeChange('buyer')}
            className="mode-pill-button"
            style={{
              ...styles.pillButton,
              ...(currentMode === 'buyer' ? styles.activeBuyerButton : styles.neutralButton)
            }}
          >
            <ShoppingBag size={16} strokeWidth={1.5} />
            <span style={styles.buttonText}>Buyer Mode</span>
          </button>

          {/* Seller Mode - Neutral White or Active */}
          {availableRoles.includes('seller') ? (
            <button
              onClick={() => onModeChange('seller')}
              className="mode-pill-button"
              style={{
                ...styles.pillButton,
                ...(currentMode === 'seller' ? styles.activeSellerButton : styles.neutralButton)
              }}
            >
              <Store size={16} strokeWidth={1.5} />
              <span style={styles.buttonText}>Seller Mode</span>
            </button>
          ) : (
            <button
              onClick={handleBecomeSeller}
              className="mode-pill-button"
              style={{
                ...styles.pillButton,
                ...styles.becomeSellerButton
              }}
            >
              <Plus size={16} strokeWidth={1.5} />
              <span style={styles.buttonText}>Become Seller</span>
            </button>
          )}

          {/* Rider Mode - Vibrant Amber with Motorcycle Icon */}
          {availableRoles.includes('rider') ? (
            <button
              onClick={() => onModeChange('rider')}
              className="mode-pill-button"
              style={{
                ...styles.pillButton,
                ...(currentMode === 'rider' ? styles.activeRiderButton : styles.riderButton)
              }}
            >
              <Bike size={16} strokeWidth={1.5} />
              <span style={styles.buttonText}>Rider Mode</span>
            </button>
          ) : (
            <button
              onClick={() => setShowRiderForm(true)}
              className="mode-pill-button"
              style={{
                ...styles.pillButton,
                ...styles.applyRiderButton
              }}
            >
              <Bike size={16} strokeWidth={1.5} />
              <span style={styles.buttonText}>Apply for Rider</span>
            </button>
          )}

          {/* Admin Mode - If Available */}
          {availableRoles.includes('admin') && (
            <button
              onClick={() => onModeChange('admin')}
              className="mode-pill-button"
              style={{
                ...styles.pillButton,
                ...(currentMode === 'admin' ? styles.activeAdminButton : styles.neutralButton)
              }}
            >
              <Settings size={16} strokeWidth={1.5} />
              <span style={styles.buttonText}>Admin Mode</span>
            </button>
          )}
        </div>
      </div>

      {/* Current Mode Indicator */}
      <div className="current-mode-indicator" style={styles.currentModeIndicator}>
        <div style={styles.statusDot}></div>
        <span className="text-sm" style={styles.currentModeText}>
          Active: <strong>{currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode</strong>
        </span>
      </div>

      {/* Rider Application Form Modal */}
      {showRiderForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 className="heading-md" style={{...styles.modalTitle, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Bike size={24} strokeWidth={1.5} /> Apply to Become a Rider
              </h3>
              <button 
                onClick={() => setShowRiderForm(false)}
                className="close-button"
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formDescription}>
                <div style={styles.descriptionIcon}><ClipboardList size={24} color="#F88000" strokeWidth={1.5} /></div>
                <div>
                  <p className="text-base" style={styles.descriptionTitle}>Required Information</p>
                  <p className="text-sm" style={styles.descriptionText}>
                    All fields are mandatory. Your license image will be reviewed by admin before approval.
                  </p>
                </div>
              </div>

              <form onSubmit={handleApplyRider} style={styles.form}>
                <div style={styles.formGroup}>
                  <label className="text-sm" style={styles.label}>License Number *</label>
                  <input
                    type="text"
                    required
                    value={riderFormData.license_number}
                    onChange={(e) => setRiderFormData({
                      ...riderFormData,
                      license_number: e.target.value
                    })}
                    className="rider-form-input"
                    style={{
                      ...styles.input,
                      borderColor: formErrors.license_number ? '#ef4444' : 'rgba(0, 0, 0, 0.1)'
                    }}
                    placeholder="Enter your license number"
                  />
                  {formErrors.license_number && (
                    <span style={styles.errorText}>{formErrors.license_number}</span>
                  )}
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label className="text-sm" style={styles.label}>License Issue Date *</label>
                    <input
                      type="date"
                      required
                      value={riderFormData.license_issue_date}
                      onChange={(e) => setRiderFormData({
                        ...riderFormData,
                        license_issue_date: e.target.value
                      })}
                      className="rider-form-input"
                      style={{
                        ...styles.input,
                        borderColor: formErrors.license_issue_date ? '#ef4444' : 'rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    {formErrors.license_issue_date && (
                      <span style={styles.errorText}>{formErrors.license_issue_date}</span>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label className="text-sm" style={styles.label}>License Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={riderFormData.license_expiry_date}
                      onChange={(e) => setRiderFormData({
                        ...riderFormData,
                        license_expiry_date: e.target.value
                      })}
                      className="rider-form-input"
                      style={{
                        ...styles.input,
                        borderColor: formErrors.license_expiry_date ? '#ef4444' : 'rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    {formErrors.license_expiry_date && (
                      <span style={styles.errorText}>{formErrors.license_expiry_date}</span>
                    )}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label className="text-sm" style={styles.label}>License Image URL *</label>
                  <input
                    type="url"
                    required
                    value={riderFormData.license_image}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    className="rider-form-input"
                    style={{
                      ...styles.input,
                      borderColor: formErrors.license_image ? '#ef4444' : 'rgba(0, 0, 0, 0.1)'
                    }}
                    placeholder="https://example.com/license-image.jpg"
                  />
                  {formErrors.license_image && (
                    <span style={styles.errorText}>{formErrors.license_image}</span>
                  )}
                  <small style={{...styles.helpText, display: 'flex', gap: '4px'}}>
                    <Camera size={14} color="#94a3b8" /> Upload your license image to a service like Imgur, Google Drive, or Dropbox and paste the direct image URL here.
                  </small>
                </div>

                {imagePreview && (
                  <div style={styles.imagePreview}>
                    <label className="text-sm" style={styles.label}>License Image Preview:</label>
                    <div style={styles.previewContainer}>
                      <img 
                        src={imagePreview} 
                        alt="License Preview" 
                        style={styles.previewImage}
                        onError={() => setImagePreview('')}
                      />
                    </div>
                  </div>
                )}

                <div style={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowRiderForm(false)}
                    className="cancel-button"
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-button" style={styles.submitButton}>
                    <Send size={16} strokeWidth={1.5} />
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--card-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: 'var(--spacing-md)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
    marginBottom: 'var(--spacing-lg)',
    fontFamily: 'Inter, sans-serif'
  },

  // Mode Switcher Group
  modeSwitcherGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)'
  },

  modeSwitcherLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  labelText: {
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontSize: '0.9rem',
    letterSpacing: '0.02em'
  },

  // Pill Button Group
  pillButtonGroup: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.4)',
    padding: '6px',
    borderRadius: '50px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
  },

  // Base Pill Button
  pillButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden',
    minHeight: '44px',
    whiteSpace: 'nowrap'
  },

  // Button States
  activeBuyerButton: {
    background: '#F88000',
    color: '#FFFFFF',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-1px)'
  },

  activeSellerButton: {
    background: '#F88000',
    color: '#FFFFFF',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-1px)'
  },

  activeRiderButton: {
    background: '#F88000',
    color: '#FFFFFF',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-1px)'
  },

  activeAdminButton: {
    background: '#F88000',
    color: '#FFFFFF',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-1px)'
  },

  neutralButton: {
    background: 'rgba(255, 255, 255, 0.9)',
    color: 'var(--text-secondary)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },

  becomeSellerButton: {
    background: '#EAF4FE',
    color: '#F88000',
    border: '1px solid rgba(248, 128, 0, 0.2)',
    boxShadow: '0 1px 3px rgba(248, 128, 0, 0.1)'
  },

  riderButton: {
    background: '#EAF4FE',
    color: '#F88000',
    border: '1px solid rgba(248, 128, 0, 0.2)',
    boxShadow: '0 1px 3px rgba(248, 128, 0, 0.1)'
  },

  applyRiderButton: {
    background: '#F88000',
    color: '#FFFFFF',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  },

  buttonIcon: {
    fontSize: '1.1rem',
    lineHeight: '1'
  },

  buttonText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    letterSpacing: '0.01em'
  },

  // Current Mode Indicator
  currentModeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.6)',
    padding: '8px 16px',
    borderRadius: '50px',
    border: '1px solid rgba(255, 255, 255, 0.3)'
  },

  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#F88000',
    boxShadow: '0 0 8px rgba(248, 128, 0, 0.4)',
    animation: 'pulse 2s infinite'
  },

  currentModeText: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: '500'
  },

  // Modal Styles
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 'var(--spacing-md)'
  },

  modalContent: {
    background: 'var(--card-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
    fontFamily: 'Inter, sans-serif'
  },

  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-lg)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#EAF4FE'
  },

  modalTitle: {
    color: 'var(--text-primary)',
    margin: 0,
    fontWeight: '700'
  },

  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: '1.2rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },

  modalBody: {
    padding: 'var(--spacing-lg)',
    maxHeight: 'calc(90vh - 120px)',
    overflowY: 'auto'
  },

  formDescription: {
    display: 'flex',
    gap: 'var(--spacing-md)',
    background: '#EAF4FE',
    border: '1px solid rgba(248, 128, 0, 0.2)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-lg)'
  },

  descriptionIcon: {
    fontSize: '1.5rem',
    lineHeight: '1'
  },

  descriptionTitle: {
    color: 'var(--text-primary)',
    fontWeight: '600',
    margin: '0 0 4px 0'
  },

  descriptionText: {
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: '1.5'
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)'
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--spacing-md)'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },

  label: {
    color: 'var(--text-primary)',
    fontWeight: '600',
    marginBottom: '8px',
    fontSize: '0.9rem'
  },

  input: {
    padding: '12px 16px',
    border: '2px solid rgba(0, 0, 0, 0.1)',
    borderRadius: 'var(--radius-button)',
    fontSize: '1rem',
    fontFamily: 'Inter, sans-serif',
    background: 'rgba(255, 255, 255, 0.9)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none'
  },

  errorText: {
    color: '#ef4444',
    fontSize: '0.8rem',
    marginTop: '4px',
    fontWeight: '500'
  },

  helpText: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    marginTop: '8px',
    lineHeight: '1.4'
  },

  imagePreview: {
    marginTop: 'var(--spacing-md)'
  },

  previewContainer: {
    marginTop: '8px',
    border: '2px dashed rgba(248, 128, 0, 0.3)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-md)',
    background: '#EAF4FE'
  },

  previewImage: {
    width: '100%',
    maxWidth: '300px',
    height: 'auto',
    borderRadius: 'var(--radius-button)',
    boxShadow: 'var(--shadow-card)'
  },

  formActions: {
    display: 'flex',
    gap: 'var(--spacing-md)',
    justifyContent: 'flex-end',
    marginTop: 'var(--spacing-lg)',
    paddingTop: 'var(--spacing-md)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },

  cancelButton: {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.9)',
    color: 'var(--text-secondary)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: 'var(--radius-button)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },

  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },

  submitIcon: {
    fontSize: '1rem'
  }
};