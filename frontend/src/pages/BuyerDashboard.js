import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { useLocation } from 'react-router-dom';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

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
        </div>
      </div>

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
                
                return (
                  <div key={item.id} style={styles.productCard}>
                    <div style={styles.productImageContainer}>
                      <img 
                        src={imageUrl} 
                        alt={item.title}
                        style={styles.productImage}
                      />
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
                      </div>
                      
                      <button style={styles.buyButton}>
                        Buy Now
                      </button>
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
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
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
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
  },
  priceAmount: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#F88000',
    lineHeight: '1'
  },

  // Product Actions
  buyButton: {
    width: '100%',
    padding: '12px 16px',
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
`;
document.head.appendChild(styleSheet);