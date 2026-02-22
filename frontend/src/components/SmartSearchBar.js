import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';

const SmartSearchBar = ({ onSearch, currentSearchTerm = '' }) => {
  const [searchTerm, setSearchTerm] = useState(currentSearchTerm);
  const [isFocused, setIsFocused] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);
  const navigate = useNavigate();

  // Fetch all available items on component mount
  useEffect(() => {
    fetchAllItems();
  }, []);

  // Update search term when prop changes
  useEffect(() => {
    setSearchTerm(currentSearchTerm);
  }, [currentSearchTerm]);

  // Filter items when search term changes
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      filterItems(searchTerm);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm, allItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/items');
      setAllItems(response.data);
      setFilteredItems(response.data.slice(0, 10)); // Show first 10 items initially
    } catch (error) {
      console.error('Error fetching items:', error);
      setAllItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = (term) => {
    if (!term.trim()) {
      // No search term - show first 10 items
      setFilteredItems(allItems.slice(0, 10));
    } else {
      // Filter items based on search term
      const filtered = allItems.filter(item => 
        item.title.toLowerCase().includes(term.toLowerCase()) ||
        item.description.toLowerCase().includes(term.toLowerCase()) ||
        item.category.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredItems(filtered.slice(0, 10)); // Limit to 10 results
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleItemClick = (item) => {
    // Option 1: Navigate to item details page (if you have one)
    // navigate(`/product/${item.id}`);
    
    // Option 2: Perform search for that item
    setSearchTerm(item.title);
    onSearch(item.title);
    setIsFocused(false);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!searchTerm.trim()) {
      setFilteredItems(allItems.slice(0, 10));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch(searchTerm);
      setIsFocused(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
    setFilteredItems(allItems.slice(0, 10));
  };

  const highlightMatch = (text, query) => {
    if (!query || query.length < 1) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <strong key={index} style={{ color: '#FF8C00', fontWeight: '700' }}>{part}</strong> : 
        part
    );
  };

  return (
    <div style={styles.container} ref={searchRef}>
      {/* Search Input */}
      <div style={styles.searchPill}>
        <div style={styles.searchIcon}>🔍</div>
        <input
          type="text"
          placeholder="Search for items, books, electronics..."
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={handleFocus}
          onKeyPress={handleKeyPress}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button 
            onClick={handleClear}
            style={styles.clearSearchButton}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown - Show when focused */}
      {isFocused && (
        <div style={styles.dropdown}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.loadingSpinner}></div>
              <span style={styles.loadingText}>Loading items...</span>
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              <div style={styles.dropdownHeader}>
                <span style={styles.dropdownTitle}>
                  {searchTerm ? `Search Results (${filteredItems.length})` : `Available Items (${allItems.length})`}
                </span>
              </div>
              <div style={styles.itemsList}>
                {filteredItems.map((item) => {
                  const images = item.images ? JSON.parse(item.images) : [];
                  const imageUrl = images.length > 0 ? images[0] : 
                    `https://dummyimage.com/80x80/4CAF50/ffffff&text=${encodeURIComponent(item.title.substring(0, 3))}`;
                  
                  return (
                    <div 
                      key={item.id}
                      style={styles.itemCard}
                      onClick={() => handleItemClick(item)}
                      className="search-item-card"
                    >
                      <img 
                        src={imageUrl} 
                        alt={item.title}
                        style={styles.itemImage}
                      />
                      <div style={styles.itemContent}>
                        <div style={styles.itemTitle}>
                          {highlightMatch(item.title, searchTerm)}
                        </div>
                        <div style={styles.itemMeta}>
                          <span style={styles.itemPrice}>रू {item.price?.toLocaleString()}</span>
                          <span style={styles.itemCategory}>{item.category}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredItems.length === 10 && allItems.length > 10 && (
                <div style={styles.dropdownFooter}>
                  <span style={styles.footerText}>
                    Showing {filteredItems.length} of {searchTerm ? filteredItems.length : allItems.length} items
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={styles.noResults}>
              <span style={styles.noResultsIcon}>🔍</span>
              <div style={styles.noResultsText}>No items found</div>
              <div style={styles.noResultsHint}>
                {searchTerm ? 'Try different keywords' : 'No items available'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    fontFamily: 'Inter, sans-serif'
  },
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

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: '24px',
    right: '24px',
    background: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    maxHeight: '500px',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideDown 0.3s ease'
  },

  // Dropdown Header
  dropdownHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    background: '#f8f9fa'
  },
  dropdownTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },

  // Items List
  itemsList: {
    overflowY: 'auto',
    maxHeight: '400px',
    padding: '8px 0'
  },

  // Item Card
  itemCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderLeft: '3px solid transparent'
  },
  itemImage: {
    width: '60px',
    height: '60px',
    borderRadius: '8px',
    objectFit: 'cover',
    background: '#f1f5f9',
    flexShrink: 0
  },
  itemContent: {
    flex: 1,
    minWidth: 0
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  itemMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    alignItems: 'center'
  },
  itemPrice: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: '14px'
  },
  itemCategory: {
    color: '#64748b',
    background: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600'
  },

  // Dropdown Footer
  dropdownFooter: {
    padding: '12px 20px',
    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
    background: '#f8f9fa',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500'
  },

  // Loading State
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '32px',
    color: '#64748b'
  },
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '3px solid rgba(255, 140, 0, 0.1)',
    borderTop: '3px solid #FF8C00',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '14px',
    fontWeight: '500'
  },

  // No Results
  noResults: {
    padding: '40px 20px',
    textAlign: 'center'
  },
  noResultsIcon: {
    fontSize: '48px',
    opacity: 0.3,
    marginBottom: '12px',
    display: 'block'
  },
  noResultsText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px'
  },
  noResultsHint: {
    fontSize: '14px',
    color: '#64748b'
  }
};

// Add CSS animations and hover effects
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .search-item-card:hover {
      background: #f8f9fa !important;
      border-left-color: #FF8C00 !important;
    }
    
    .clear-search-button:hover {
      background: rgba(100, 116, 139, 0.1) !important;
    }
    
    /* Custom scrollbar for items list */
    .items-list::-webkit-scrollbar {
      width: 6px;
    }
    
    .items-list::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 10px;
    }
    
    .items-list::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 10px;
    }
    
    .items-list::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default SmartSearchBar;

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    fontFamily: 'Inter, sans-serif'
  },
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

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: '24px',
    right: '24px',
    background: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    maxHeight: '500px',
    overflowY: 'auto',
    animation: 'slideDown 0.3s ease'
  },

  // Sections
  section: {
    padding: '12px 0',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px 8px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  sectionIcon: {
    fontSize: '14px'
  },

  // Suggestion Items
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderLeft: '3px solid transparent'
  },
  itemIcon: {
    fontSize: '20px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    borderRadius: '8px'
  },
  itemText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#000'
  },

  // Result Items (with images)
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderLeft: '3px solid transparent'
  },
  resultImage: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    objectFit: 'cover',
    background: '#f1f5f9'
  },
  resultContent: {
    flex: 1,
    minWidth: 0
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  resultMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px'
  },
  resultPrice: {
    color: '#FF8C00',
    fontWeight: '700'
  },
  resultCategory: {
    color: '#64748b'
  },

  // Loading State
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px',
    color: '#64748b'
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 140, 0, 0.1)',
    borderTop: '3px solid #FF8C00',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '14px',
    fontWeight: '500'
  },

  // No Results
  noResults: {
    padding: '32px 20px',
    textAlign: 'center'
  },
  noResultsIcon: {
    fontSize: '48px',
    opacity: 0.3,
    marginBottom: '12px',
    display: 'block'
  },
  noResultsText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px'
  },
  noResultsHint: {
    fontSize: '14px',
    color: '#64748b'
  }
};

// Add CSS animations and hover effects
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .suggestion-item:hover {
      background: #f8f9fa !important;
      border-left-color: #FF8C00 !important;
    }
    
    .clear-search-button:hover {
      background: rgba(100, 116, 139, 0.1) !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default SmartSearchBar;
