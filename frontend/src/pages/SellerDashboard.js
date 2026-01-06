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
    max_borrow_days: 7
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, ordersRes, borrowsRes] = await Promise.all([
        axios.get('/items/my-items'),
        axios.get('/orders/seller-orders'),
        axios.get('/borrow/seller-requests')
      ]);
      
      setItems(itemsRes.data);
      setOrders(ordersRes.data);
      setBorrowRequests(borrowsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/items/add', newItem);
      alert('Item added successfully!');
      setShowAddItem(false);
      setNewItem({
        title: '',
        description: '',
        price: '',
        category: '',
        condition_status: 'good',
        is_borrowable: false,
        borrow_price_per_day: '',
        max_borrow_days: 7
      });
      fetchData();
    } catch (error) {
      alert('Failed to add item: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      await axios.put(`/orders/confirm/${orderId}`);
      alert('Order confirmed successfully!');
      fetchData();
    } catch (error) {
      alert('Failed to confirm order: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleBorrowResponse = async (requestId, status) => {
    try {
      const notes = status === 'rejected' ? window.prompt('Reason for rejection (optional):') : '';
      await axios.put(`/borrow/respond/${requestId}`, {
        status,
        admin_notes: notes
      });
      alert(`Borrow request ${status} successfully!`);
      fetchData();
    } catch (error) {
      alert(`Failed to ${status} borrow request: ` + (error.response?.data?.error || error.message));
    }
  };

  const handleStartBorrow = async (requestId) => {
    try {
      const condition = window.prompt('Describe the current condition of the item:');
      if (!condition) return;

      await axios.put(`/borrow/start/${requestId}`, {
        condition_before: condition,
        images_before: []
      });
      alert('Borrowing started successfully!');
      fetchData();
    } catch (error) {
      alert('Failed to start borrowing: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReturnItem = async (requestId) => {
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
      alert('Item return processed successfully!');
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
                    placeholder="Title"
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
                    placeholder="Price"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    required
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    required
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
                        placeholder="Borrow price per day"
                        value={newItem.borrow_price_per_day}
                        onChange={(e) => setNewItem({...newItem, borrow_price_per_day: e.target.value})}
                        style={styles.input}
                      />
                      <input
                        type="number"
                        placeholder="Max borrow days"
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
            {items.map(item => (
              <div key={item.id} style={styles.itemCard}>
                <h3>{item.title}</h3>
                <p style={styles.description}>{item.description}</p>
                <div style={styles.itemDetails}>
                  <span style={styles.price}>₹{item.price}</span>
                  <span style={styles.category}>{item.category}</span>
                  <span style={styles.condition}>{item.condition_status}</span>
                </div>
                {item.is_borrowable && (
                  <p style={styles.borrowInfo}>
                    Borrowable: ₹{item.borrow_price_per_day}/day (max {item.max_borrow_days} days)
                  </p>
                )}
                <div style={styles.itemStats}>
                  <span>Orders: {item.total_orders || 0}</span>
                  <span>Borrows: {item.total_borrows || 0}</span>
                  <span>Status: {item.is_available ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          <h2>Orders</h2>
          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            <div style={styles.ordersList}>
              {orders.map(order => (
                <div key={order.id} style={styles.orderCard}>
                  <h3>{order.title}</h3>
                  <p>Buyer: {order.buyer_name} ({order.buyer_phone})</p>
                  <p>Amount: ₹{order.total_amount}</p>
                  <p>Status: <span style={styles.status}>{order.status}</span></p>
                  <p>Delivery Status: <span style={styles.status}>{order.delivery_status || 'Pending'}</span></p>
                  <p>Address: {order.delivery_address}</p>
                  <p>Ordered: {new Date(order.created_at).toLocaleDateString()}</p>
                  
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => handleConfirmOrder(order.id)}
                      style={styles.confirmButton}
                    >
                      Confirm Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'borrows' && (
        <div>
          <h2>Borrow Requests</h2>
          {borrowRequests.length === 0 ? (
            <p>No borrow requests yet.</p>
          ) : (
            <div style={styles.borrowsList}>
              {borrowRequests.map(request => (
                <div key={request.id} style={styles.borrowCard}>
                  <h3>{request.title}</h3>
                  <p>Borrower: {request.borrower_name} ({request.borrower_phone})</p>
                  <p>Duration: {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</p>
                  <p>Total Cost: ₹{request.total_cost} ({request.total_days} days)</p>
                  <p>Status: <span style={styles.status}>{request.status}</span></p>
                  {request.message && <p>Message: {request.message}</p>}
                  
                  <div style={styles.borrowActions}>
                    {request.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleBorrowResponse(request.id, 'approved')}
                          style={styles.approveButton}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleBorrowResponse(request.id, 'rejected')}
                          style={styles.rejectButton}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <button 
                        onClick={() => handleStartBorrow(request.id)}
                        style={styles.startButton}
                      >
                        Start Borrowing
                      </button>
                    )}
                    {request.status === 'active' && (
                      <button 
                        onClick={() => handleReturnItem(request.id)}
                        style={styles.returnButton}
                      >
                        Process Return
                      </button>
                    )}
                  </div>
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
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
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
    borderRadius: '8px',
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
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minHeight: '100px',
    resize: 'vertical'
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
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
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#95a5a6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
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
  borrowInfo: {
    color: '#f39c12',
    fontSize: '0.9rem',
    marginBottom: '1rem'
  },
  itemStats: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.9rem',
    color: '#666'
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
  borrowActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem'
  },
  confirmButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  approveButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  rejectButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  startButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  returnButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f39c12',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
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
    color: '#27ae60'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '0.5rem'
  }
};
