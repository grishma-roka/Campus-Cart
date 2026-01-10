import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching buyer dashboard data...');
      const [itemsRes, ordersRes, borrowsRes] = await Promise.all([
        axios.get('/items'),
        axios.get('/orders/my-orders'),
        axios.get('/borrow/my-requests')
      ]);
      
      console.log('📦 Items received:', itemsRes.data.length);
      console.log('🛒 Orders received:', ordersRes.data.length);
      console.log('📋 Borrows received:', borrowsRes.data.length);
      
      setItems(itemsRes.data);
      setOrders(ordersRes.data);
      setBorrows(borrowsRes.data);
    } catch (error) {
      console.error('❌ Error fetching buyer data:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuyItem = async (itemId, itemTitle, itemPrice) => {
    try {
      const address = window.prompt('Enter delivery address:');
      if (!address) return;

      await axios.post('/orders/create', {
        item_id: itemId,
        quantity: 1,
        delivery_address: address
      });

      alert(`Order placed successfully for ${itemTitle}! Total: रू ${itemPrice.toLocaleString()}`);
      fetchData();
    } catch (error) {
      alert('Failed to place order: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleBorrowRequest = async (itemId, itemTitle, borrowPrice) => {
    try {
      const startDate = window.prompt('Enter start date (YYYY-MM-DD):');
      const endDate = window.prompt('Enter end date (YYYY-MM-DD):');
      const message = window.prompt('Message to seller (optional):');
      
      if (!startDate || !endDate) return;

      // Calculate days and cost
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const totalCost = days * borrowPrice;

      await axios.post('/borrow/request', {
        item_id: itemId,
        start_date: startDate,
        end_date: endDate,
        message
      });

      alert(`Borrow request sent for ${itemTitle}! Duration: ${days} days, Total cost: रू ${totalCost.toLocaleString()}`);
      fetchData();
    } catch (error) {
      alert('Failed to send borrow request: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(items.map(item => item.category))];

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Welcome, {user?.full_name}!</h1>
        <p>Browse items, place orders, and manage your borrows</p>
        <div style={styles.quickStats}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{orders.length}</span>
            <span style={styles.statLabel}>My Orders</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{borrows.length}</span>
            <span style={styles.statLabel}>My Borrows</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{filteredItems.length}</span>
            <span style={styles.statLabel}>Available Items</span>
          </div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button 
          style={activeTab === 'browse' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('browse')}
        >
          Browse Items ({filteredItems.length})
        </button>
        <button 
          style={activeTab === 'orders' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('orders')}
        >
          My Orders ({orders.length})
        </button>
        <button 
          style={activeTab === 'borrows' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('borrows')}
        >
          My Borrows ({borrows.length})
        </button>
      </div>

      {activeTab === 'browse' && (
        <div>
          <div style={styles.filters}>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.categorySelect}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div style={styles.itemsGrid}>
            {filteredItems.map(item => {
              const images = item.images ? JSON.parse(item.images) : [];
              const imageUrl = images.length > 0 ? images[0] : `https://via.placeholder.com/300x200/2196F3/white?text=${encodeURIComponent(item.title.substring(0, 20))}`;
              
              return (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.imageContainer}>
                    <img 
                      src={imageUrl} 
                      alt={item.title}
                      style={styles.itemImage}
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/300x200/4CAF50/white?text=${encodeURIComponent(item.title.substring(0, 20))}`;
                      }}
                    />
                    <div style={styles.conditionBadge}>
                      {item.condition_status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  
                  <div style={styles.itemContent}>
                    <h3 style={styles.itemTitle}>{item.title}</h3>
                    <p style={styles.description}>{item.description}</p>
                    
                    <div style={styles.itemDetails}>
                      <div style={styles.priceSection}>
                        <span style={styles.price}>रू {item.price.toLocaleString()}</span>
                        <span style={styles.category}>{item.category}</span>
                      </div>
                      
                      {item.is_borrowable && (
                        <div style={styles.borrowInfo}>
                          <span style={styles.borrowPrice}>
                            Borrow: रू {item.borrow_price_per_day}/day
                          </span>
                          <span style={styles.maxDays}>
                            (Max {item.max_borrow_days} days)
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p style={styles.seller}>Seller: {item.seller_name}</p>
                    
                    <div style={styles.itemActions}>
                      <button 
                        onClick={() => handleBuyItem(item.id, item.title, item.price)}
                        style={styles.buyButton}
                      >
                        Buy Now - रू {item.price.toLocaleString()}
                      </button>
                      {item.is_borrowable && (
                        <button 
                          onClick={() => handleBorrowRequest(item.id, item.title, item.borrow_price_per_day)}
                          style={styles.borrowButton}
                        >
                          Borrow - रू {item.borrow_price_per_day}/day
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div style={styles.emptyState}>
              <h3>No items found</h3>
              <p>Try adjusting your search or category filter.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div style={styles.ordersSection}>
          <h2>My Orders</h2>
          {orders.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>No orders yet</h3>
              <p>Browse items and place your first order!</p>
            </div>
          ) : (
            <div style={styles.ordersList}>
              {orders.map(order => {
                const images = order.images ? JSON.parse(order.images) : [];
                const imageUrl = images.length > 0 ? images[0] : `https://via.placeholder.com/100x100/FF9800/white?text=${encodeURIComponent(order.title.substring(0, 10))}`;
                
                return (
                  <div key={order.id} style={styles.orderCard}>
                    <div style={styles.orderHeader}>
                      <img 
                        src={imageUrl} 
                        alt={order.title}
                        style={styles.orderImage}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                        }}
                      />
                      <div style={styles.orderInfo}>
                        <h3>{order.title}</h3>
                        <p>Amount: <strong>रू {order.total_amount.toLocaleString()}</strong></p>
                        <p>Seller: {order.seller_name}</p>
                      </div>
                      <div style={styles.orderStatus}>
                        <span style={{...styles.statusBadge, backgroundColor: getStatusColor(order.status)}}>
                          {order.status.toUpperCase()}
                        </span>
                        <span style={{...styles.statusBadge, backgroundColor: getStatusColor(order.delivery_status)}}>
                          {order.delivery_status ? order.delivery_status.toUpperCase() : 'PENDING'}
                        </span>
                      </div>
                    </div>
                    
                    <div style={styles.orderDetails}>
                      <p><strong>Delivery Address:</strong> {order.delivery_address}</p>
                      <p><strong>Ordered:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                      {order.rider_name && <p><strong>Rider:</strong> {order.rider_name} ({order.rider_phone})</p>}
                      {order.pickup_time && <p><strong>Picked up:</strong> {new Date(order.pickup_time).toLocaleString()}</p>}
                      {order.delivery_time && <p><strong>Delivered:</strong> {new Date(order.delivery_time).toLocaleString()}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'borrows' && (
        <div style={styles.borrowsSection}>
          <h2>My Borrow Requests</h2>
          {borrows.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>No borrow requests yet</h3>
              <p>Find borrowable items and send your first request!</p>
            </div>
          ) : (
            <div style={styles.borrowsList}>
              {borrows.map(borrow => {
                const images = borrow.images ? JSON.parse(borrow.images) : [];
                const imageUrl = images.length > 0 ? images[0] : 'https://via.placeholder.com/100x100?text=No+Image';
                
                return (
                  <div key={borrow.id} style={styles.borrowCard}>
                    <div style={styles.borrowHeader}>
                      <img 
                        src={imageUrl} 
                        alt={borrow.title}
                        style={styles.borrowImage}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                        }}
                      />
                      <div style={styles.borrowInfo}>
                        <h3>{borrow.title}</h3>
                        <p>Total Cost: <strong>रू {borrow.total_cost.toLocaleString()}</strong></p>
                        <p>Seller: {borrow.seller_name}</p>
                      </div>
                      <div style={styles.borrowStatus}>
                        <span style={{...styles.statusBadge, backgroundColor: getStatusColor(borrow.status)}}>
                          {borrow.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div style={styles.borrowDetailsText}>
                      <p><strong>Duration:</strong> {new Date(borrow.start_date).toLocaleDateString()} - {new Date(borrow.end_date).toLocaleDateString()} ({borrow.total_days} days)</p>
                      <p><strong>Daily Rate:</strong> रू {(borrow.total_cost / borrow.total_days).toFixed(0)}/day</p>
                      {borrow.message && <p><strong>Message:</strong> {borrow.message}</p>}
                      <p><strong>Requested:</strong> {new Date(borrow.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to get status colors
const getStatusColor = (status) => {
  const colors = {
    pending: '#f39c12',
    confirmed: '#3498db',
    assigned: '#9b59b6',
    picked_up: '#e67e22',
    delivered: '#27ae60',
    cancelled: '#e74c3c',
    approved: '#27ae60',
    rejected: '#e74c3c',
    active: '#2ecc71',
    returned: '#95a5a6',
    overdue: '#e74c3c'
  };
  return colors[status] || '#95a5a6';
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: '#f8f9fa'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem'
  },
  tabs: {
    display: 'flex',
    marginBottom: '2rem',
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tab: {
    flex: 1,
    padding: '1rem 2rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.3s ease'
  },
  activeTab: {
    flex: 1,
    padding: '1rem 2rem',
    border: 'none',
    backgroundColor: '#3498db',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  filters: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '1rem'
  },
  categorySelect: {
    padding: '0.75rem',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '1rem',
    minWidth: '200px'
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '2rem'
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer'
  },
  imageContainer: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden'
  },
  itemImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  conditionBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold'
  },
  itemContent: {
    padding: '1.5rem'
  },
  itemTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  description: {
    color: '#666',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    lineHeight: '1.4'
  },
  itemDetails: {
    marginBottom: '1rem'
  },
  priceSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  price: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#27ae60'
  },
  category: {
    backgroundColor: '#ecf0f1',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    color: '#2c3e50'
  },
  borrowInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #ffeaa7'
  },
  borrowPrice: {
    color: '#f39c12',
    fontWeight: 'bold',
    fontSize: '0.9rem'
  },
  maxDays: {
    color: '#666',
    fontSize: '0.8rem'
  },
  seller: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '1rem'
  },
  itemActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  buyButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    transition: 'background-color 0.3s ease'
  },
  borrowButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#f39c12',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    transition: 'background-color 0.3s ease'
  },
  ordersSection: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  orderCard: {
    border: '1px solid #e9ecef',
    borderRadius: '12px',
    padding: '1.5rem',
    backgroundColor: '#f8f9fa'
  },
  orderHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  orderImage: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  orderInfo: {
    flex: 1
  },
  orderStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  },
  orderDetails: {
    fontSize: '0.9rem',
    color: '#666'
  },
  borrowsSection: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  borrowsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  borrowCard: {
    border: '1px solid #e9ecef',
    borderRadius: '12px',
    padding: '1.5rem',
    backgroundColor: '#f8f9fa'
  },
  borrowHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  borrowImage: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  borrowInfo: {
    flex: 1
  },
  borrowStatus: {
    display: 'flex',
    flexDirection: 'column'
  },
  borrowDetailsText: {
    fontSize: '0.9rem',
    color: '#666'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#fff',
    borderRadius: '12px',
    color: '#666',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  quickStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '1.5rem'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    minWidth: '120px',
    border: '2px solid #e9ecef'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#3498db'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '0.5rem'
  }
};
