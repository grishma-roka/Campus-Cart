import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function Profile() {
  const { user } = useAuth(); // eslint-disable-line no-unused-vars
  const [profile, setProfile] = useState({
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

  if (loading) {
    return <div style={styles.loading}>Loading profile...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      {message && (
        <div style={message.includes('success') ? styles.success : styles.error}>
          {message}
        </div>
      )}

      <div style={styles.profileCard}>
        <div style={styles.profileHeader}>
          <div style={styles.avatar}>
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={styles.userInfo}>
            <h2>{profile.full_name}</h2>
            <span style={styles.roleBadge}>{profile.role}</span>
          </div>
          <button 
            onClick={() => setEditing(!editing)}
            style={styles.editButton}
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div style={styles.profileBody}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full Name</label>
            {editing ? (
              <input
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                style={styles.input}
              />
            ) : (
              <div style={styles.value}>{profile.full_name}</div>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.value}>{profile.email}</div>
            <small style={styles.note}>Email cannot be changed</small>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Student ID</label>
            <div style={styles.value}>{profile.student_id}</div>
            <small style={styles.note}>Student ID cannot be changed</small>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Phone Number</label>
            {editing ? (
              <input
                name="phone"
                value={profile.phone || ''}
                onChange={handleChange}
                placeholder="Enter your phone number"
                style={styles.input}
              />
            ) : (
              <div style={styles.value}>{profile.phone || 'Not provided'}</div>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Role</label>
            <div style={styles.value}>{profile.role}</div>
            <small style={styles.note}>
              {profile.role === 'buyer' && 'You can browse and purchase items'}
              {profile.role === 'seller' && 'You can list and sell items'}
              {profile.role === 'rider' && 'You can accept delivery requests'}
              {profile.role === 'admin' && 'You have full system access'}
            </small>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Member Since</label>
            <div style={styles.value}>
              {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>

          {editing && (
            <div style={styles.actions}>
              <button 
                onClick={handleSave}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
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
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '2rem',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6'
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#3498db',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    marginRight: '1.5rem'
  },
  userInfo: {
    flex: 1
  },
  roleBadge: {
    backgroundColor: '#3498db',
    color: '#fff',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  editButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  profileBody: {
    padding: '2rem'
  },
  fieldGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '0.5rem'
  },
  value: {
    fontSize: '1rem',
    color: '#555',
    padding: '0.75rem 0'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  note: {
    fontSize: '0.8rem',
    color: '#666',
    fontStyle: 'italic'
  },
  actions: {
    marginTop: '2rem',
    textAlign: 'center'
  },
  saveButton: {
    padding: '0.75rem 2rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem'
  }
};