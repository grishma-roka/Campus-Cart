import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { LogOut, User, Mail, Calendar, Hash, Edit3, Key, ChevronRight } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading Profile...</p>
      </div>
    );
  }

  const joinedDate = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not available';

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        {/* Section 1: Header (Avatar, Name, Email) */}
        <div style={styles.card}>
          <div style={styles.headerContent}>
            <div style={styles.avatar}>
              <User size={48} color="#FFFFFF" strokeWidth={1.5} />
            </div>
            <h1 style={styles.userName}>{user.full_name || user.name || 'User'}</h1>
            <p style={styles.userEmail}>{user.email}</p>
          </div>
        </div>

        {/* Section 2: Account Details (Joined At, Student ID) */}
        <div style={styles.sectionHeader}>ACCOUNT DETAILS</div>
        <div style={styles.card}>
          <div style={styles.detailRow}>
            <div style={styles.iconContainer}><User size={20} color="#64748b" /></div>
            <div style={styles.detailText}>
              <span style={styles.detailLabel}>Full Name</span>
              <span style={styles.detailValue}>{user.full_name}</span>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.detailRow}>
            <div style={styles.iconContainer}><Mail size={20} color="#64748b" /></div>
            <div style={styles.detailText}>
              <span style={styles.detailLabel}>Email Address</span>
              <span style={styles.detailValue}>{user.email}</span>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.detailRow}>
            <div style={styles.iconContainer}><Hash size={20} color="#64748b" /></div>
            <div style={styles.detailText}>
              <span style={styles.detailLabel}>Student ID</span>
              <span style={styles.detailValue}>{user.student_id || 'Not available'}</span>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.detailRow}>
            <div style={styles.iconContainer}><Calendar size={20} color="#64748b" /></div>
            <div style={styles.detailText}>
              <span style={styles.detailLabel}>Joined At</span>
              <span style={styles.detailValue}>{joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Actions (Edit Profile, Change Password) */}
        <div style={styles.sectionHeader}>ACTIONS</div>
        <div style={styles.actionGrid}>
          <button style={styles.ghostButton} onClick={() => alert('Editing profile coming soon!')}>
            <div style={styles.actionLeft}>
              <div style={styles.actionIconRing}><Edit3 size={18} /></div>
              <span>Edit Profile</span>
            </div>
            <ChevronRight size={16} opacity={0.5} />
          </button>
          
          <button style={styles.ghostButton} onClick={() => alert('Change password coming soon!')}>
            <div style={styles.actionLeft}>
              <div style={styles.actionIconRing}><Key size={18} /></div>
              <span>Change Password</span>
            </div>
            <ChevronRight size={16} opacity={0.5} />
          </button>
        </div>

        {/* Section 4: Danger Zone (Logout) */}
        <div style={{ marginTop: '40px' }}>
          <button onClick={handleLogout} style={styles.logoutButton}>
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>

        <p style={styles.footerText}>Campus Cart v2.1.2 • Secure Session</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '40px 20px 100px',
    backgroundColor: '#EAF4FE',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '500px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#EAF4FE',
  },
  loadingText: {
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '4px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  headerContent: {
    padding: '32px 20px',
    textAlign: 'center',
  },
  avatar: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    backgroundColor: '#F88000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 8px 24px rgba(248, 128, 0, 0.2)',
  },
  userName: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  userEmail: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
  sectionHeader: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: '1.2px',
    marginBottom: '10px',
    paddingLeft: '12px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    transition: 'background 0.2s ease',
  },
  iconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
    flexShrink: 0,
  },
  detailText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '0 20px',
  },
  actionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ghostButton: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
    borderRadius: '20px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  },
  actionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  actionIconRing: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: '#fff7ed',
    color: '#F88000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fee2e2',
    padding: '18px',
    borderRadius: '22px',
    width: '100%',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  footerText: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#cbd5e1',
    marginTop: '32px',
    fontWeight: '500',
  },
};