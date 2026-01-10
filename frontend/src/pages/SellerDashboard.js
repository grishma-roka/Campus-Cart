import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition_status: 'good',
    is_borrowable: false,
    borrow_price_per_day: '',
    max_borrow_days: 7,
    images: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('🏪 Fetching seller dashboard data...');
      const [itemsRes, ordersRes, borrowsRes] = await Promise.all([
        axios.get('/items/my-items'),
        axios.get('/orders/seller-orders'),
        axios.get('/borrow/seller-requests')
      ]);
      
      console.log('📦 Items:', itemsRes.data.length);
      console.log('🛒 Orders:', ordersRes.data.length);
      console.log('📋 Borrows:', borrowsRes.data.length);
      
      setItems(itemsRes.data);
      setOrders(ordersRes.data);
      setBorrowRequests(borrowsRes.data);
    } catch (error) {
      console.error('❌ Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        ...newItem,
        price: parseFloat(newItem.price),
        borrow_price_per_day: newItem.is_borrowable ? parseFloat(newItem.borrow_price_per_day) : 0,
        max_borrow_days: parseInt(newItem.max_borrow_days),
        images: newItem.images ? JSON.stringify([newItem.images]) : JSON.stringify([])
      };

      await axios.post('/items/add', itemData);
      alert(`Item "${newItem.title}" added successfully!`);
      setShowAddItem(false);
      setNewItem({
        title: '',
        description: '',
        price: '',
        category: '',
        condition_status: 'good',
        is_borrowable: false,
        borrow_price_per_day: '',
        max_borrow_days: 7,
        images: ''
      });
      fetchData();
    } catch (error) {
      alert('Failed to add item: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConfirmOrder = async (orderId, orderTitle) => {
    try {
      await axios.put(`/orders/confirm/${orderId}`);
      alert(`Order for "${orderTitle}" confirmed successfully!`);
      fetchData();
    } catch (error) {
      alert('Failed to confirm order: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleBorrowResponse = async (requestId, status, itemTitle) => {
    try {
      const notes = status === 'rejected' ? window.prompt('Reason for rejection (optional):') : '';
      await axios.put(`/borrow/respond/${requestId}`, {
        status,
        admin_notes: notes
      });
      alert(`Borrow request for "${itemTitle}" ${status} successfully!`);
      fetchData();
    } catch (error) {
      alert(`Failed to ${status} borrow request: ` + (error.response?.data?.error || error.message));
    }
  };

  const handleStartBorrow = async (requestId, itemTitle) => {
    try {
      const condition = window.prompt('Describe the current condition of the item:');
      if (!condition) return;

      await axios.put(`/borrow/start/${requestId}`, {
        condition_before: condition,
        images_before: []
      });
      alert(`Borrowing started for "${itemTitle}" successfully!`);
      fetchData();
    } catch (error) {
      alert('Failed to start borrowing: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReturnItem = async (requestId, itemTitle) => {
    try {
      const condition = window.prompt('Describe the condition after return:');
      const damageReported = window.confirm('Is there any damage to report?');
      let damageDescription = '';
      let refundAmount = 0;

      if (damageReported) {
        damageDescription = window.prompt('Describe the damage:');
        refundAmount = parseFloat(window.prompt('Refund amount (if any):') || '0');
      }

      await axios.put(`/borrow/return/${requestId}`, {
        condition_after: condition,
        images_after: [],
        damage_reported: damageReported,
        damage_description: damageDescription,
        refund_amount: refundAmount
      });
      alert(`Return processed for "${itemTitle}" successfully!`);
      fetchData();
    } catch (error) {
      alert('Failed to process return: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Seller Dashboard</h1>
        <p>Welcome, {user?.full_name}! Manage your items and orders</p>
        <div style={styles.quickStats}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{items.length}</span>
            <span style={styles.statLabel}>Items Listed</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{orders.length}</span>
            <span style={styles.statLabel}>Total Orders</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{borrowRequests.length}</span>
            <span style={styles.statLabel}>Borrow Requests</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>
              {orders.filter(o => o.status === 'pending').length}
            </span>
            <span style={styles.statLabel}>Pending Orders</span>
          </div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button 
          style={activeTab === 'items' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('items')}
        >
          My Items ({items.length})
        </button>
        <button 
          style={activeTab === 'orders' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('orders')}
        >
          Orders ({orders.length})
        </button>
        <button 
          style={activeTab === 'borrows' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('borrows')}
        >
          Borrow Requests ({borrowRequests.length})
        </button>
      </div>

      {activeTab === 'items' && (
        <div>
          <div style={styles.sectionHeader}>
            <h2>My Items</h2>
            <button 
              onClick={() => setShowAddItem(true)}
              style={styles.addButton}
            >
              Add New Item
            </button>
          </div>

          {showAddItem && (
            <div style={styles.modal}>
              <div style={styles.modalContent}>
                <h3>Add New Item</h3>
                <form onSubmit={handleAddItem} style={styles.form}>
                  <input
                    type="text"
                    placeholder="Item Title"
                    value={newItem.title}
                    onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                    required
                    style={styles.input}
                  />
                  <textarea
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    required
                    style={styles.textarea}
                  />
                  <input
                    type="number"
                    placeholder="Price (रू)"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    required
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g., Electronics, Books, Furniture)"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    required
                    style={styles.input}
                  />
                  <input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={newItem.images}
                    onChange={(e) => setNewItem({...newItem, images: e.target.value})}
                    style={styles.input}
                  />
                  <select
                    value={newItem.condition_status}
                    onChange={(e) => setNewItem({...newItem, condition_status: e.target.value})}
                    style={styles.select}
                  >
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                  
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newItem.is_borrowable}
                      onChange={(e) => setNewItem({...newItem, is_borrowable: e.target.checked})}
                    />
                    Available for borrowing
                  </label>

                  {newItem.is_borrowable && (
                    <>
                      <input
                        type="number"
                        placeholder="Borrow price per day (रू)"
                        value={newItem.borrow_price_per_day}
                        onChange={(e) => setNewItem({...newItem, borrow_price_per_day: e.target.value})}
                        style={styles.input}
                      />
                      <input
                        type="number"
                        placeholder="Maximum borrow days"
                        value={newItem.max_borrow_days}
                        onChange={(e) => setNewItem({...newItem, max_borrow_days: e.target.value})}
                        style={styles.input}
                      />
                    </>
                  )}

                  <div style={styles.modalActions}>
                    <button type="submit" style={styles.submitButton}>Add Item</button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddItem(false)}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={styles.itemsGrid}>
            {items.map(item => {
              const images = item.images ? JSON.parse(item.images) : [];
              const imageUrl = images.length > 0 ? images[0] : `https://via.placeholder.com/300x200/27ae60/white?text=${encodeURIComponent(item.title.substring(0, 20))}`;
              
              return (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.imageContainer}>
                    <img 
                      src={imageUrl} 
                      alt={item.title}
                      style={styles.itemImage}
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/300x200/27ae60/white?text=${encodeURIComponent(item.title.substring(0, 20))}`;
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
                    
                    <div style={styles.itemStats}>
                      <span>Orders: {item.total_orders || 0}</span>
                      <span>Borrows: {item.total_borrows || 0}</span>
                      <span style={{color: item.is_available ? '#27ae60' : '#e74c3c'}}>
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div style={styles.emptyState}>
              <h3>No items listed yet</h3>
              <p>Click "Add New Item" to list your first item!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div style={styles.ordersSection}>
          <h2>Orders</h2>
          {orders.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>No orders yet</h3>
              <p>Orders will appear here when customers buy your items.</p>
            </div>
          ) : (
            <div style={styles.ordersList}>
              {orders.map(order => {
                const images = order.images ? JSON.parse(order.images) : [];
                const imageUrl = images.length > 0 ? images[0] : 'https://via.placeholder.com/100x100?text=No+Image';
                
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
                        <p>Buyer: {order.buyer_name} ({order.buyer_phone})</p>
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
                    
                    {order.status === 'pending' && (
                      <div style={styles.orderActions}>
                        <button 
                          onClick={() => handleConfirmOrder(order.id, order.title)}
                          style={styles.confirmButton}
                        >
                          Confirm Order
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'borrows' && (
        <div style={styles.borrowsSection}>
          <h2>Borrow Requests</h2>
          {borrowRequests.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>No borrow requests yet</h3>
              <p>Borrow requests will appear here when customers want to borrow your items.</p>
            </div>
          ) : (
            <div style={styles.borrowsList}>
              {borrowRequests.map(request => {
                const images = request.images ? JSON.parse(request.images) : [];
                const imageUrl = images.length > 0 ? images[0] : 'https://via.placeholder.com/100x100?text=No+Image';
                
                return (
                  <div key={request.id} style={styles.borrowCard}>
                    <div style={styles.borrowHeader}>
                      <img 
                        src={imageUrl} 
                        alt={request.title}
                        style={styles.borrowImage}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                        }}
                      />
                      <div style={styles.borrowInfo}>
                        <h3>{request.title}</h3>
                        <p>Total Cost: <strong>रू {request.total_cost.toLocaleString()}</strong></p>
                        <p>Borrower: {request.borrower_name} ({request.borrower_phone})</p>
                      </div>
                      <div style={styles.borrowStatus}>
                        <span style={{...styles.statusBadge, backgroundColor: getStatusColor(request.status)}}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div style={styles.borrowDetailsText}>
                      <p><strong>Duration:</strong> {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()} ({request.total_days} days)</p>
                      <p><strong>Daily Rate:</strong> रू {(request.total_cost / request.total_days).toFixed(0)}/day</p>
                      {request.message && <p><strong>Message:</strong> {request.message}</p>}
                      <p><strong>Requested:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div style={styles.borrowActions}>
                      {request.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleBorrowResponse(request.id, 'approved', request.title)}
                            style={styles.approveButton}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleBorrowResponse(request.id, 'rejected', request.title)}
                            style={styles.rejectButton}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <button 
                          onClick={() => handleStartBorrow(request.id, request.title)}
                          style={styles.startButton}
                        >
                          Start Borrowing
                        </button>
                      )}
                      {request.status === 'active' && (
                        <button 
                          onClick={() => handleReturnItem(request.id, request.title)}
                          style={styles.returnButton}
                        >
                          Process Return
                        </button>
                      )}
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
    backgroundColor: '#27ae60',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '1rem'
  },
  textarea: {
    padding: '0.75rem',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    minHeight: '100px',
    resize: 'vertical',
    fontSize: '1rem'
  },
  select: {
    padding: '0.75rem',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '1rem'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem'
  },
  submitButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#95a5a6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
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
    transition: 'transform 0.3s ease'
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
  itemStats: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.9rem',
    color: '#666'
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
    color: '#666',
    marginBottom: '1rem'
  },
  orderActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  confirmButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
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
    color: '#666',
    marginBottom: '1rem'
  },
  borrowActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  approveButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  rejectButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  startButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  returnButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f39c12',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
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
    color: '#27ae60'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '0.5rem'
  }
};
