import React from 'react';

const ErrorModal = ({ isOpen, onClose, title, message, icon, actionButton }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.iconContainer}>
          <div style={styles.icon}>{icon || '⚠️'}</div>
        </div>
        
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.message}>{message}</p>
        
        <div style={styles.buttonGroup}>
          {actionButton && (
            <button 
              style={styles.actionButton}
              onClick={actionButton.onClick}
            >
              {actionButton.label}
            </button>
          )}
          <button 
            style={styles.closeButton}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    animation: 'fadeIn 0.2s ease-out'
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideUp 0.3s ease-out',
    textAlign: 'center'
  },
  iconContainer: {
    marginBottom: '1.5rem'
  },
  icon: {
    fontSize: '64px',
    animation: 'bounce 0.5s ease-out'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#000',
    marginBottom: '1rem',
    fontFamily: 'Inter, sans-serif'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '2rem',
    fontFamily: 'Inter, sans-serif'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  actionButton: {
    padding: '12px 24px',
    backgroundColor: '#FF8C00',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  closeButton: {
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'transform 0.2s, box-shadow 0.2s'
  }
};

// Add CSS animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `;
  if (!document.getElementById('error-modal-styles')) {
    styleSheet.id = 'error-modal-styles';
    document.head.appendChild(styleSheet);
  }
}

export default ErrorModal;
