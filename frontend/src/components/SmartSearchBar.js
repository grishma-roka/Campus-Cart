import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';

const SmartSearchBar = ({ onSearch, currentSearchTerm = '' }) => {
  const [searchTerm, setSearchTerm] = useState(currentSearchTerm);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  // Popular searches - predefined
  const popularSearches = [
    { text: 'Books', icon: '📚' },
    { text: 'Calculator', icon: '🔢' },
    { text: 'Laptop', icon: '💻' },
    { text: 'Water Bottle', icon: '💧' }
  ];

  // Categories
  const categories = [
    { text: 'Electronics', icon: '💻' },
    { text: 'Books', icon: '📚' },
    { text: 'Furniture', icon: '🪑' },
    { text: 'Accessories', icon: '👜' },
    { text: 'Sports', icon: '⚽' },
    { text: 'Clothing', icon: '👕' }
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('campusCartRecentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Update search term when prop changes
  useEffect(() => {
    setSearchTerm(currentSearchTerm);
  }, [currentSearchTerm]);

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

  // Fetch live suggestions when typing
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchTerm.trim().length >= 2) {
      setLoading(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const response = await axios.get(`/items?search=${encodeURIComponent(searchTerm)}&limit=5`);
          setSuggestions(response.data.slice(0, 5));
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setLoading(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (term = searchTerm) => {
    if (term.trim()) {
      // Save to recent searches
      const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 3);
      setRecentSearches(updated);
      localStorage.setItem('campusCartRecentSearches', JSON.stringify(updated));
      
      // Trigger search
      onSearch(term);
      setIsFocused(false);
    }
  };

  const handleSuggestionClick = (text) => {
    setSearchTerm(text);
    handleSearchSubmit(text);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const highlightMatch = (text, query) => {
    if (!query || query.length < 2) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <strong key={index} style={{ color: '#FF8C00', fontWeight: '700' }}>{part}</strong> : 
        part
    );
  };

  const showDefaultSuggestions = isFocused && searchTerm.length < 2;
  const showLiveSuggestions = isFocused && searchTerm.length >= 2;

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
            onClick={() => {
              setSearchTerm('');
              onSearch('');
            }}
            style={styles.clearSearchButton}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown - Default Suggestions */}
      {showDefaultSuggestions && (
        <div style={styles.dropdown}>
          {/* Popular Searches */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>🔥</span>
              Popular Searches
            </div>
            {popularSearches.map((item, index) => (
              <div 
                key={`popular-${index}`}
                style={styles.suggestionItem}
                onClick={() => handleSuggestionClick(item.text)}
                className="suggestion-item"
              >
                <span style={styles.itemIcon}>{item.icon}</span>
                <span style={styles.itemText}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>📂</span>
              Categories
            </div>
            {categories.map((item, index) => (
              <div 
                key={`category-${index}`}
                style={styles.suggestionItem}
                onClick={() => handleSuggestionClick(item.text)}
                className="suggestion-item"
              >
                <span style={styles.itemIcon}>{item.icon}</span>
                <span style={styles.itemText}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>🕐</span>
                Recently Searched
              </div>
              {recentSearches.map((search, index) => (
                <div 
                  key={`recent-${index}`}
                  style={styles.suggestionItem}
                  onClick={() => handleSuggestionClick(search)}
                  className="suggestion-item"
                >
                  <span style={styles.itemIcon}>🔍</span>
                  <span style={styles.itemText}>{search}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dropdown - Live Suggestions */}
      {showLiveSuggestions && (
        <div style={styles.dropdown}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.loadingSpinner}></div>
              <span style={styles.loadingText}>Searching...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>🔍</span>
                Search Results ({suggestions.length})
              </div>
              {suggestions.map((item, index) => {
                const images = item.images ? JSON.parse(item.images) : [];
                const imageUrl = images.length > 0 ? images[0] : null;
                
                return (
                  <div 
                    key={`result-${index}`}
                    style={styles.resultItem}
                    onClick={() => handleSuggestionClick(item.title)}
                    className="suggestion-item"
                  >
                    {imageUrl && (
                      <img 
                        src={imageUrl} 
                        alt={item.title}
                        style={styles.resultImage}
                      />
                    )}
                    <div style={styles.resultContent}>
                      <div style={styles.resultTitle}>
                        {highlightMatch(item.title, searchTerm)}
                      </div>
                      <div style={styles.resultMeta}>
                        <span style={styles.resultPrice}>रू {item.price?.toLocaleString()}</span>
                        <span style={styles.resultCategory}>{item.category}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.noResults}>
              <span style={styles.noResultsIcon}>🔍</span>
              <div style={styles.noResultsText}>No results found</div>
              <div style={styles.noResultsHint}>Try different keywords</div>
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
