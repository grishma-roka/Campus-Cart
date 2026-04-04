import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { Check, X, Search, CreditCard, BarChart2, DollarSign, CheckCircle2, XCircle, Smartphone, UserCheck, UserX, Bot, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [riderRequests, setRiderRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Fetching admin data...');
      const [statsRes, riderRequestsRes, usersRes, activitiesRes] = await Promise.all([
        axios.get('/admin/stats'),
        axios.get('/admin/rider-requests'),
        axios.get('/admin/users'),
        axios.get('/admin/activities')
      ]);
      
      console.log('Rider requests:', riderRequestsRes.data);
      console.log('Stats:', statsRes.data);
      
      setStats(statsRes.data);
      setRiderRequests(riderRequestsRes.data);
      setUsers(usersRes.data);
      setActivities(activitiesRes.data);

      // Fetch transactions (may fail if no esewa payments yet)
      try {
        const txRes = await axios.get('/payment/transactions');
        setTransactions(txRes.data);
      } catch { /* silent if no transactions */ }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRiderRequest = async (requestId, status, requestName) => {
    try {
      let notes = '';
      if (status === 'rejected') {
        notes = window.prompt('Reason for rejection (optional):') || '';
      }
      
      console.log(`🔄 Processing ${status} for rider request ${requestId}`);
      
      // Show loading state
      const confirmMsg = status === 'approved' 
        ? `Are you sure you want to APPROVE ${requestName} as a rider?`
        : `Are you sure you want to REJECT ${requestName}'s rider application?`;
        
      if (!window.confirm(confirmMsg)) {
        return;
      }
      
      const response = await axios.put(`/admin/rider-requests/${requestId}`, {
        status,
        admin_notes: notes
      });
      
      console.log('✅ Rider request response:', response.data);
      
      if (status === 'approved') {
        alert(`🎉 SUCCESS!\n\n${requestName} has been approved as a rider!\n\n✅ User role updated to 'rider'\n📧 Approval email sent\n🚚 They can now accept delivery requests`);
      } else {
        alert(`❌ REJECTED\n\n${requestName}'s rider application has been rejected.\n\n📧 Rejection email sent with reason`);
      }
      
      // Refresh data to show updated status
      fetchData();
    } catch (error) {
      console.error('❌ Error processing rider request:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`❌ FAILED\n\nCould not ${status} rider request.\n\nError: ${errorMsg}\n\nPlease try again or check the console for details.`);
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
        <button
          style={{...(activeTab === 'transactions' ? styles.activeTab : styles.tab), display: 'flex', alignItems: 'center', gap: '6px'}}
          onClick={() => setActiveTab('transactions')}
        >
          <CreditCard size={18} /> Transactions ({transactions.length})
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
                    
                    {/* OCR Verification Section */}
                    {request.verification_status && (
                      <div style={styles.ocrSection}>
                        <div style={styles.ocrHeader}>
                          <strong style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Bot size={16}/> OCR Verification</strong>
                          <span style={{
                            ...styles.verificationBadge,
                            backgroundColor: 
                              request.verification_status === 'verified' ? '#27ae60' :
                              request.verification_status === 'expired' ? '#e74c3c' :
                              request.verification_status === 'needs_manual_review' ? '#f39c12' : '#95a5a6'
                          }}>
                            {request.verification_status}
                          </span>
                        </div>
                        
                        {request.extracted_license_number && (
                          <div style={styles.ocrDetailRow}>
                            <strong>Extracted License:</strong> {request.extracted_license_number}
                          </div>
                        )}
                        
                        {request.extracted_expiry_date && (
                          <div style={styles.ocrDetailRow}>
                            <strong>Extracted Expiry:</strong> {new Date(request.extracted_expiry_date).toLocaleDateString()}
                            {new Date(request.extracted_expiry_date) < new Date() && (
                              <span style={{...styles.expiredTag, display: 'inline-flex', alignItems: 'center', gap: '4px'}}> <AlertTriangle size={14}/> EXPIRED</span>
                            )}
                          </div>
                        )}
                        
                        {request.ocr_confidence && (
                          <div style={styles.ocrDetailRow}>
                            <strong>OCR Confidence:</strong> {request.ocr_confidence}%
                          </div>
                        )}
                        
                        {request.rejection_reason && (
                          <div style={{...styles.rejectionReason, display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <strong><AlertTriangle size={14}/> Reason:</strong> {request.rejection_reason}
                          </div>
                        )}
                        
                        {request.auto_rejected && (
                          <div style={{...styles.autoRejectedTag, display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <Bot size={14}/> Automatically Rejected by System
                          </div>
                        )}
                      </div>
                    )}
                    
                    {request.license_image && request.license_image !== 'pending_upload' && (
                      <div style={styles.licenseImageSection}>
                        <strong>License Image:</strong>
                        <div style={styles.licenseImageContainer}>
                          <img 
                            src={`http://localhost:5000${request.license_image}`} 
                            alt="License" 
                            style={styles.licenseImage}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div style={{...styles.imageError, display: 'none'}}>
                            Image not available
                          </div>
                          <a 
                            href={`http://localhost:5000${request.license_image}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{...styles.viewFullImageLink, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center'}}
                          >
                            <Search size={14} /> View Full Size
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {(!request.license_image || request.license_image === 'pending_upload') && (
                      <div style={styles.detailRow}>
                        <strong>License Image:</strong> <span style={styles.pendingText}>Pending upload</span>
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
                        onClick={() => handleRiderRequest(request.id, 'approved', request.full_name)}
                        style={{...styles.approveButton, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}
                      >
                        <Check size={16} /> Approve Rider
                      </button>
                      <button 
                        onClick={() => handleRiderRequest(request.id, 'rejected', request.full_name)}
                        style={{...styles.rejectButton, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}
                      >
                        <X size={16} /> Reject Application
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

      {activeTab === 'transactions' && (
        <div>
          <h2 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><CreditCard size={28} /> eSewa Transactions</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
            Platform income from online payments
          </p>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
              No eSewa transactions yet.
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Total Transactions', value: transactions.length, icon: <BarChart2 size={24} color="#64748b" /> },
                  { label: 'Total Income', value: `रू ${transactions.filter(t => t.status === 'success').reduce((s, t) => s + parseFloat(t.amount), 0).toLocaleString()}`, icon: <DollarSign size={24} color="#F88000" /> },
                  { label: 'Successful', value: transactions.filter(t => t.status === 'success').length, icon: <CheckCircle2 size={24} color="#10b981" /> },
                  { label: 'Failed', value: transactions.filter(t => t.status === 'failed').length, icon: <XCircle size={24} color="#ef4444" /> },
                ].map(c => (
                  <div key={c.label} style={{ background: '#fff', borderRadius: '14px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{c.icon}</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#F88000' }}>{c.value}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                      {['Order ID', 'Buyer', 'Item', 'Amount', 'Method', 'Transaction ID', 'Date', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600' }}>#{t.order_id}</td>
                        <td style={{ padding: '12px 16px' }}>{t.buyer_name}</td>
                        <td style={{ padding: '12px 16px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.item_title}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#10b981' }}>रू {parseFloat(t.amount).toLocaleString()}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                            <Smartphone size={12} /> {t.payment_method}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.transaction_id}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: t.status === 'success' ? '#d1fae5' : t.status === 'failed' ? '#fee2e2' : '#fef3c7',
                            color: t.status === 'success' ? '#065f46' : t.status === 'failed' ? '#991b1b' : '#92400e',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'capitalize'
                          }}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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
    padding: '2rem',
    backgroundColor: '#EAF4FE',
    minHeight: '100vh'
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
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#F88000',
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
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
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
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
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
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600'
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
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
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
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    color: '#000000',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
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
  licenseImageSection: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  },
  licenseImageContainer: {
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  licenseImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '2px solid #dee2e6',
    backgroundColor: '#fff'
  },
  viewFullImageLink: {
    color: '#3498db',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  imageError: {
    color: '#e74c3c',
    fontSize: '0.9rem',
    fontStyle: 'italic'
  },
  pendingText: {
    color: '#f39c12',
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
  },
  // OCR Verification Styles
  ocrSection: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '2px solid #e9ecef'
  },
  ocrHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #dee2e6'
  },
  verificationBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  ocrDetailRow: {
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    color: '#495057'
  },
  expiredTag: {
    color: '#e74c3c',
    fontWeight: '700',
    marginLeft: '0.5rem'
  },
  rejectionReason: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    color: '#856404',
    fontSize: '0.9rem'
  },
  autoRejectedTag: {
    marginTop: '0.75rem',
    padding: '0.5rem',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    color: '#721c24',
    fontSize: '0.85rem',
    fontWeight: '600',
    textAlign: 'center'
  }
};
