import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Handshake, Camera, Upload, Trash2, Image as ImageIcon, RefreshCcw } from 'lucide-react';

export default function SellerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
    images: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const backendUrl = 'http://localhost:5000'; // Base URL for images

  useEffect(() => {
    // Check URL parameters for tab
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['items', 'orders', 'borrows'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    fetchData();
  }, [location]);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', newItem.title);
      formData.append('description', newItem.description);
      formData.append('price', newItem.price);
      formData.append('category', newItem.category);
      formData.append('condition_status', newItem.condition_status);
      formData.append('is_borrowable', newItem.transaction_type === 'borrow');
      formData.append('borrow_price_per_day', 0);
      formData.append('max_borrow_days', 7);
      formData.append('transaction_type', newItem.transaction_type || 'buy');
      
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await axios.post('/items/add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowAddItem(false);
      setNewItem({
        title: '', description: '', price: '', category: '',
        condition_status: 'good', images: '', transaction_type: 'buy'
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchData();
    } catch (error) {
      console.error('❌ Add Item Error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      alert(`Failed to add item: ${errorMsg}`);
    }
  };

  const handleSearchRiders = async (orderId) => {
    try {
      const res = await axios.post(`/orders/search-riders/${orderId}`);
      alert(`✅ ${res.data.message}`);
    } catch (error) {
      alert('Failed: ' + (error.response?.data?.error || error.message));
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
      const response = await axios.put(`/borrow/respond/${requestId}`, {
        status,
        admin_notes: ''
      });
      alert(`Borrow request for "${itemTitle}" ${status} successfully!`);
      if (status === 'approved' && response.data.conversation_id) {
        navigate(`/messages/${response.data.conversation_id}`);
      } else {
        fetchData();
      }
    } catch (error) {
      alert(`Failed to ${status} borrow request: ` + (error.response?.data?.error || error.message));
    }
  };

  const handleStartBorrow = async (requestId, itemTitle) => {
    try {
      await axios.put(`/borrow/start/${requestId}`, {
        condition_before: 'Good condition',
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
      await axios.put(`/borrow/return/${requestId}`, {
        condition_after: 'Returned',
        images_after: [],
        damage_reported: false,
        damage_description: '',
        refund_amount: 0
      });
      alert(`Return processed for "${itemTitle}" successfully!`);
      fetchData();
    } catch (error) {
      alert('Failed to process return: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      try {
        await axios.delete(`/items/${id}`);
        setItems(items.filter(item => item.id !== id));
      } catch (error) {
        alert('Failed to delete item: ' + (error.response?.data?.error || error.message));
      }
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
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0 }}>Seller Dashboard</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b' }}>Welcome, {user?.full_name}! Manage your items and orders</p>
          </div>
          <button 
            onClick={() => fetchData()} 
            style={styles.refreshButton}
            title="Refresh Data"
          >
            <RefreshCcw size={18} />
            Refresh Data
          </button>
        </div>
        <div style={styles.quickStats}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>
              {items.filter(i => i.transaction_type === 'buy' || !i.transaction_type || i.transaction_type === '').length}
            </span>
            <span style={styles.statLabel}>For Sale</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>
              {items.filter(i => i.transaction_type === 'borrow').length}
            </span>
            <span style={styles.statLabel}>For Borrow</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{orders.length}</span>
            <span style={styles.statLabel}>Total Sales</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{borrowRequests.filter(r => r.status === 'pending').length}</span>
            <span style={styles.statLabel}>Pending Borrows</span>
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
        <button
          onClick={() => navigate('/borrow')}
          style={{ ...styles.tab, background: '#F88000', color: '#fff', border: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Handshake size={18} strokeWidth={1.5} />
          Borrow Page
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
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Listing Type</label>
                    <div style={styles.typeSelector}>
                      <button
                        type="button"
                        style={{
                          ...styles.typeBtn,
                          backgroundColor: newItem.transaction_type === 'buy' || !newItem.transaction_type ? '#F88000' : 'transparent',
                          color: newItem.transaction_type === 'buy' || !newItem.transaction_type ? '#fff' : '#64748b',
                          borderColor: newItem.transaction_type === 'buy' || !newItem.transaction_type ? '#F88000' : '#e2e8f0'
                        }}
                        onClick={() => setNewItem({...newItem, transaction_type: 'buy'})}
                      >
                        Sale
                      </button>
                      <button
                        type="button"
                        style={{
                          ...styles.typeBtn,
                          backgroundColor: newItem.transaction_type === 'borrow' ? '#3b82f6' : 'transparent',
                          color: newItem.transaction_type === 'borrow' ? '#fff' : '#64748b',
                          borderColor: newItem.transaction_type === 'borrow' ? '#3b82f6' : '#e2e8f0'
                        }}
                        onClick={() => setNewItem({...newItem, transaction_type: 'borrow'})}
                      >
                        Borrow
                      </button>
                    </div>
                  </div>

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
                  {/* Native File Upload / Dropzone */}
                  <div 
                    style={styles.dropzone}
                    onClick={() => document.getElementById('item_image').click()}
                  >
                    <input 
                      type="file" 
                      id="item_image"
                      accept="image/*" 
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    
                    {previewUrl ? (
                      <div style={styles.previewContainer}>
                        <img src={previewUrl} alt="Preview" style={styles.previewImage} />
                        <div style={styles.changeOverlay}>
                          <Camera size={24} color="#fff" />
                          <span style={{color: '#fff', fontSize: '13px', fontWeight: 'bold'}}>Change Photo</span>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.dropzonePlaceholder}>
                        <div style={styles.iconCircle}>
                          <Camera size={28} color="#F88000" />
                        </div>
                        <span style={styles.dropzoneText}>Upload Item Photo</span>
                        <span style={styles.dropzoneSubtext}>Gallery or Camera (Max 5MB)</span>
                      </div>
                    )}
                  </div>
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
              const mainImage = getSafeImageUrl(item.images);
              
              return (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.imageContainer}>
                    <img 
                      src={mainImage} 
                      alt={item.title}
                      style={styles.itemImage}
                      onError={(e) => {
                        e.target.src = `https://dummyimage.com/300x200/27ae60/ffffff&text=${encodeURIComponent(item.title.substring(0, 10))}`;
                      }}
                    />
                    <div style={styles.conditionBadge}>
                      {item.condition_status.replace('_', ' ').toUpperCase()}
                    </div>
                    {item.transaction_type === 'borrow' && (
                      <div style={{ ...styles.conditionBadge, top: '40px', background: '#3b82f6' }}>
                        LENDING
                      </div>
                    )}
                    {(item.transaction_type === 'buy' || !item.transaction_type) && (
                      <div style={{ ...styles.conditionBadge, top: '40px', background: '#F88000' }}>
                        FOR SALE
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.itemContent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={styles.itemTitle}>{item.title}</h3>
                      <button 
                        onClick={() => handleDelete(item.id, item.title)}
                        style={styles.deleteIconButton}
                        title="Delete Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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
                return (
                  <div key={order.id} style={styles.orderCard}>
                    <div style={styles.orderHeader}>
                      <img 
                        src={getSafeImageUrl(order.images)} 
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
                    {['confirmed', 'pending'].includes(order.status) && order.delivery_status === 'pending' && !order.rider_name && (
                      <div style={{ marginTop: '12px' }}>
                        <button
                          onClick={() => handleSearchRiders(order.id)}
                          style={{ ...styles.confirmButton, background: '#F88000', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', width: '100%' }}
                        >
                          🔍 Search for Riders
                        </button>
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', textAlign: 'center' }}>
                          Notify available riders about this delivery
                        </p>
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
                return (
                  <div key={request.id} style={styles.borrowCard}>
                    <div style={styles.borrowHeader}>
                      <img 
                        src={getSafeImageUrl(request.images)} 
                        alt={request.title}
                        style={styles.borrowImage}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                        }}
                      />
                      <div style={styles.borrowRequestInfo}>
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
    backgroundColor: '#EAF4FE'
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    backgroundColor: '#FFFFFF',
    color: '#1e293b',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
    backgroundColor: '#FFFFFF',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem'
  },
  tabs: {
    display: 'flex',
    marginBottom: '2rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  tab: {
    flex: 1,
    padding: '1rem 2rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    color: '#000000'
  },
  activeTab: {
    flex: 1,
    padding: '1rem 2rem',
    border: 'none',
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
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
    backgroundColor: '#FFFFFF',
    padding: '2rem',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '50px',
    fontSize: '1rem',
    backgroundColor: '#FFFFFF'
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '16px',
    minHeight: '100px',
    resize: 'vertical',
    fontSize: '1rem',
    backgroundColor: '#FFFFFF'
  },
  select: {
    padding: '0.75rem',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '50px',
    fontSize: '1rem',
    backgroundColor: '#FFFFFF'
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
    marginTop: '2rem'
  },
  typeSelector: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  typeBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  formGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  typeSelector: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  typeBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  formGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  submitButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
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
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
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
  dropzone: {
    width: '100%',
    height: '200px',
    border: '2px dashed #e2e8f0',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
    marginBottom: '15px',
    overflow: 'hidden',
    position: 'relative'
  },
  dropzonePlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginBottom: '8px'
  },
  dropzoneText: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b'
  },
  dropzoneSubtext: {
    fontSize: '12px',
    color: '#64748b'
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  changeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 10
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
    color: '#000000'
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
    color: '#F88000'
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
    backgroundColor: '#FFFFFF',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  orderCard: {
    border: '1px solid rgba(0, 0, 0, 0.05)',
    borderRadius: '16px',
    padding: '1.5rem',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
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
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  borrowsSection: {
    backgroundColor: '#FFFFFF',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  borrowsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  borrowCard: {
    border: '1px solid rgba(0, 0, 0, 0.05)',
    borderRadius: '16px',
    padding: '1.5rem',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
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
  borrowRequestInfo: {
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
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
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
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    color: '#000000',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
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
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    minWidth: '120px',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#F88000'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '0.5rem'
  }
};
