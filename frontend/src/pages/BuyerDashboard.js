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
      const [itemsRes, ordersRes, borrowsRes] = await Promise.all([
        axios.get('/items'),
        axios.get('/orders/my-orders'),
        axios.get('/borrow/my-requests')
      ]);
      
      setItems(itemsRes.data);
      setOrders(ordersRes.data);
      setBorrows(borrowsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyItem = async (itemId) => {
    try {
      const address = window.prompt('Enter delivery address:');
      if (!address) return;

      await axios.post('/orders/create', {
        item_id: itemId,
        quantity: 1,
        delivery_address: address
      });

      alert('Order placed successfully!');
      fetchData();
    } catch (error) {
      alert('Failed to place order: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleBorrowRequest = async (itemId) => {
    try {
      const startDate = window.prompt('Enter start date (YYYY-MM-DD):');
      const endDate = window.prompt('Enter end date (YYYY-MM-DD):');
      const message = window.prompt('Message to seller (optional):');
      
      if (!startDate || !endDate) return;

      await axios.post('/borrow/request', {
        item_id: itemId,
        start_date: startDate,
        end_date: endDate,
        message
      });

      alert('Borrow request sent successfully!');
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
            <span style={styles.statLabel}>Orders</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{borrows.length}</span>
            <span style={styles.statLabel}>Borrows</span>
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
            {filteredItems.map(item => (
              <div key={item.id} style={styles.itemCard}>
                <h3>{item.title}</h3>
                <p style={styles.description}>{item.description}</p>
                <div style={styles.itemDetails}>
                  <span style={styles.price}>₹{item.price}</span>
                  <span style={styles.category}>{item.category}</span>
                  <span style={styles.condition}>{item.condition_status}</span>
                </div>
                <p style={styles.seller}>Seller: {item.seller_name}</p>
                
                <div style={styles.itemActions}>
                  <button 
                    onClick={() => handleBuyItem(item.id)}
                    style={styles.buyButton}
                  >
                    Buy Now
                  </button>
                  {item.is_borrowable && (
                    <button 
                      onClick={() => handleBorrowRequest(item.id)}
                      style={styles.borrowButton}
                    >
                      Borrow (₹{item.borrow_price_per_day}/day)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div style={styles.ordersSection}>
          <h2>My Orders</h2>
          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            <div style={styles.ordersList}>
              {orders.map(order => (
                <div key={order.id} style={styles.orderCard}>
                  <h3>{order.title}</h3>
                  <p>Amount: ₹{order.total_amount}</p>
                  <p>Status: <span style={styles.status}>{order.status}</span></p>
                  <p>Delivery Status: <span style={styles.status}>{order.delivery_status || 'Pending'}</span></p>
                  <p>Ordered: {new Date(order.created_at).toLocaleDateString()}</p>
                  {order.rider_name && <p>Rider: {order.rider_name}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'borrows' && (
        <div style={styles.borrowsSection}>
          <h2>My Borrow Requests</h2>
          {borrows.length === 0 ? (
            <p>No borrow requests yet.</p>
          ) : (
            <div style={styles.borrowsList}>
              {borrows.map(borrow => (
                <div key={borrow.id} style={styles.borrowCard}>
                  <h3>{borrow.title}</h3>
                  <p>Duration: {new Date(borrow.start_date).toLocaleDateString()} - {new Date(borrow.end_date).toLocaleDateString()}</p>
                  <p>Total Cost: ₹{borrow.total_cost}</p>
                  <p>Status: <span style={styles.status}>{borrow.status}</span></p>
                  <p>Seller: {borrow.seller_name}</p>
                  {borrow.message && <p>Message: {borrow.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem'
  },
  tabs: {
    display: 'flex',
    marginBottom: '2rem',
    borderBottom: '1px solid #ddd'
  },
  tab: {
    padding: '1rem 2rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  activeTab: {
    padding: '1rem 2rem',
    border: 'none',
    backgroundColor: '#3498db',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  filters: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem'
  },
  searchInput: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  categorySelect: {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem'
  },
  itemCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1.5rem',
    backgroundColor: '#fff'
  },
  description: {
    color: '#666',
    marginBottom: '1rem'
  },
  itemDetails: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  price: {
    fontWeight: 'bold',
    color: '#27ae60'
  },
  category: {
    backgroundColor: '#ecf0f1',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem'
  },
  condition: {
    backgroundColor: '#f39c12',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
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
    padding: '0.5rem',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  borrowButton: {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#f39c12',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  ordersSection: {
    marginTop: '2rem'
  },
  ordersList: {
    display: 'grid',
    gap: '1rem'
  },
  orderCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1.5rem',
    backgroundColor: '#fff'
  },
  borrowsSection: {
    marginTop: '2rem'
  },
  borrowsList: {
    display: 'grid',
    gap: '1rem'
  },
  borrowCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1.5rem',
    backgroundColor: '#fff'
  },
  status: {
    fontWeight: 'bold',
    textTransform: 'capitalize'
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
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minWidth: '100px'
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
