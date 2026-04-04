import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import CartSidebar from '../components/CartSidebar';
import ProductDetailModal from '../components/ProductDetailModal';
import NotificationBell from '../components/NotificationBell';
import { ShoppingBag, Store, Bike, LayoutGrid, BookOpen, Laptop, Shirt, Trophy, Package, Handshake, Tag, Armchair, Watch, Search, ChevronDown, User, Calendar } from 'lucide-react';

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
  const [addingToCart, setAddingToCart] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  
  const backendUrl = 'http://localhost:5000';

  // Synchronize searching with URL parameters from global header
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    if (search !== null) {
      setSearchTerm(search);
    }
  }, [location.search]);

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


  const buyOnlyItems = items.filter(item => 
    (item.transaction_type === 'buy' || !item.transaction_type || item.transaction_type === '') && 
    (item.is_borrowable === 0 || item.is_borrowable === false || !item.is_borrowable)
  );

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

  const categories = [...new Set(buyOnlyItems.map(item => item.category))];

  const getCategoryIcon = (category, isActive = false) => {
    const iconProps = { size: 20, strokeWidth: 1.5, color: isActive ? '#F88000' : '#1e293b' };
    switch(category) {
      case 'Books': return <BookOpen {...iconProps} />;
      case 'Electronics': return <Laptop {...iconProps} />;
      case 'Clothing': return <Shirt {...iconProps} />;
      case 'Furniture': return <Armchair {...iconProps} />;
      case 'Sports': return <Trophy {...iconProps} />;
      default: return <Package {...iconProps} />;
    }
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
      image: getSafeImageUrl(item.images)
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
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F88000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
    icon.style.cssText = `
      position: fixed;
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
    // Navigate directly to checkout
    navigate(`/checkout/${item.id}`);
  };

  const isItemInCart = (itemId) => {
    return cartItems.some(cartItem => cartItem.id === itemId);
  };

  const handleProductClick = async (product) => {
    // Navigate to product detail page
    navigate(`/product/${product.id}`);
  };

  const handleModalAddToCart = (product, quantity) => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        image: getSafeImageUrl(product.images)
      });
    }
  };

  const getSafeImageUrl = (images) => {
    if (!images) return 'https://via.placeholder.com/600x400?text=No+Image';
    
    try {
      let firstImage = '';
      if (Array.isArray(images)) {
        firstImage = images[0];
      } else if (typeof images === 'string') {
        if (images.startsWith('[')) {
          const parsed = JSON.parse(images);
          firstImage = Array.isArray(parsed) ? parsed[0] : (parsed || '');
        } else {
          firstImage = images.replace(/[\[\]"]/g, '');
        }
      }
      
      if (!firstImage) return 'https://via.placeholder.com/600x400?text=No+Image';
      if (firstImage.startsWith('http')) return firstImage;
      return `${backendUrl}${firstImage.startsWith('/') ? '' : '/'}${firstImage}`;
    } catch (err) {
      console.error("Error parsing images:", err);
      return 'https://via.placeholder.com/600x400?text=No+Image';
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
      

      {/* Main Layout */}
      <div style={styles.mainLayout}>
        {/* Sidebar */}
        <div style={{...styles.sidebar}}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>
              <LayoutGrid size={20} color="#1e293b" strokeWidth={1.5} />
              Categories
            </h3>
          </div>
          
          <div style={styles.categoriesMenu}>
            <button
              onClick={() => setCategoryFilter('')}
              style={{
                ...styles.categoryItem,
                color: categoryFilter === '' ? '#F88000' : '#1e293b'
              }}
            >
              <LayoutGrid size={20} strokeWidth={1.5} color={categoryFilter === '' ? '#F88000' : '#1e293b'} />
              <span style={styles.categoryText}>All Items</span>
              <span style={styles.categoryCount}>
                {buyOnlyItems.length}
              </span>
            </button>
            
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                style={{
                  ...styles.categoryItem,
                  color: categoryFilter === category ? '#F88000' : '#1e293b'
                }}
              >
                {getCategoryIcon(category, categoryFilter === category)}
                <span style={styles.categoryText}>{category}</span>
                <span style={styles.categoryCount}>
                  {buyOnlyItems.filter(item => item.category === category).length}
                </span>
              </button>
            ))}
          </div>

          {/* Price Range Filter */}
          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>
              Price Range
            </h4>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Tag size={20} color="#64748b" strokeWidth={1.5} style={{ position: 'absolute', left: '16px', pointerEvents: 'none' }} />
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
              <ChevronDown size={20} color="#64748b" strokeWidth={1.5} style={{ position: 'absolute', right: '16px', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Borrow Instead of Buy */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <button
              onClick={() => navigate('/borrow')}
              style={{
                width: '100%', padding: '14px 16px', background: 'linear-gradient(135deg, #F88000, #ff9f2e)',
                color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '700', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(248,128,0,0.3)',
              }}
            >
              <Handshake size={18} strokeWidth={1.5} />
              Borrow Instead of Buy
            </button>
            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
              Borrow items temporarily from students
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Hero Carousel */}
          <div style={{...styles.heroSection, background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', position: 'relative', zIndex: 1}}>
            <div style={styles.carousel}>
              <div style={styles.carouselSlide}>
                <div style={styles.slideBackground}></div>
                <div style={styles.slideOverlay}>
                  <div style={styles.slideContent}>
                    <h2 style={styles.slideTitle}>Welcome to Campus Cart!</h2>
                    <p style={styles.slideSubtitle}>Your premium student marketplace</p>
                    <div style={styles.slideStats}>
                      <div style={styles.statBadge}>
                        <span style={styles.statNumber}>{buyOnlyItems.length}</span>
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
              ({buyOnlyItems.length})
            </h3>
            
            <div style={styles.productsGrid}>
              {buyOnlyItems
                .filter(item => !categoryFilter || item.category === categoryFilter)
                .map(item => {
                const mainImage = getSafeImageUrl(item.images);
                
                const isSold = item.is_sold || false;
                
                return (
                  <div key={item.id} style={styles.productCard}>
                    <div 
                      style={styles.imageWrapper}
                      onClick={() => navigate(`/product/${item.id}`)}
                    >
                      <img 
                        src={mainImage} 
                        alt={item.title} 
                        style={styles.productImage}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=Reload+Page'; }}
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
                              ? 'Added!' 
                              : isItemInCart(item.id) 
                                ? 'In Cart' 
                                : 'Add to Cart'
                            }
                          </button>
                          <button 
                            onClick={() => handleBuyNow(item)}
                            style={{...styles.buyNowButton, flex: 1}}
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

            {buyOnlyItems.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  {debouncedSearchTerm ? <Search size={48} color="#94a3b8" /> : <Package size={48} color="#94a3b8" />}
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
    border: 'none',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
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
    padding: '12px 16px 12px 46px',
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
    boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
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
    color: '#F88000',
    border: '2px solid #F88000',
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
    backgroundColor: '#000000',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1
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