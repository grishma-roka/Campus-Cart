import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import CartSidebar from '../components/CartSidebar';
import ProductDetailModal from '../components/ProductDetailModal';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen, getCartCount, cartItems } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showMessages, setShowMessages] = useState(false);
  const [addingToCart, setAddingToCart] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearchTerm, categoryFilter, priceRange]);

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close messages panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMessages && !event.target.closest('[data-messages-panel]') && !event.target.closest('[data-messages-button]')) {
        setShowMessages(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMessages]);

  const fetchData = async () => {
    try {
      const itemsParams = new URLSearchParams();
      if (debouncedSearchTerm) itemsParams.append('search', debouncedSearchTerm);
      if (categoryFilter) itemsParams.append('category', categoryFilter);
      if (priceRange) {
        const [min, max] = priceRange.split('-');
        if (min) itemsParams.append('min_price', min);
        if (max && max !== 'above') itemsParams.append('max_price', max);
      }
      
      const itemsRes = await axios.get(`/items?${itemsParams.toString()}`);
      setItems(itemsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(items.map(item => item.category))];

  const getCategoryIcon = (category) => {
    const icons = {
      'Books': '📚',
      'Electronics': '💻',
      'Clothing': '👕',
      'Sports': '⚽',
      'default': '📦'
    };
    return icons[category] || icons.default;
  };

  const handleAddToCart = (item) => {
    // Check if item is already in cart
    const isInCart = cartItems.some(cartItem => cartItem.id === item.id);
    
    if (isInCart) {
      // If already in cart, just open the cart sidebar
      setIsCartOpen(true);
      return;
    }
    
    // Flash animation
    setAddingToCart(item.id);
    
    const success = addToCart({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.images ? JSON.parse(item.images)[0] : null
    });
    
    if (success) {
      // Create flying cart icon animation
      createFlyingIcon();
      
      // Revert flash animation after 2 seconds
      setTimeout(() => setAddingToCart(null), 2000);
    }
  };

  const createFlyingIcon = () => {
    const icon = document.createElement('div');
    icon.innerHTML = '🛒';
    icon.style.cssText = `
      position: fixed;
      font-size: 32px;
      z-index: 10000;
      pointer-events: none;
      animation: flyToCart 0.8s ease-in-out forwards;
    `;
    
    // Position at center of screen
    icon.style.left = '50%';
    icon.style.top = '50%';
    
    document.body.appendChild(icon);
    
    // Remove after animation
    setTimeout(() => {
      document.body.removeChild(icon);
    }, 800);
  };

  const handleBuyNow = (item) => {
    handleAddToCart(item);
    // Navigate to checkout or show checkout modal
    setTimeout(() => {
      setIsCartOpen(true);
    }, 300);
  };

  const isItemInCart = (itemId) => {
    return cartItems.some(cartItem => cartItem.id === itemId);
  };

  const handleProductClick = async (product) => {
    setSelectedProduct(product);
    
    // Fetch related products (same category, different item)
    try {
      const response = await axios.get(`/items?category=${product.category}&limit=5`);
      const related = response.data.filter(item => item.id !== product.id).slice(0, 4);
      setRelatedProducts(related);
    } catch (error) {
      console.error('Error fetching related products:', error);
      setRelatedProducts([]);
    }
  };

  const handleModalAddToCart = (product, quantity) => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.images ? JSON.parse(product.images)[0] : null
      });
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      {/* Cart Sidebar */}
      <CartSidebar />
      
      {/* Top Header Bar */}
      <div style={styles.topHeader}>
        <div style={styles.headerContent}>
          {/* Brand Section */}
          <div style={styles.brandSection}>
            <div style={styles.brandIcon}>🛒</div>
            <span style={styles.brandText}>Campus Cart</span>
          </div>

          {/* Search Pill */}
          <div style={styles.searchPill}>
            <div style={styles.searchIcon}>🔍</div>
            <input
              type="text"
              placeholder="Search for items, books, electronics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={styles.clearSearchButton}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Button Group */}
          <div style={styles.buttonGroup}>
            <button style={{...styles.segmentButton, ...styles.activeBuyerButton}}>
              <span style={styles.buttonIcon}>🛒</span>
              Buyer
            </button>
            <button style={styles.segmentButton}>
              <span style={styles.buttonIcon}>🏪</span>
              Seller
            </button>
            <button style={{...styles.segmentButton, ...styles.riderButton}}>
              <span style={styles.buttonIcon}>🏍️</span>
              Apply as Rider
            </button>
          </div>

          {/* Messages Icon */}
          <div style={styles.messagesContainer}>
            <button 
              onClick={() => setShowMessages(!showMessages)}
              style={styles.messagesButton}
              title="Messages"
              data-messages-button
            >
              <div style={styles.messagesIcon}>💬</div>
              <span style={styles.messagesText}>Messages</span>
              <div style={styles.messagesBadge}>3</div>
            </button>
          </div>

          {/* Cart Icon */}
          <div style={styles.cartContainer}>
            <button 
              onClick={() => setIsCartOpen(true)}
              style={styles.cartButton}
              title="Shopping Cart"
            >
              <div style={styles.cartIconButton}>🛒</div>
              {getCartCount() > 0 && (
                <div style={styles.cartBadge}>{getCartCount()}</div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Messages Panel */}
      {showMessages && (
        <div style={styles.messagesPanel} data-messages-panel>
          <div style={styles.messagesPanelHeader}>
            <h3 style={styles.messagesPanelTitle}>
              <span style={styles.messagesPanelIcon}>💬</span>
              Messages
            </h3>
            <button 
              onClick={() => setShowMessages(false)}
              style={styles.closePanelButton}
            >
              ✕
            </button>
          </div>
          
          <div style={styles.messagesList}>
            <div style={styles.messageItem}>
              <div style={styles.messageAvatar}>👤</div>
              <div style={styles.messageContent}>
                <div style={styles.messageSender}>John Doe</div>
                <div style={styles.messagePreview}>Hi! Is the calculator still available?</div>
                <div style={styles.messageTime}>2 min ago</div>
              </div>
              <div style={styles.unreadBadge}></div>
            </div>
            
            <div style={styles.messageItem}>
              <div style={styles.messageAvatar}>👩</div>
              <div style={styles.messageContent}>
                <div style={styles.messageSender}>Sarah Wilson</div>
                <div style={styles.messagePreview}>Thanks for the quick delivery!</div>
                <div style={styles.messageTime}>1 hour ago</div>
              </div>
            </div>
            
            <div style={styles.messageItem}>
              <div style={styles.messageAvatar}>👨</div>
              <div style={styles.messageContent}>
                <div style={styles.messageSender}>Mike Chen</div>
                <div style={styles.messagePreview}>Can we meet tomorrow for the textbook?</div>
                <div style={styles.messageTime}>3 hours ago</div>
              </div>
              <div style={styles.unreadBadge}></div>
            </div>
          </div>
          
          <div style={styles.messagesPanelFooter}>
            <button style={styles.viewAllMessagesButton}>
              View All Messages
            </button>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div style={styles.mainLayout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>
              <span style={styles.sidebarIcon}>📂</span>
              Categories
            </h3>
          </div>
          
          <div style={styles.categoriesMenu}>
            <button
              onClick={() => setCategoryFilter('')}
              style={{
                ...styles.categoryItem,
                ...(categoryFilter === '' ? styles.activeCategoryItem : {})
              }}
            >
              <span style={styles.categoryIcon}>🏪</span>
              <span style={styles.categoryText}>All Items</span>
              <span style={styles.categoryCount}>{items.length}</span>
            </button>
            
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                style={{
                  ...styles.categoryItem,
                  ...(categoryFilter === category ? styles.activeCategoryItem : {})
                }}
              >
                <span style={styles.categoryIcon}>{getCategoryIcon(category)}</span>
                <span style={styles.categoryText}>{category}</span>
                <span style={styles.categoryCount}>
                  {items.filter(item => item.category === category).length}
                </span>
              </button>
            ))}
          </div>

          {/* Price Range Filter */}
          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>
              <span style={styles.filterIcon}>💰</span>
              Price Range
            </h4>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              style={styles.priceRangeDropdown}
            >
              <option value="">All Prices</option>
              <option value="1-100">रू 1 - रू 100</option>
              <option value="100-300">रू 100 - रू 300</option>
              <option value="300-500">रू 300 - रू 500</option>
              <option value="500-1000">रू 500 - रू 1,000</option>
              <option value="1000-2000">रू 1,000 - रू 2,000</option>
              <option value="2000-3000">रू 2,000 - रू 3,000</option>
              <option value="3000-5000">रू 3,000 - रू 5,000</option>
              <option value="5000-above">रू 5,000+</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Hero Carousel */}
          <div style={styles.heroSection}>
            <div style={styles.carousel}>
              <div style={styles.carouselSlide}>
                <div style={styles.slideBackground}></div>
                <div style={styles.slideOverlay}>
                  <div style={styles.slideContent}>
                    <h2 style={styles.slideTitle}>Welcome to Campus Cart! 🎓</h2>
                    <p style={styles.slideSubtitle}>Your premium student marketplace</p>
                    <div style={styles.slideStats}>
                      <div style={styles.statBadge}>
                        <span style={styles.statNumber}>{items.length}</span>
                        <span style={styles.statText}>Items Available</span>
                      </div>
                      <div style={styles.statBadge}>
                        <span style={styles.statNumber}>{categories.length}</span>
                        <span style={styles.statText}>Categories</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div style={styles.productsSection}>
            <h3 style={styles.sectionTitle}>
              {debouncedSearchTerm ? (
                <>Search results for "{debouncedSearchTerm}"</>
              ) : categoryFilter ? (
                `${categoryFilter} Items`
              ) : (
                'All Items'
              )}
              {priceRange && (
                <span style={styles.priceRangeIndicator}>
                  • {priceRange === '5000-above' ? 'रू 5,000+' : 
                     priceRange.split('-').map(p => `रू ${parseInt(p).toLocaleString()}`).join(' - ')}
                </span>
              )}
              ({items.length})
            </h3>
            
            <div style={styles.productsGrid}>
              {items.map(item => {
                const images = item.images ? JSON.parse(item.images) : [];
                const imageUrl = images.length > 0 ? images[0] : 
                  `https://dummyimage.com/400x300/4CAF50/ffffff&text=${encodeURIComponent(item.title.substring(0, 15))}`;
                
                const isSold = item.is_sold || false;
                
                return (
                  <div key={item.id} style={styles.productCard}>
                    <div 
                      style={styles.productImageContainer}
                      onClick={() => handleProductClick(item)}
                    >
                      <img 
                        src={imageUrl} 
                        alt={item.title}
                        style={styles.productImage}
                      />
                      {isSold && (
                        <div style={styles.soldOverlay}>
                          <span style={styles.soldBadge}>SOLD</span>
                        </div>
                      )}
                    </div>
                    
                    <div style={styles.productInfo}>
                      <h4 style={styles.productTitle}>{item.title}</h4>
                      <p style={styles.productDescription}>
                        {item.description.length > 80 ? 
                          item.description.substring(0, 80) + '...' : 
                          item.description
                        }
                      </p>
                      
                      <div style={styles.productPricing}>
                        <span style={styles.priceAmount}>रू {item.price.toLocaleString()}</span>
                        {isSold ? (
                          <span style={styles.soldStatusBadge}>Sold</span>
                        ) : (
                          <span style={styles.availableStatusBadge}>Available</span>
                        )}
                      </div>
                      
                      {/* Button Group */}
                      {!isSold && (
                        <div style={styles.productButtonGroup}>
                          <button 
                            onClick={() => handleAddToCart(item)}
                            style={{
                              ...styles.addToCartButton,
                              ...(addingToCart === item.id ? styles.flashingButton : {}),
                              ...(isItemInCart(item.id) && addingToCart !== item.id ? styles.inCartButton : {})
                            }}
                            disabled={isItemInCart(item.id) && addingToCart !== item.id}
                          >
                            {addingToCart === item.id 
                              ? '✓ Added!' 
                              : isItemInCart(item.id) 
                                ? '✓ In Cart' 
                                : '🛒 Add to Cart'
                            }
                          </button>
                          <button 
                            onClick={() => handleBuyNow(item)}
                            style={styles.buyNowButton}
                          >
                            Buy Now
                          </button>
                        </div>
                      )}
                      
                      {isSold && (
                        <div style={styles.soldMessage}>
                          This item has been sold
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  {debouncedSearchTerm ? '🔍' : '📦'}
                </div>
                <h3>
                  {debouncedSearchTerm ? 'No search results found' : 'No items found'}
                </h3>
                <p>
                  {debouncedSearchTerm 
                    ? `No items match "${debouncedSearchTerm}". Try different keywords or browse categories.`
                    : 'Try adjusting your filters or browse different categories.'
                  }
                </p>
                {debouncedSearchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    style={styles.clearFiltersButton}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={{
            ...selectedProduct,
            image: selectedProduct.images ? JSON.parse(selectedProduct.images)[0] : null
          }}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleModalAddToCart}
          relatedProducts={relatedProducts.map(item => ({
            ...item,
            image: item.images ? JSON.parse(item.images)[0] : null
          }))}
        />
      )}
    </div>
  );
}

const styles = {
  // Main Container
  dashboardContainer: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    minHeight: '100vh',
    background: '#EAF4FE',
    display: 'flex',
    flexDirection: 'column'
  },

  // Loading State
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#EAF4FE',
    fontFamily: 'Inter, sans-serif'
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
    fontSize: '1.1rem',
    fontWeight: '500'
  },

  // Top Header Bar
  topHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    background: '#FFFFFF',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    maxWidth: '1400px',
    margin: '0 auto'
  },

  // Brand Section
  brandSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '200px'
  },
  brandIcon: {
    fontSize: '24px',
    background: '#F88000',
    borderRadius: '12px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#F88000'
  },

  // Search Pill
  searchPill: {
    display: 'flex',
    alignItems: 'center',
    background: '#FFFFFF',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '50px',
    padding: '12px 20px',
    gap: '12px',
    minWidth: '400px',
    maxWidth: '600px',
    flex: 1,
    margin: '0 24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  searchIcon: {
    fontSize: '18px',
    color: '#64748b'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: '16px',
    fontFamily: 'Inter, sans-serif',
    color: '#000000',
    fontWeight: '500'
  },
  clearSearchButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    width: '24px',
    height: '24px'
  },

  // Button Group
  buttonGroup: {
    display: 'flex',
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '4px',
    gap: '4px',
    minWidth: '300px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },
  segmentButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '12px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    color: '#64748b',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    flex: 1,
    justifyContent: 'center'
  },
  activeBuyerButton: {
    background: '#F88000',
    color: '#FFFFFF',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3)'
  },
  riderButton: {
    background: '#F88000',
    color: '#FFFFFF',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3)'
  },
  buttonIcon: {
    fontSize: '16px'
  },

  // Messages Container
  messagesContainer: {
    minWidth: '120px'
  },
  messagesButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    color: '#1e293b',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
  },
  messagesIcon: {
    fontSize: '18px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    borderRadius: '8px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  messagesText: {
    fontSize: '14px',
    fontWeight: '600'
  },
  messagesBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '10px',
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
  },

  // Messages Panel
  messagesPanel: {
    position: 'fixed',
    top: '88px',
    right: '24px',
    width: '380px',
    maxHeight: '500px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    zIndex: 1001,
    overflow: 'hidden'
  },
  messagesPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  },
  messagesPanelTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  messagesPanelIcon: {
    fontSize: '20px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    borderRadius: '8px',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closePanelButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    width: '28px',
    height: '28px'
  },

  // Messages List
  messagesList: {
    maxHeight: '320px',
    overflowY: 'auto',
    padding: '8px 0'
  },
  messageItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
  },
  messageAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0
  },
  messageContent: {
    flex: 1,
    minWidth: 0
  },
  messageSender: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '2px'
  },
  messagePreview: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  messageTime: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px'
  },
  unreadBadge: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
    flexShrink: 0
  },

  // Messages Panel Footer
  messagesPanelFooter: {
    padding: '16px 24px 20px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)'
  },
  viewAllMessagesButton: {
    width: '100%',
    padding: '12px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
  },

  // Main Layout
  mainLayout: {
    display: 'flex',
    flex: 1,
    gap: '0'
  },

  // Sidebar
  sidebar: {
    width: '320px',
    background: '#FFFFFF',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    borderRadius: '0 16px 16px 0',
    padding: '24px',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
    position: 'sticky',
    top: '88px',
    height: 'calc(100vh - 88px)',
    overflowY: 'auto'
  },
  sidebarHeader: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  },
  sidebarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#000000',
    margin: '0 0 8px 0'
  },
  sidebarIcon: {
    fontSize: '20px',
    background: '#F88000',
    borderRadius: '8px',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Categories Menu
  categoriesMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px'
  },
  categoryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'transparent',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter, sans-serif',
    textAlign: 'left',
    width: '100%'
  },
  activeCategoryItem: {
    background: '#EAF4FE',
    color: '#F88000',
    border: '1px solid rgba(248, 128, 0, 0.2)',
    boxShadow: '0 2px 8px rgba(248, 128, 0, 0.15)',
    transform: 'translateX(4px)'
  },
  categoryIcon: {
    fontSize: '18px',
    minWidth: '24px'
  },
  categoryText: {
    flex: 1
  },
  categoryCount: {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },

  // Filter Section
  filterSection: {
    marginBottom: '24px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)'
  },
  filterTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#000000',
    margin: '0 0 12px 0'
  },
  filterIcon: {
    fontSize: '16px',
    background: '#F88000',
    borderRadius: '6px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  priceRangeDropdown: {
    width: '100%',
    padding: '12px 16px',
    background: '#FFFFFF',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#000000',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    paddingRight: '40px'
  },

  // Main Content
  mainContent: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto'
  },

  // Hero Section
  heroSection: {
    marginBottom: '32px'
  },
  carousel: {
    position: 'relative',
    height: '320px',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)'
  },
  carouselSlide: {
    position: 'relative',
    width: '100%',
    height: '100%'
  },
  slideBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #F88000 0%, #E67500 100%)',
    zIndex: 1
  },
  slideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2
  },
  slideContent: {
    textAlign: 'center',
    color: 'white',
    maxWidth: '600px',
    padding: '0 24px'
  },
  slideTitle: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '16px',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
  },
  slideSubtitle: {
    fontSize: '18px',
    fontWeight: '400',
    marginBottom: '24px',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
    opacity: 0.9
  },
  slideStats: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center'
  },
  statBadge: {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    padding: '16px 24px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    textAlign: 'center'
  },
  statNumber: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '1'
  },
  statText: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '4px',
    opacity: 0.8
  },

  // Products Section
  productsSection: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#000000',
    margin: '0 0 24px 0'
  },
  priceRangeIndicator: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#F88000',
    marginLeft: '8px'
  },

  // Products Grid
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px'
  },
  productCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    cursor: 'pointer'
  },
  productImageContainer: {
    position: 'relative',
    height: '200px',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '16px',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease'
  },
  productImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  // Product Info
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  productTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000000',
    margin: 0,
    lineHeight: '1.3'
  },
  productDescription: {
    color: '#64748b',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0
  },
  productPricing: {
    padding: '12px 0',
    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priceAmount: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#F88000',
    lineHeight: '1'
  },
  availableStatusBadge: {
    padding: '4px 12px',
    backgroundColor: '#27ae60',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  soldStatusBadge: {
    padding: '4px 12px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '24px',
  },
  soldBadge: {
    fontSize: '32px',
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '3px',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
  },
  soldMessage: {
    padding: '12px',
    backgroundColor: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '12px',
    color: '#856404',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: '8px',
  },

  // Product Actions
  productButtonGroup: {
    display: 'flex',
    gap: '8px',
    width: '100%'
  },
  addToCartButton: {
    flex: 1,
    padding: '12px 16px',
    background: '#fff',
    color: '#f97316',
    border: '2px solid #f97316',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  flashingButton: {
    background: '#10b981',
    color: '#fff',
    border: '2px solid #10b981',
    transform: 'scale(1.05)',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
    animation: 'pulse 0.5s ease-in-out'
  },
  inCartButton: {
    background: '#e5e7eb',
    color: '#6b7280',
    border: '2px solid #d1d5db',
    cursor: 'not-allowed',
    opacity: 0.7
  },
  addingToCart: {
    background: '#10b981',
    color: '#fff',
    border: '2px solid #10b981',
    transform: 'scale(0.95)'
  },
  buyNowButton: {
    flex: 1,
    padding: '12px 16px',
    background: '#f97316',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)'
  },
  
  // Cart Container
  cartContainer: {
    minWidth: '60px'
  },
  cartButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
  },
  cartIconButton: {
    fontSize: '24px'
  },
  cartBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: '#f97316',
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '10px',
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.4)'
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(0, 0, 0, 0.05)'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5
  },
  clearFiltersButton: {
    marginTop: '16px',
    padding: '12px 24px',
    background: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3)'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1.05); }
    50% { transform: scale(1.1); }
  }
  
  @keyframes flyToCart {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    50% {
      transform: translate(200px, -200px) scale(0.8);
      opacity: 0.8;
    }
    100% {
      transform: translate(400px, -400px) scale(0.3);
      opacity: 0;
    }
  }
`;
document.head.appendChild(styleSheet);