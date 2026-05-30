import React, { useState } from 'react';

const ProductDetailModal = ({ product, onClose, onAddToCart, relatedProducts }) => {
  const [addedToCart, setAddedToCart] = useState(false);
  const backendUrl = 'http://localhost:5000';

  const handleAddToCart = () => {
    onAddToCart(product, 1); // Fixed quantity of 1
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    onAddToCart(product, 1); // Fixed quantity of 1
    // Navigate to checkout
    window.location.href = '/checkout';
  };

  // Check if item is sold
  const isSold = product.is_sold || false;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
        
        {/* Main Content */}
        <div className="product-modal-content" style={styles.content}>
          {/* Left Side - Image */}
          <div style={styles.imageSection}>
            <img 
              src={product.image 
                ? (product.image.startsWith('http') ? product.image : `${backendUrl}${product.image}`)
                : 'https://via.placeholder.com/500'} 
              alt={product.title}
              style={styles.productImage}
            />
            {isSold && (
              <div style={styles.soldOverlay}>
                <span style={styles.soldBadge}>SOLD</span>
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div style={styles.detailsSection}>
            <div style={styles.sku}>SKU: {product.id || 'N/A'}</div>
            <h2 style={styles.title}>{product.title}</h2>
            <div style={styles.price}>रू{parseFloat(product.price).toFixed(2)}</div>

            {/* Availability Status */}
            <div style={styles.statusSection}>
              {isSold ? (
                <span style={styles.soldStatusBadge}>❌ Sold Out</span>
              ) : (
                <span style={styles.availableStatusBadge}>✅ Available</span>
              )}
            </div>

            {/* Action Buttons */}
            {!isSold && (
              <div style={styles.buttonGroup}>
                <button 
                  style={{...styles.addToCartBtn, ...(addedToCart ? styles.addedBtn : {})}}
                  onClick={handleAddToCart}
                >
                  {addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
                </button>
                <button style={styles.buyNowBtn} onClick={handleBuyNow}>
                  Buy Now
                </button>
              </div>
            )}

            {isSold && (
              <div style={styles.soldMessage}>
                This item has been sold and is no longer available.
              </div>
            )}

            {/* Collapsible Sections */}
            <CollapsibleSection title="Product Info">
              <p style={styles.infoText}>
                {product.description || 'High-quality product available for students at Herald College. Perfect condition and ready for immediate use.'}
              </p>
              <ul style={styles.infoList}>
                <li>Category: {product.category || 'General'}</li>
                <li>Condition: {product.condition || 'Excellent'}</li>
                <li>Seller: {product.seller_name || 'Campus Cart Seller'}</li>
                <li>Quantity: 1 (Fixed)</li>
              </ul>
            </CollapsibleSection>

            <CollapsibleSection title="Return Policy">
              <p style={styles.infoText}>
                Items can be returned within 7 days of purchase if they don't match the description. 
                Contact the seller through Campus Cart messaging for return arrangements.
              </p>
            </CollapsibleSection>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div style={styles.relatedSection}>
            <h3 style={styles.relatedTitle}>You might also like</h3>
            <div style={styles.relatedScroll}>
              {relatedProducts.map((item) => (
                <div key={item.id} style={styles.relatedCard}>
                  <img 
                    src={item.image || 'https://via.placeholder.com/200'} 
                    alt={item.title}
                    style={styles.relatedImage}
                  />
                  {item.is_sold && (
                    <div style={styles.relatedSoldBadge}>SOLD</div>
                  )}
                  <div style={styles.relatedInfo}>
                    <div style={styles.relatedTitle}>{item.title}</div>
                    <div style={styles.relatedPrice}>रू{parseFloat(item.price).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CollapsibleSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={styles.collapsible}>
      <button 
        style={styles.collapsibleHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <span style={{...styles.chevron, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div style={styles.collapsibleContent}>
          {children}
        </div>
      )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
    overflowY: 'auto',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '1200px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: '#fff',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  content: {
    display: 'flex',
    flexDirection: 'row',
    gap: '40px',
    padding: '40px',
  },
  imageSection: {
    flex: '1',
    backgroundColor: '#F6F6F6',
    borderRadius: '24px',
    padding: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    maxWidth: '100%',
    maxHeight: '500px',
    objectFit: 'contain',
  },
  detailsSection: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sku: {
    fontSize: '14px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#000',
    margin: 0,
    fontFamily: 'Inter, sans-serif',
  },
  price: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FF8C00',
    marginBottom: '10px',
  },
  statusSection: {
    marginTop: '10px',
    marginBottom: '20px',
  },
  availableStatusBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#27ae60',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  soldStatusBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '24px',
  },
  soldBadge: {
    fontSize: '48px',
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '4px',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
  },
  soldMessage: {
    padding: '16px',
    backgroundColor: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '12px',
    color: '#856404',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: '20px',
    fontFamily: 'Inter, sans-serif',
  },
  quantitySection: {
    marginTop: '10px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  quantitySelector: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '2px solid #E0E0E0',
    borderRadius: '50px',
    padding: '8px 16px',
    gap: '20px',
  },
  quantityBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#FF8C00',
    fontWeight: '700',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: '18px',
    fontWeight: '600',
    minWidth: '30px',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px',
  },
  addToCartBtn: {
    backgroundColor: '#FF8C00',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'Inter, sans-serif',
  },
  addedBtn: {
    backgroundColor: '#4CAF50',
  },
  buyNowBtn: {
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'Inter, sans-serif',
  },
  collapsible: {
    borderTop: '1px solid #E0E0E0',
    paddingTop: '16px',
    marginTop: '16px',
  },
  collapsibleHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    padding: '12px 0',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#000',
    fontFamily: 'Inter, sans-serif',
  },
  chevron: {
    fontSize: '12px',
    transition: 'transform 0.3s ease',
  },
  collapsibleContent: {
    padding: '12px 0',
    color: '#666',
    lineHeight: '1.6',
  },
  infoText: {
    margin: '0 0 12px 0',
    fontSize: '14px',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
  },
  relatedSection: {
    padding: '40px',
    borderTop: '1px solid #E0E0E0',
  },
  relatedTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#000',
    fontFamily: 'Inter, sans-serif',
  },
  relatedScroll: {
    display: 'flex',
    gap: '20px',
    overflowX: 'auto',
    paddingBottom: '10px',
  },
  relatedCard: {
    minWidth: '200px',
    backgroundColor: '#fff',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease',
  },
  relatedImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    position: 'relative',
  },
  relatedSoldBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  relatedInfo: {
    padding: '16px',
  },
  relatedPrice: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#FF8C00',
    marginTop: '8px',
  },
};

export default ProductDetailModal;
