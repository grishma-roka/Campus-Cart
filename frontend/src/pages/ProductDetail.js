import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen, cartItems } = useCart();
  
  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    fetchProduct();
    fetchRecommendations();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`/items/${id}`);
      setProduct(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching product:', error);
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get('/items?limit=6');
      setRecommendations(response.data.filter(item => item.id !== parseInt(id)).slice(0, 5));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    const images = product.images ? JSON.parse(product.images) : [];
    
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        image: images[0] || null
      });
    }
    
    // Show "Added to Cart" state
    setAddedToCart(true);
    
    // Open cart sidebar
    setIsCartOpen(true);
    
    // Revert after 2 seconds
    setTimeout(() => {
      setAddedToCart(false);
    }, 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Navigate to checkout
    setTimeout(() => {
      navigate('/checkout');
    }, 300);
  };

  const isInCart = () => {
    return cartItems.some(item => item.id === product?.id);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={styles.errorContainer}>
        <h2>Product not found</h2>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Back to Shop
        </button>
      </div>
    );
  }

  const images = product.images ? JSON.parse(product.images) : [];
  const mainImage = images[selectedImage] || `https://dummyimage.com/600x600/4CAF50/ffffff&text=${encodeURIComponent(product.title.substring(0, 10))}`;
  const isOnSale = product.original_price && product.original_price > product.price;

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
        ← Back to Shop
      </button>

      {/* Product Detail Section */}
      <div style={styles.productSection}>
        {/* Left: Image Gallery */}
        <div style={styles.imageSection}>
          {/* Sale Badge */}
          {isOnSale && (
            <div style={styles.saleBadge}>SALE</div>
          )}
          
          {/* Main Image */}
          <div style={styles.mainImageContainer}>
            <img 
              src={mainImage} 
              alt={product.title}
              style={styles.mainImage}
            />
          </div>
          
          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div style={styles.thumbnailGallery}>
              {images.map((img, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  style={{
                    ...styles.thumbnail,
                    ...(selectedImage === index ? styles.activeThumbnail : {})
                  }}
                >
                  <img src={img} alt={`View ${index + 1}`} style={styles.thumbnailImage} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div style={styles.infoSection}>
          <h1 style={styles.productTitle}>{product.title}</h1>
          
          {/* Price */}
          <div style={styles.priceSection}>
            <span style={styles.currentPrice}>रू {product.price.toLocaleString()}</span>
            {isOnSale && (
              <span style={styles.originalPrice}>रू {product.original_price.toLocaleString()}</span>
            )}
          </div>

          {/* Description */}
          <p style={styles.description}>{product.description}</p>

          {/* Product Details */}
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Category:</span>
              <span style={styles.detailValue}>{product.category}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Condition:</span>
              <span style={styles.detailValue}>{product.condition_status}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Seller:</span>
              <span style={styles.detailValue}>{product.seller_name}</span>
            </div>
            {product.seller_rating > 0 && (
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Rating:</span>
                <span style={styles.detailValue}>⭐ {product.seller_rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div style={styles.quantitySection}>
            <span style={styles.quantityLabel}>Quantity:</span>
            <div style={styles.quantitySelector}>
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.quantityButton}
              >
                −
              </button>
              <span style={styles.quantityValue}>{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                style={styles.quantityButton}
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button 
              onClick={handleAddToCart}
              style={{
                ...styles.addToCartButton,
                ...(addedToCart ? styles.addedToCartButton : {})
              }}
            >
              {addedToCart ? '✓ Added to Cart' : '🛒 Add to Cart'}
            </button>
            <button 
              onClick={handleBuyNow}
              style={styles.buyNowButton}
            >
              Buy Now
            </button>
          </div>

          {/* Additional Info */}
          {product.is_borrowable && (
            <div style={styles.borrowInfo}>
              <span style={styles.borrowIcon}>📅</span>
              <span style={styles.borrowText}>
                Available for borrowing at रू {product.borrow_price_per_day}/day
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div style={styles.recommendationsSection}>
          <h2 style={styles.recommendationsTitle}>You might also like</h2>
          <div style={styles.recommendationsScroll}>
            {recommendations.map(item => {
              const itemImages = item.images ? JSON.parse(item.images) : [];
              const itemImage = itemImages[0] || `https://dummyimage.com/300x300/4CAF50/ffffff&text=${encodeURIComponent(item.title.substring(0, 5))}`;
              
              return (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/product/${item.id}`)}
                  style={styles.recommendationCard}
                >
                  <div style={styles.recommendationImage}>
                    <img src={itemImage} alt={item.title} style={styles.recImage} />
                  </div>
                  <h4 style={styles.recTitle}>{item.title}</h4>
                  <p style={styles.recPrice}>रू {item.price.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'Inter, sans-serif'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 140, 0, 0.1)',
    borderTop: '4px solid #FF8C00',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '24px'
  },
  backButton: {
    padding: '12px 24px',
    background: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'all 0.3s ease'
  },
  productSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '48px',
    marginBottom: '64px'
  },
  
  // Image Section
  imageSection: {
    position: 'relative'
  },
  saleBadge: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    background: '#ef4444',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    zIndex: 10,
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
  },
  mainImageContainer: {
    background: '#f3f4f6',
    borderRadius: '24px',
    overflow: 'hidden',
    marginBottom: '16px',
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
  thumbnailGallery: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto'
  },
  thumbnail: {
    width: '80px',
    height: '80px',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.3s ease'
  },
  activeThumbnail: {
    border: '2px solid #FF8C00'
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  
  // Info Section
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  productTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    lineHeight: '1.2'
  },
  priceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  currentPrice: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#FF8C00'
  },
  originalPrice: {
    fontSize: '24px',
    fontWeight: '500',
    color: '#9ca3af',
    textDecoration: 'line-through'
  },
  description: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#64748b',
    margin: 0
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    padding: '24px',
    background: '#f9fafb',
    borderRadius: '16px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b'
  },
  quantitySection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  quantityLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b'
  },
  quantitySelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#f3f4f6',
    padding: '8px 16px',
    borderRadius: '24px'
  },
  quantityButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '50%',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  quantityValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    minWidth: '32px',
    textAlign: 'center'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px'
  },
  addToCartButton: {
    flex: 1,
    padding: '16px 32px',
    background: '#FF8C00',
    color: '#fff',
    border: 'none',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(255, 140, 0, 0.3)'
  },
  addedToCartButton: {
    background: '#10b981',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
    transform: 'scale(1.02)'
  },
  buyNowButton: {
    flex: 1,
    padding: '16px 32px',
    background: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
  },
  borrowInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe'
  },
  borrowIcon: {
    fontSize: '24px'
  },
  borrowText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e40af'
  },
  
  // Recommendations
  recommendationsSection: {
    marginTop: '64px'
  },
  recommendationsTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '24px'
  },
  recommendationsScroll: {
    display: 'flex',
    gap: '20px',
    overflowX: 'auto',
    paddingBottom: '16px'
  },
  recommendationCard: {
    minWidth: '240px',
    background: '#fff',
    borderRadius: '16px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  recommendationImage: {
    width: '100%',
    aspectRatio: '1',
    background: '#f3f4f6',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '12px'
  },
  recImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  recTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
    lineHeight: '1.3'
  },
  recPrice: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#FF8C00',
    margin: 0
  }
};
