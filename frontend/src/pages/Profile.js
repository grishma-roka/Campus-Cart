import { User, Mail, Phone, Hash, Shield, LogOut, ChevronRight, Store, Bike, CheckCircle } from 'lucide-react';

export default function Profile() {
  const { user, isSeller, isRider, becomeSeller, logout } = useAuth();  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    student_id: '',
    phone: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/auth/me');
      setProfile(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/auth/profile', {
        full_name: profile.full_name,
        phone: profile.phone
      });
      setMessage('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update profile: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      window.location.href = '/login';
    }
  };

  const handleSellerApply = async () => {
    const result = await becomeSeller();
    if (result.success) {
      alert('Congratulations! You are now a seller.');
      window.location.reload();
    } else {
      alert(result.error || 'Failed to become a seller');
    }
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      {/* Profile Header Card */}
      <div style={styles.profileHeaderCard}>
        <div style={styles.avatarLarge}>
          {profile.full_name?.charAt(0).toUpperCase()}
        </div>
        <h2 style={styles.userName}>{profile.full_name}</h2>
        <p style={styles.userEmail}>{profile.email}</p>
        <div style={styles.roleBadges}>
          <span style={styles.badge}>Buyer</span>
          {isSeller && <span style={{ ...styles.badge, backgroundColor: '#10b981' }}>Seller</span>}
          {isRider && <span style={{ ...styles.badge, backgroundColor: '#f59e0b' }}>Rider</span>}
        </div>
      </div>

      {/* Account Info Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Account Information</h3>
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <div style={styles.infoIcon}><User size={20} /></div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Full Name</div>
              <div style={styles.infoValue}>{profile.full_name}</div>
            </div>
            <button onClick={() => setEditing(true)} style={styles.inlineEditBtn}>Edit</button>
          </div>
          <div style={styles.divider} />
          <div style={styles.infoRow}>
            <div style={styles.infoIcon}><Phone size={20} /></div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Phone Number</div>
              <div style={styles.infoValue}>{profile.phone || 'Not provided'}</div>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.infoRow}>
            <div style={styles.infoIcon}><Hash size={20} /></div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Student ID</div>
              <div style={styles.infoValue}>{profile.student_id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Additive Role Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Roles & Permissions</h3>
        <div style={styles.actionGrid}>
          {!isSeller && (
            <button onClick={handleSellerApply} style={styles.actionCard}>
              <div style={{ ...styles.actionIcon, backgroundColor: '#f0fdf4', color: '#10b981' }}><Store size={24} /></div>
              <div style={styles.actionText}>
                <div style={styles.actionTitle}>Become a Seller</div>
                <p style={styles.actionDesc}>List and sell your items</p>
              </div>
              <ChevronRight size={20} color="#cbd5e1" />
            </button>
          )}
          {!isRider && (
            <button onClick={() => window.location.href = '/dashboard?mode=rider'} style={styles.actionCard}>
              <div style={{ ...styles.actionIcon, backgroundColor: '#fffbeb', color: '#f59e0b' }}><Bike size={24} /></div>
              <div style={styles.actionText}>
                <div style={styles.actionTitle}>Apply for Rider</div>
                <p style={styles.actionDesc}>Earn money delivering items</p>
              </div>
              <ChevronRight size={20} color="#cbd5e1" />
            </button>
          )}
          {(isSeller || isRider) && (
            <div style={styles.actionGrid}>
              {isSeller && (
                <div style={{ ...styles.actionCard, opacity: 0.8, cursor: 'default' }}>
                  <div style={{ ...styles.actionIcon, backgroundColor: '#f0fdf4', color: '#10b981' }}><CheckCircle size={24} /></div>
                  <div style={styles.actionText}>
                    <div style={styles.actionTitle}>Verified Seller</div>
                    <p style={styles.actionDesc}>Access My Store in navigation</p>
                  </div>
                </div>
              )}
              {isRider && (
                <div style={{ ...styles.actionCard, opacity: 0.8, cursor: 'default' }}>
                  <div style={{ ...styles.actionIcon, backgroundColor: '#fffbeb', color: '#f59e0b' }}><CheckCircle size={24} /></div>
                  <div style={styles.actionText}>
                    <div style={styles.actionTitle}>Professional Rider</div>
                    <p style={styles.actionDesc}>Access Deliveries in navigation</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Account Control */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Account Control</h3>
        <div style={styles.actionGrid}>
          <button 
            onClick={logout} 
            style={{ ...styles.actionCard, border: '1px solid #fee2e2' }}
          >
            <div style={{ ...styles.actionIcon, backgroundColor: '#fee2e2', color: '#ef4444' }}>
              <LogOut size={24} />
            </div>
            <div style={styles.actionText}>
              <div style={{ ...styles.actionTitle, color: '#ef4444' }}>Log Out</div>
              <p style={styles.actionDesc}>Exit your account securely</p>
            </div>
            <ChevronRight size={20} color="#fecaca" />
          </button>
        </div>
      </div>

      <p style={{ ...styles.versionText, marginTop: '24px' }}>Campus Cart v2.1.0 • Modern Mobile Layout</p>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 16px 100px', // Extra bottom padding for BottomNav
    backgroundColor: '#EAF4FE',
    minHeight: '100vh'
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '32px 24px',
    textAlign: 'center',
    marginBottom: '24px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  avatarLarge: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: '800',
    margin: '0 auto 16px',
    boxShadow: '0 8px 20px rgba(248, 128, 0, 0.2)'
  },
  userName: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 4px 0'
  },
  userEmail: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px'
  },
  roleBadges: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: '#3b82f6',
    color: '#FFFFFF'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px',
    paddingLeft: '8px'
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '8px 16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 0',
    gap: '16px'
  },
  infoIcon: {
    color: '#64748b',
    flexShrink: 0
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  infoValue: {
    fontSize: '15px',
    color: '#1e293b',
    fontWeight: '600'
  },
  divider: {
    height: '1px',
    backgroundColor: '#f1f5f9'
  },
  inlineEditBtn: {
    background: '#f8fafc',
    border: 'none',
    color: '#3b82f6',
    fontSize: '13px',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  actionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    border: 'none',
    borderRadius: '20px',
    padding: '16px',
    gap: '16px',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
    width: '100%'
  },
  actionIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  actionText: {
    flex: 1
  },
  actionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b'
  },
  actionDesc: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '18px',
    backgroundColor: '#fee2e2',
    color: '#ef4444',
    border: 'none',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  versionText: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '16px'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#64748b'
  }
};