import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [riderRequests, setRiderRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, riderRequestsRes, usersRes, activitiesRes] = await Promise.all([
        axios.get('/admin/stats'),
        axios.get('/admin/rider-requests'),
        axios.get('/admin/users'),
        axios.get('/admin/activities')
      ]);
      
      setStats(statsRes.data);
      setRiderRequests(riderRequestsRes.data);
      setUsers(usersRes.data);
      setActivities(activitiesRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRiderRequest = async (requestId, status) => {
    try {
      const notes = status === 'rejected' ? window.prompt('Reason for rejection:') : '';
      await axios.put(`/admin/rider-requests/${requestId}`, {
        status,
        admin_notes: notes
      });
      
      if (status === 'approved') {
        alert('Rider approved successfully! The user can now login as a rider.');
      } else {
        alert('Rider request rejected. The user has been notified via email.');
      }
      
      fetchData();
    } catch (error) {
      alert(`Failed to ${status} rider request: ` + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      await axios.put(`/admin/users/${userId}/toggle-status`);
      alert('User status updated successfully!');
      fetchData();
    } catch (error) {
      alert('Failed to update user status: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading admin dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.full_name}! Manage the Campus Cart system</p>
      </div>

      <div style={styles.tabs}>
        <button 
          style={activeTab === 'overview' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          style={activeTab === 'riders' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('riders')}
        >
          Rider Requests ({riderRequests.filter(r => r.status === 'pending').length})
        </button>
        <button 
          style={activeTab === 'users' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </button>
        <button 
          style={activeTab === 'activities' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('activities')}
        >
          Activities
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <div>
          <h2>System Overview</h2>
          
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <h3>Total Users</h3>
              <p style={styles.statNumber}>{stats.users.total_users}</p>
              <div style={styles.statBreakdown}>
                <span>Buyers: {stats.users.buyers}</span>
                <span>Sellers: {stats.users.sellers}</span>
                <span>Riders: {stats.users.riders}</span>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <h3>Items</h3>
              <p style={styles.statNumber}>{stats.items.total_items}</p>
              <div style={styles.statBreakdown}>
                <span>Available: {stats.items.available_items}</span>
                <span>Borrowable: {stats.items.borrowable_items}</span>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <h3>Orders</h3>
              <p style={styles.statNumber}>{stats.orders.total_orders}</p>
              <div style={styles.statBreakdown}>
                <span>Completed: {stats.orders.completed_orders}</span>
                <span>Active: {stats.orders.active_orders}</span>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <h3>Borrows</h3>
              <p style={styles.statNumber}>{stats.borrows.total_borrows}</p>
              <div style={styles.statBreakdown}>
                <span>Completed: {stats.borrows.completed_borrows}</span>
                <span>Active: {stats.borrows.active_borrows}</span>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <h3>Deliveries</h3>
              <p style={styles.statNumber}>{stats.deliveries.total_deliveries}</p>
              <div style={styles.statBreakdown}>
                <span>Completed: {stats.deliveries.completed_deliveries}</span>
                <span>Pending: {stats.deliveries.pending_deliveries}</span>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <h3>Revenue</h3>
              <p style={styles.statNumber}>₹{stats.orders.total_revenue || 0}</p>
              <div style={styles.statBreakdown}>
                <span>Avg Price: ₹{parseFloat(stats.items.average_price || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={styles.recentActivities}>
            <h3>Recent Activities</h3>
            <div style={styles.activitiesList}>
              {activities.slice(0, 10).map((activity, index) => (
                <div key={index} style={styles.activityItem}>
                  <span style={styles.activityDescription}>{activity.description}</span>
                  <span style={styles.activityTime}>
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'riders' && (
        <div>
          <div style={styles.sectionHeader}>
            <h2>Rider Applications</h2>
            <div style={styles.statusFilters}>
              <button style={styles.filterButton}>All ({riderRequests.length})</button>
              <button style={styles.filterButton}>
                Pending ({riderRequests.filter(r => r.status === 'pending').length})
              </button>
              <button style={styles.filterButton}>
                Approved ({riderRequests.filter(r => r.status === 'approved').length})
              </button>
              <button style={styles.filterButton}>
                Rejected ({riderRequests.filter(r => r.status === 'rejected').length})
              </button>
            </div>
          </div>

          {riderRequests.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>No rider requests found</h3>
              <p>When users apply for rider roles, they will appear here for review.</p>
            </div>
          ) : (
            <div style={styles.requestsList}>
              {riderRequests.map(request => (
                <div key={request.id} style={{
                  ...styles.requestCard,
                  borderLeft: `4px solid ${
                    request.status === 'pending' ? '#f39c12' :
                    request.status === 'approved' ? '#27ae60' : '#e74c3c'
                  }`
                }}>
                  <div style={styles.requestHeader}>
                    <div>
                      <h3>{request.full_name}</h3>
                      <p style={styles.requestEmail}>{request.email}</p>
                    </div>
                    <span style={{
                      ...styles.requestStatus,
                      backgroundColor: 
                        request.status === 'pending' ? '#f39c12' :
                        request.status === 'approved' ? '#27ae60' : '#e74c3c'
                    }}>
                      {request.status}
                    </span>
                  </div>
                  
                  <div style={styles.requestDetails}>
                    <div style={styles.detailRow}>
                      <strong>Student ID:</strong> {request.student_id}
                    </div>
                    <div style={styles.detailRow}>
                      <strong>Phone:</strong> {request.phone || 'Not provided'}
                    </div>
                    <div style={styles.detailRow}>
                      <strong>License Number:</strong> {request.license_number}
                    </div>
                    <div style={styles.detailRow}>
                      <strong>Applied:</strong> {new Date(request.created_at).toLocaleDateString()}
                    </div>
                    
                    {request.license_image && (
                      <div style={styles.detailRow}>
                        <strong>License Image:</strong> 
                        <a href={request.license_image} target="_blank" rel="noopener noreferrer" style={styles.imageLink}>
                          View License Image
                        </a>
                      </div>
                    )}
                    
                    {request.admin_notes && (
                      <div style={styles.adminNotes}>
                        <strong>Admin Notes:</strong> {request.admin_notes}
                      </div>
                    )}

                    {request.reviewed_at && (
                      <div style={styles.detailRow}>
                        <strong>Reviewed:</strong> {new Date(request.reviewed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {request.status === 'pending' && (
                    <div style={styles.requestActions}>
                      <button 
                        onClick={() => handleRiderRequest(request.id, 'approved')}
                        style={styles.approveButton}
                      >
                        Approve Rider
                      </button>
                      <button 
                        onClick={() => handleRiderRequest(request.id, 'rejected')}
                        style={styles.rejectButton}
                      >
                        Reject Application
                      </button>
                    </div>
                  )}

                  {request.status !== 'pending' && (
                    <div style={styles.completedActions}>
                      <span style={styles.completedText}>
                        Application {request.status} on {new Date(request.reviewed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h2>User Management</h2>
          <div style={styles.usersList}>
            {users.map(user => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <h3>{user.full_name}</h3>
                  <div style={styles.userBadges}>
                    <span style={styles.roleBadge}>{user.role}</span>
                    <span style={user.is_active ? styles.activeBadge : styles.inactiveBadge}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div style={styles.userDetails}>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Student ID:</strong> {user.student_id}</p>
                  <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                  <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                  
                  <div style={styles.userStats}>
                    <span>Items: {user.items_listed}</span>
                    <span>Orders: {user.orders_made}</span>
                    <span>Deliveries: {user.deliveries_completed}</span>
                    <span>Rating: {parseFloat(user.average_rating || 0).toFixed(1)}/5</span>
                  </div>
                </div>
                
                <div style={styles.userActions}>
                  <button 
                    onClick={() => handleToggleUserStatus(user.id)}
                    style={user.is_active ? styles.deactivateButton : styles.activateButton}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div>
          <h2>System Activities</h2>
          <div style={styles.activitiesList}>
            {activities.map((activity, index) => (
              <div key={index} style={styles.activityItem}>
                <div style={styles.activityContent}>
                  <span style={styles.activityType}>{activity.type}</span>
                  <span style={styles.activityDescription}>{activity.description}</span>
                  <span style={styles.activityUser}>by {activity.user_name}</span>
                </div>
                <span style={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
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
    backgroundColor: '#e74c3c',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
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
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#e74c3c',
    margin: '0.5rem 0'
  },
  statBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.9rem',
    color: '#666'
  },
  recentActivities: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  activitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px'
  },
  activityContent: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  activityType: {
    backgroundColor: '#3498db',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem'
  },
  activityDescription: {
    flex: 1
  },
  activityUser: {
    color: '#666',
    fontSize: '0.9rem'
  },
  activityTime: {
    color: '#999',
    fontSize: '0.8rem'
  },
  requestsList: {
    display: 'grid',
    gap: '1rem'
  },
  requestCard: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  requestStatus: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: '#f39c12',
    color: '#fff'
  },
  requestDetails: {
    marginBottom: '1rem'
  },
  requestActions: {
    display: 'flex',
    gap: '0.5rem'
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
  usersList: {
    display: 'grid',
    gap: '1rem'
  },
  userCard: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  userHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  userBadges: {
    display: 'flex',
    gap: '0.5rem'
  },
  roleBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: '#3498db',
    color: '#fff'
  },
  activeBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    backgroundColor: '#27ae60',
    color: '#fff'
  },
  inactiveBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    backgroundColor: '#95a5a6',
    color: '#fff'
  },
  userDetails: {
    marginBottom: '1rem'
  },
  userStats: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
    fontSize: '0.9rem',
    color: '#666'
  },
  userActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  activateButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  deactivateButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  statusFilters: {
    display: 'flex',
    gap: '0.5rem'
  },
  filterButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ecf0f1',
    border: '1px solid #bdc3c7',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    color: '#666'
  },
  requestEmail: {
    color: '#666',
    fontSize: '0.9rem',
    margin: '0.25rem 0'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #ecf0f1'
  },
  imageLink: {
    color: '#3498db',
    textDecoration: 'none'
  },
  adminNotes: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '4px',
    marginTop: '1rem',
    fontStyle: 'italic'
  },
  completedActions: {
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    textAlign: 'center'
  },
  completedText: {
    color: '#666',
    fontSize: '0.9rem'
  }
};
