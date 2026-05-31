import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { XCircle, CheckCircle, User, Folder, Tag as TagIcon, Hash, ShoppingBag } from 'lucide-react';

// This prevents the page from crashing if images are a string or a JSON array
const safeParseImages = (imageData) => {
  if (!imageData) return [];
  if (Array.isArray(imageData)) return imageData;
  try {
    const parsed = JSON.parse(imageData);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    // If it's a plain string like "/uploads/...", just return it in an array
    return [imageData];
  }
};

const getSafeImageUrl = (img) => {
  if (!img) return 'https://via.placeholder.com/600x400?text=No+Image';
  if (img.startsWith('http')) return img;
  if (img.startsWith('/uploads/')) return `https://campus-cart-on6p.onrender.com${img}`;
  if (img.startsWith('uploads/')) return `https://campus-cart-on6p.onrender.com/${img}`;
  return `https://campus-cart-on6p.onrender.com/uploads/${img}`;
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchItemDetails();
  }, [id]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/items/${id}`);
      setItem(response.data);
    } catch (error) {
      console.error('Error fetching item details:', error);
      setError('Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/checkout/${id}`);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading item details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}><XCircle size={64} color="#ef4444" /></div>
        <h2 style={styles.errorTitle}>Item Not Found</h2>
        <p style={styles.errorText}>{error || 'This item does not exist'}</p>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const images = safeParseImages(item.images);
  const mainImage = images.length > 0 ? getSafeImageUrl(images[0]) : 'https://via.placeholder.com/600x400?text=No+Image';

  const isSold = item.is_sold || false;
  const isOwnItem = user && user.id === item.seller_id;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Back Button */}
        <button onClick={() => navigate(-1)} style={styles.backLink}>
          ← Back
        </button>

        <div style={styles.productLayout}>
          {/* Left Side - Image */}
          <div style={styles.imageSection}>
            <div style={styles.imageContainer}>
              <img src={mainImage} alt={item.title} style={styles.mainImage} />
              {isSold && (
                <div style={styles.soldOverlay}>
                  <span style={styles.soldBadge}>SOLD OUT</span>
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div style={styles.thumbnailGallery}>
                {images.slice(0, 4).map((img, index) => (
                  <img 
                    key={index}
                    src={getSafeImageUrl(img)} 
                    alt={`${item.title} ${index + 1}`}
                    style={styles.thumbnail}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div style={styles.detailsSection}>
            {/* Status Badge */}
            <div style={styles.statusBadge}>
              {isSold ? (
                <span style={styles.soldStatusBadge}><XCircle size={14} /> Sold Out</span>
              ) : (
                <span style={styles.availableStatusBadge}><CheckCircle size={14} /> Available</span>
              )}
            </div>

            {/* Title */}
            <h1 style={styles.title}>{item.title}</h1>

            {/* Price */}
            <div style={styles.priceSection}>
              <span style={styles.price}>रू {item.price?.toLocaleString()}</span>
            </div>

            {/* Seller Info */}
            <div style={styles.infoCard}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}><User size={14} /> Seller:</span>
                <span style={styles.infoValue}>{item.seller_name}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}><Folder size={14} /> Category:</span>
                <span style={styles.infoValue}>{item.category}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}><TagIcon size={14} /> Condition:</span>
                <span style={styles.infoValue}>{item.condition_status || 'Good'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}><Hash size={14} /> Quantity:</span>
                <span style={styles.infoValue}>1 (Fixed)</span>
              </div>
            </div>

            {/* Description */}
            <div style={styles.descriptionSection}>
              <h3 style={styles.sectionTitle}>Description</h3>
              <p style={styles.description}>{item.description}</p>
            </div>

            {/* Action Buttons */}
            <div style={styles.actionSection}>
              {!isSold && !isOwnItem && (
                <button 
                  onClick={handleBuyNow}
                  style={styles.buyNowButton}
                >
                  <ShoppingBag size={18} /> Buy Now
                </button>
              )}
              
              {isSold && (
                <div style={styles.soldMessage}>
                  This item has been sold and is no longer available.
                </div>
              )}

              {isOwnItem && !isSold && (
                <div style={styles.ownItemMessage}>
                  This is your item. You cannot purchase your own listing.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#EAF4FE',
    paddingTop: '120px',
    paddingBottom: '40px',
    fontFamily: 'Inter, sans-serif'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px'
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#fff',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    color: '#000',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'all 0.3s ease'
  },
  productLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    background: '#fff',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
  },
  
  // Image Section
  imageSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  imageContainer: {
    position: 'relative',
    background: '#F6F6F6',
    borderRadius: '16px',
    overflow: 'hidden',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mainImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  soldBadge: {
    fontSize: '32px',
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '4px',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
  },
  thumbnailGallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px'
  },
  thumbnail: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.3s ease'
  },

  // Details Section
  detailsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  statusBadge: {
    display: 'flex',
    gap: '8px'
  },
  availableStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#27ae60',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  soldStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#e74c3c',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#000',
    margin: 0,
    lineHeight: '1.2'
  },
  priceSection: {
    padding: '16px 0',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  },
  price: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#F88000'
  },
  infoCard: {
    background: '#f8f9fa',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000'
  },
  descriptionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#000',
    margin: 0
  },
  description: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#64748b',
    margin: 0
  },
  actionSection: {
    marginTop: 'auto'
  },
  buyNowButton: {
    width: '100%',
    padding: '18px',
    background: '#F88000',
    color: '#fff',
    border: 'none',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  soldMessage: {
    padding: '16px',
    background: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '12px',
    color: '#856404',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
  ownItemMessage: {
    padding: '16px',
    background: '#e3f2fd',
    border: '2px solid #2196f3',
    borderRadius: '12px',
    color: '#0d47a1',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },

  // Loading State
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#EAF4FE'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(248, 128, 0, 0.1)',
    borderTop: '4px solid #F88000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  loadingText: {
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '500'
  },

  // Error State
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#EAF4FE',
    padding: '24px'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#000',
    marginBottom: '8px'
  },
  errorText: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '24px'
  },
  backButton: {
    padding: '12px 24px',
    background: '#F88000',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
