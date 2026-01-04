import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function RiderDashboard() {
  const { user, updateUserRole } = useAuth();
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [riderStatus, setRiderStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [showRiderRequest, setShowRiderRequest] = useState(false);
  const [riderRequest, setRiderRequest] = useState({
    license_number: '',
    license_image: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Check rider status first
      const statusRes = await axios.get('/rider/status');
      setRiderStatus(statusRes.data);

      if (user?.role === 'rider') {
        // If user is already a rider, fetch rider data
        const [availableRes, myDeliveriesRes, statsRes] = await Promise.all([
          axios.get('/delivery/available'),
          axios.get('/delivery/my-deliveries'),
          axios.get('/rider/stats')
        ]);
        
        setAvailableDeliveries(availableRes.data);
        setMyDeliveries(myDeliveriesRes.data);
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRiderRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/rider/request', riderRequest);
      alert('Rider request submitted successfully! You will be notified once approved.');
      setShowRiderRequest(false);
      fetchData();
    } catch (error) {
      alert('Failed to submit rider request: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAcceptDelivery = async (deliveryId) => {
    try {
      await axios.put(`/delivery/accept/${deliveryId}`);
      alert('Delivery accepted successfully!');
      fetchData();
    } catch (error) {
      alert('Failed to accept delivery: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleUpdateDeliveryStatus = async (deliveryId, status) => {
    try {
      const notes = window.prompt('Add any notes (optional):');
      await axios.put(`/delivery/status/${deliveryId}`, {
        status,
        notes
      });
      alert(`Delivery marked as ${status} successfully!`);
      fetchData();
    } catch (error) {
      alert(`Failed to update delivery status: ` + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  // If user is not a rider and hasn't applied
  if (user?.role !== 'rider' && (!riderStatus || riderStatus.status === 'none')) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>Become a Rider</h1>
          <p>Apply to become a delivery rider and start earning!</p>
        </div>

        <div style={styles.applySection}>
          <h2>Rider Application</h2>
          <p>To become a rider, you need to provide your license information for verification.</p>
          
          <button 
            onClick={() => setShowRiderRequest(true)}
            style={styles.applyButton}
          >
            Apply to Become a Rider
          </button>

          {showRiderRequest && (
            <div style={styles.modal}>
              <div style={styles.modalContent}>
                <h3>Rider Application</h3>
                <form onSubmit={handleRiderRequest} style={styles.form}>
                  <input
                    type="text"
                    placeholder="License Number"
                    value={riderRequest.license_number}
                    onChange={(e) => setRiderRequest({...riderRequest, license_number: e.target.value})}
                    required
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="License Image URL (optional)"
                    value={riderRequest.license_image}
                    onChange={(e) => setRiderRequest({...riderRequest, license_image: e.target.value})}
                    style={styles.input}
                  />
                  
                  <div style={styles.modalActions}>
                    <button type="submit" style={styles.submitButton}>Submit Application</button>
                    <button 
                      type="button" 
                      onClick={() => setShowRiderRequest(false)}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If user has applied but not approved yet
  if (user?.role !== 'rider' && riderStatus?.status === 'pending') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>Rider Application Pending</h1>
          <p>Your rider application is under review.</p>
        </div>

        <div style={styles.statusCard}>
          <h3>Application Status: Pending</h3>
          <p>License Number: {riderStatus.license_number}</p>
          <p>Submitted: {new Date(riderStatus.created_at).toLocaleDateString()}</p>
          <p>Please wait for admin approval. You will be notified via email once your application is processed.</p>
        </div>
      </div>
    );
  }

  // If application was rejected
  if (user?.role !== 'rider' && riderStatus?.status === 'rejected') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>Rider Application Rejected</h1>
          <p>Unfortunately, your rider application was not approved.</p>
        </div>

        <div style={styles.statusCard}>
          <h3>Application Status: Rejected</h3>
          <p>License Number: {riderStatus.license_number}</p>
          <p>Reviewed: {new Date(riderStatus.reviewed_at).toLocaleDateString()}</p>
          {riderStatus.admin_notes && <p>Notes: {riderStatus.admin_notes}</p>}
          <p>You can contact support for more information or reapply with updated information.</p>
        </div>
      </div>
    );
  }

  // If user is approved rider, show rider dashboard
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Rider Dashboard</h1>
        <p>Welcome, {user?.full_name}! Manage your deliveries and earnings</p>
      </div>

      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>Total Deliveries</h3>
            <p style={styles.statNumber}>{stats.deliveries.total_deliveries}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Completed</h3>
            <p style={styles.statNumber}>{stats.deliveries.completed_deliveries}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Active</h3>
            <p style={styles.statNumber}>{stats.deliveries.active_deliveries}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Total Earnings</h3>
            <p style={styles.statNumber}>₹{stats.deliveries.total_earnings || 0}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Rating</h3>
            <p style={styles.statNumber}>
              {stats.ratings.average_rating ? `${parseFloat(stats.ratings.average_rating).toFixed(1)}/5` : 'N/A'}
            </p>
          </div>
        </div>
      )}

      <div style={styles.tabs}>
        <button 
          style={activeTab === 'available' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('available')}
        >
          Available Deliveries ({availableDeliveries.length})
        </button>
        <button 
          style={activeTab === 'my-deliveries' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('my-deliveries')}
        >
          My Deliveries ({myDeliveries.length})
        </button>
      </div>

      {activeTab === 'available' && (
        <div>
          <h2>Available Deliveries</h2>
          {availableDeliveries.length === 0 ? (
            <p>No available deliveries at the moment.</p>
          ) : (
            <div style={styles.deliveriesList}>
              {availableDeliveries.map(delivery => (
                <div key={delivery.id} style={styles.deliveryCard}>
                  <h3>{delivery.item_title}</h3>
                  <p>Buyer: {delivery.buyer_name} ({delivery.buyer_phone})</p>
                  <p>Delivery Address: {delivery.delivery_address}</p>
                  <p>Order Amount: ₹{delivery.total_amount}</p>
                  <p>Delivery Fee: ₹{delivery.delivery_fee}</p>
                  <p>Posted: {new Date(delivery.created_at).toLocaleDateString()}</p>
                  
                  <button 
                    onClick={() => handleAcceptDelivery(delivery.id)}
                    style={styles.acceptButton}
                  >
                    Accept Delivery
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'my-deliveries' && (
        <div>
          <h2>My Deliveries</h2>
          {myDeliveries.length === 0 ? (
            <p>No deliveries assigned yet.</p>
          ) : (
            <div style={styles.deliveriesList}>
              {myDeliveries.map(delivery => (
                <div key={delivery.id} style={styles.deliveryCard}>
                  <h3>{delivery.item_title}</h3>
                  <p>Buyer: {delivery.buyer_name} ({delivery.buyer_phone})</p>
                  <p>Seller: {delivery.seller_name} ({delivery.seller_phone})</p>
                  <p>Pickup: {delivery.pickup_address}</p>
                  <p>Delivery: {delivery.delivery_address}</p>
                  <p>Status: <span style={styles.status}>{delivery.status}</span></p>
                  <p>Fee: ₹{delivery.delivery_fee}</p>
                  
                  {delivery.pickup_time && (
                    <p>Picked up: {new Date(delivery.pickup_time).toLocaleString()}</p>
                  )}
                  {delivery.delivery_time && (
                    <p>Delivered: {new Date(delivery.delivery_time).toLocaleString()}</p>
                  )}
                  {delivery.notes && <p>Notes: {delivery.notes}</p>}
                  
                  <div style={styles.deliveryActions}>
                    {delivery.status === 'assigned' && (
                      <button 
                        onClick={() => handleUpdateDeliveryStatus(delivery.id, 'picked_up')}
                        style={styles.pickupButton}
                      >
                        Mark as Picked Up
                      </button>
                    )}
                    {delivery.status === 'picked_up' && (
                      <button 
                        onClick={() => handleUpdateDeliveryStatus(delivery.id, 'delivered')}
                        style={styles.deliverButton}
                      >
                        Mark as Delivered
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
  applySection: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  applyButton: {
    padding: '1rem 2rem',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1.1rem'
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#3498db',
    margin: '0.5rem 0'
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
  deliveriesList: {
    display: 'grid',
    gap: '1rem'
  },
  deliveryCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1.5rem',
    backgroundColor: '#fff'
  },
  deliveryActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem'
  },
  acceptButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  pickupButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f39c12',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  deliverButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  status: {
    fontWeight: 'bold',
    textTransform: 'capitalize'
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
    maxWidth: '500px'
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
  }
};
