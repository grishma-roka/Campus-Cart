import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { Camera, Handshake, ArrowLeft } from 'lucide-react';

export default function AddBorrowItem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    duration: 7, 
    deposit: '', 
    location: '', 
    is_available: true 
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('duration', form.duration);
      formData.append('deposit', form.deposit);
      formData.append('location', form.location);
      formData.append('is_available', form.is_available);
      formData.append('transaction_type', 'borrow');
      
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await axios.post('/borrow/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Borrow item added successfully!');
      navigate('/borrow');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.container}>
      <button onClick={() => navigate('/borrow')} style={s.backBtn}>
        <ArrowLeft size={18} /> Back to Borrowing
      </button>

      <div style={s.card}>
        <div style={s.header}>
          <div style={s.headerIcon}>
            <Handshake size={24} color="#FFFFFF" strokeWidth={1.5} />
          </div>
          <h1 style={s.title}>Add Borrow Item</h1>
        </div>

        <p style={s.subtitle}>List an item that others can borrow temporarily.</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGroup}>
            <label style={s.label}>Item Name *</label>
            <input 
              required 
              value={form.title} 
              onChange={e => set('title', e.target.value)} 
              style={s.input} 
              placeholder="e.g. Scientific Calculator" 
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Description</label>
            <textarea 
              value={form.description} 
              onChange={e => set('description', e.target.value)} 
              style={{ ...s.input, height: '100px', resize: 'vertical', borderRadius: '16px' }} 
              placeholder="Describe the item condition, rules, or details..." 
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Item Image</label>
            <div 
              style={s.dropzone}
              onClick={() => document.getElementById('borrow_image').click()}
            >
              <input 
                type="file" 
                id="borrow_image"
                accept="image/*" 
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
              {previewUrl ? (
                <div style={s.previewContainer}>
                  <img src={previewUrl} alt="Preview" style={s.previewImage} />
                  <div style={s.changeOverlay}>
                    <Camera size={24} color="#fff" />
                    <span style={{color: '#fff', fontSize: '13px', fontWeight: 'bold'}}>Change Photo</span>
                  </div>
                </div>
              ) : (
                <div style={s.dropzonePlaceholder}>
                  <div style={s.iconCircle}>
                    <Camera size={28} color="#F88000" />
                  </div>
                  <span style={s.dropzoneText}>Upload Photo</span>
                  <span style={s.dropzoneSubtext}>Max 5MB</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={s.formGroup}>
              <label style={s.label}>Max Duration (days)</label>
              <input 
                type="number" 
                min="1" 
                value={form.duration} 
                onChange={e => set('duration', e.target.value)} 
                style={s.input} 
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Deposit per day (रू, optional)</label>
              <input 
                type="number" 
                min="0" 
                value={form.deposit} 
                onChange={e => set('deposit', e.target.value)} 
                style={s.input} 
                placeholder="0" 
              />
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Pickup Location</label>
            <input 
              value={form.location} 
              onChange={e => set('location', e.target.value)} 
              style={s.input} 
              placeholder="e.g. Block A, Room 201" 
            />
          </div>

          <div style={s.actions}>
            <button type="submit" disabled={saving} style={s.submitBtn}>
              {saving ? 'Adding...' : 'Add for Borrow'}
            </button>
            <button type="button" onClick={() => navigate('/borrow')} style={s.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  container: {
    maxWidth: '700px',
    margin: '40px auto',
    padding: '0 20px',
    paddingBottom: '80px'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
    padding: '8px 0',
    transition: 'all 0.2s ease'
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.03)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px'
  },
  headerIcon: {
    background: '#F88000',
    padding: '12px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(248, 128, 0, 0.2)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1e293b',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  subtitle: {
    color: '#64748b',
    fontSize: '15px',
    marginBottom: '32px',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: '4px'
  },
  input: {
    padding: '14px 20px',
    backgroundColor: '#f8fafc',
    border: '2px solid transparent',
    borderRadius: '50px',
    fontSize: '15px',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  dropzone: {
    width: '100%',
    height: '240px',
    border: '2px dashed #e2e8f0',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
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
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginBottom: '8px'
  },
  dropzoneText: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b'
  },
  dropzoneSubtext: {
    fontSize: '13px',
    color: '#94a3b8'
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
    opacity: 1
  },
  actions: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px'
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '750',
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(248, 128, 0, 0.25)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
