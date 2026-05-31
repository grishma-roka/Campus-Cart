import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { Handshake, Store, ClipboardList, Settings, MessageCircle, Package, User, Calendar, DollarSign, Trash2, CheckCircle, XCircle, Camera, AlertTriangle } from 'lucide-react';
import io from 'socket.io-client';

export default function BorrowPage() {
  const navigate = useNavigate();
  const { user, isSeller, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [sellerRequests, setSellerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // browse|my-requests|manage|chat
  const [showAddForm, setShowAddForm] = useState(false);
  const [requestModal, setRequestModal] = useState(null); // item to request
  const [chatTarget, setChatTarget] = useState(null); // { userId, userName, requestId, itemTitle }
  const backendUrl = 'https://campus-cart-on6p.onrender.com';

  const fetchAll = useCallback(async () => {
    try {
      const [itemsRes, myReqRes, sellerRes] = await Promise.all([
        axios.get('/borrow/items'),
        axios.get('/borrow/my-requests'),
        axios.get('/borrow/seller-requests')
      ]);
      setItems(itemsRes.data);
      setMyRequests(myReqRes.data);
      setSellerRequests(sellerRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div style={s.loading}>Loading...</div>;

  return (
    <div className="borrow-container" style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}>
            <Handshake size={32} color="#FFFFFF" strokeWidth={1.5} />
          </div>
          <div>
            <h1 style={s.title}>Borrow Instead of Buy</h1>
            <p style={s.subtitle}>Borrow items temporarily from fellow students</p>
          </div>
        </div>
        <button onClick={() => navigate('/add-borrow')} style={s.addBtn}>
          + Add Borrow Item
        </button>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { key: 'browse', icon: <Store size={16} strokeWidth={1.5} />, label: 'Browse Items', count: items.filter(item => item.transaction_type === 'borrow' || item.is_borrowable).length },
          { key: 'my-requests', icon: <ClipboardList size={16} strokeWidth={1.5} />, label: 'My Requests', count: myRequests.length },
          ...(sellerRequests.length > 0 ? [{ key: 'manage', icon: <Settings size={16} strokeWidth={1.5} />, label: 'Manage Requests', count: sellerRequests.filter(r => r.status === 'pending').length }] : []),
          { key: 'chat', icon: <MessageCircle size={16} strokeWidth={1.5} />, label: 'Chat' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={activeTab === t.key ? s.activeTab : s.tab}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && <span style={s.badge}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Browse */}
      {activeTab === 'browse' && (
        <BrowseTab
          items={items}
          userId={user?.id}
          isSeller={isSeller}
          onRequest={(item) => setRequestModal(item)}
          onRefresh={fetchAll}
        />
      )}

      {/* My Requests (buyer) */}
      {activeTab === 'my-requests' && (
        <MyRequestsTab
          requests={myRequests}
          onChat={(req) => { setChatTarget({ id: req.conversation_id, userName: req.seller_name, itemTitle: req.title }); setActiveTab('chat'); }}
        />
      )}

      {/* Manage Requests (item owner) */}
      {activeTab === 'manage' && (
        <ManageRequestsTab
          requests={sellerRequests}
          onRespond={async (id, status) => {
            try {
              await axios.put(`/borrow/respond/${id}`, { status });
              fetchAll();
            } catch (err) {
              console.error("Error updating request:", err);
              alert(err.response?.data?.error || "An error occurred while responding to the request.");
            }
          }}
          onStart={async (id) => {
            try {
              await axios.put(`/borrow/start/${id}`);
              fetchAll();
            } catch (err) {
              alert(err.response?.data?.error || 'Failed to start borrowing');
            }
          }}
          onComplete={async (id) => {
            try {
              await axios.put(`/borrow/complete/${id}`);
              alert('Borrowing marked as complete! Item is now available again and income recorded.');
              fetchAll();
            } catch (err) {
              alert(err.response?.data?.error || 'Failed to mark complete');
            }
          }}
          onChat={(req) => { setChatTarget({ id: req.conversation_id, userName: req.borrower_name, itemTitle: req.title }); setActiveTab('chat'); }}
        />
      )}

      {/* Chat */}
      {activeTab === 'chat' && (
        <ChatTab userId={user?.id} initialTarget={chatTarget} />
      )}

      {/* Add Item Modal is handled by navigation to /add-borrow now, but keeping for completeness if needed */}

      {/* Borrow Request Modal */}
      {requestModal && (
        <BorrowRequestModal
          item={requestModal}
          onClose={() => setRequestModal(null)}
          onSent={() => { setRequestModal(null); fetchAll(); setActiveTab('my-requests'); }}
        />
      )}
    </div>
  );
}

// ─── Browse Tab ────────────────────────────────────────────────────────────────
function BrowseTab({ items, userId, onRequest, onRefresh }) {
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this borrow item?')) return;
    try {
      await axios.delete(`/borrow/items/${id}`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const borrowItems = items.filter(item => item.transaction_type === 'borrow' || item.is_borrowable);

  if (borrowItems.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}><Package size={48} strokeWidth={1.5} color="#94a3b8" /></div>
        <p>No items available for borrowing yet.</p>
      </div>
    );
  }

  return (
    <div className="borrow-grid" style={s.grid}>
      {borrowItems.map(item => {
        const images = item.images ? (typeof item.images === 'string' ? JSON.parse(item.images) : item.images) : [];
        const img = images[0] || null;
        const isOwner = item.seller_id === userId;

        return (
          <div key={item.id} className="borrow-card" style={s.card}>
            <div style={s.cardImg}>
              {img
                ? <img src={img.startsWith('http') ? img : `https://campus-cart-on6p.onrender.com${img}`} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={s.cardImgPlaceholder}><Package size={32} color="#94a3b8" strokeWidth={1.5} /></div>
              }
              <div style={{ ...s.availBadge, background: item.is_available ? '#10b981' : '#ef4444' }}>
                {item.is_available ? 'Available' : 'Unavailable'}
              </div>
            </div>
            <div style={s.cardBody}>
              <h3 style={s.cardTitle}>{item.title}</h3>
              {item.description && <p style={s.cardDesc}>{item.description}</p>}
              <div style={s.cardMeta}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px'}}><User size={12} /> {item.owner_name}</span>
                {item.duration && <span style={{ display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={12} /> Up to {item.duration} days</span>}
                {item.deposit > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px'}}><DollarSign size={12} /> रू {item.deposit}/day deposit</span>}
              </div>
            </div>
            <div style={s.cardActions}>
              {isOwner ? (
                <button onClick={() => handleDelete(item.id)} style={s.dangerBtn}>Remove</button>
              ) : item.is_available ? (
                <button onClick={() => onRequest(item)} style={s.primaryBtn}>Borrow Request</button>
              ) : (
                <button disabled style={{ ...s.primaryBtn, opacity: 0.4, cursor: 'not-allowed' }}>Unavailable</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── My Requests Tab ───────────────────────────────────────────────────────────
function MyRequestsTab({ requests, onChat }) {
  const navigate = useNavigate();

  if (requests.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}><ClipboardList size={48} strokeWidth={1.5} color="#94a3b8" /></div>
        <p>You haven't made any borrow requests yet.</p>
      </div>
    );
  }

  return (
    <div style={s.listCol}>
      {requests.map(req => {
        const images = req.images ? (typeof req.images === 'string' ? JSON.parse(req.images) : req.images) : [];
        return (
          <div key={req.id} style={s.requestCard}>
            <div style={s.requestLeft}>
              {images[0]
                ? <img src={images[0].startsWith('http') ? images[0] : `https://campus-cart-on6p.onrender.com${images[0]}`} alt={req.title} style={s.requestThumb} />
                : <div style={{ ...s.requestThumb, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={24} color="#94a3b8" /></div>
              }
              <div>
                <div style={s.requestTitle}>{req.title}</div>
                <div style={s.requestMeta}>Owner: {req.seller_name}</div>
                <div style={s.requestMeta}>
                  {new Date(req.start_date).toLocaleDateString()} → {new Date(req.end_date).toLocaleDateString()}
                  &nbsp;·&nbsp; {req.total_days} days &nbsp;·&nbsp; रू {req.total_cost}
                </div>
              </div>
            </div>
            <div style={s.requestRight}>
              <span style={{ ...s.statusBadge, background: statusColor(req.status) }}>{displayStatus(req.status)}</span>
              {(req.status === 'approved' || req.status === 'active' || req.status === 'accepted') && (
                <button
                  onClick={() => req.conversation_id ? navigate(`/messages/${req.conversation_id}`) : onChat(req)}
                  style={s.chatBtn}
                >
                  <MessageCircle size={14} /> Chat
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Manage Requests Tab (Seller) ──────────────────────────────────────────────
function ManageRequestsTab({ requests, onRespond, onStart, onComplete, onChat }) {
  const navigate = useNavigate();

  if (requests.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}><Settings size={48} strokeWidth={1.5} color="#94a3b8" /></div>
        <p>No borrow requests yet.</p>
      </div>
    );
  }

  return (
    <div style={s.listCol}>
      {requests.map(req => (
        <div key={req.id} style={s.requestCard}>
          <div style={s.requestLeft}>
            <div>
              <div style={s.requestTitle}>{req.title}</div>
              <div style={s.requestMeta}>Borrower: {req.borrower_name}</div>
              <div style={s.requestMeta}>
                {new Date(req.start_date).toLocaleDateString()} → {new Date(req.end_date).toLocaleDateString()}
                &nbsp;·&nbsp; रू {req.total_cost}
              </div>
            </div>
          </div>
          <div style={s.requestRight}>
            <span style={{ ...s.statusBadge, background: statusColor(req.status) }}>{displayStatus(req.status)}</span>
            
            {req.status === 'pending' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => onRespond(req.id, 'accepted')} style={s.acceptBtn}>Accept</button>
                <button onClick={() => onRespond(req.id, 'rejected')} style={s.rejectBtn}>Reject</button>
              </div>
            )}

            {(req.status === 'accepted' || req.status === 'approved') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onStart(req.id)}
                    style={{ ...s.primaryBtn, padding: '6px 12px', fontSize: '12px' }}
                  >
                    Start Borrow (Handover)
                  </button>
                  <button
                    onClick={() => onComplete(req.id)}
                    style={s.completeBtn}
                  >
                    <CheckCircle size={14} /> Borrowing Complete
                  </button>
                </div>
                <button
                  onClick={() => req.conversation_id ? navigate(`/messages/${req.conversation_id}`) : onChat(req)}
                  style={s.chatBtn}
                >
                  <MessageCircle size={14} /> Chat
                </button>
              </div>
            )}

            {req.status === 'active' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <button
                  onClick={() => onComplete(req.id)}
                  style={s.completeBtn}
                >
                  <CheckCircle size={14} /> Borrowing Complete
                </button>
                <button
                  onClick={() => req.conversation_id ? navigate(`/messages/${req.conversation_id}`) : onChat(req)}
                  style={s.chatBtn}
                >
                  <MessageCircle size={14} /> Chat
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab({ userId, initialTarget }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(initialTarget || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const backendUrl = 'https://campus-cart-on6p.onrender.com';

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get('/chat/conversations');
      setConversations(res.data);
    } catch { /* silent */ }
  }, []);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const res = await axios.get(`/chat/messages/${conversationId}`);
      setMessages(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    socketRef.current = io('https://campus-cart-on6p.onrender.com');
    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    if (selected?.id) {
      socketRef.current.emit('join_conversation', selected.id);
      socketRef.current.on('receive_message', (msg) => {
        setMessages(prev => [...prev, msg]);
        fetchConversations();
      });
      fetchMessages(selected.id);
    }
    return () => {
      if (socketRef.current) socketRef.current.off('receive_message');
    };
  }, [selected, fetchMessages, fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if ((!text.trim() && !fileInputRef.current?.files[0]) || !selected) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('conversation_id', selected.id);
      if (text.trim()) {
        formData.append('message', text.trim());
        formData.append('message_type', 'text');
      }
      if (fileInputRef.current?.files[0]) {
        formData.append('image', fileInputRef.current.files[0]);
        formData.append('message_type', 'image');
      }
      await axios.post('/chat/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setText('');
      setPreviewImg(null);
      fetchMessages(selected.id);
      fetchConversations();
    } catch { /* silent */ } 
    finally { setSending(false); }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewImg(ev.target.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div style={s.chatLayout}>
      <div style={s.convList}>
        <div style={s.convHeader}>Conversations</div>
        {conversations.map(c => (
          <div key={c.id} onClick={() => setSelected({ id: c.id, userName: c.other_user_name, itemTitle: c.item_title })} style={{ ...s.convItem, background: selected?.id === c.id ? '#EAF4FE' : '#fff' }}>
            <div style={s.convAvatar}>{c.other_user_name?.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.convName}>{c.other_user_name}</div>
              <div style={s.convLast}>{c.last_message || 'Re: ' + c.item_title}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={s.msgPane}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select a conversation</div>
        ) : (
          <>
            <div style={s.msgHeader}><strong>{selected.userName}</strong> &nbsp; <span style={{fontSize: '12px', color: '#64748b'}}>{selected.itemTitle}</span></div>
            <div style={s.msgList}>
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_id === userId ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                  <div style={{ ...s.bubble, background: m.sender_id === userId ? '#F88000' : '#FFFFFF', color: m.sender_id === userId ? '#fff' : '#000' }}>
                    {m.image_url && <img src={`https://campus-cart-on6p.onrender.com${m.image_url}`} alt="Shared" style={{ maxWidth: '100%', borderRadius: '8px' }} />}
                    {m.message && <div>{m.message}</div>}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div style={s.msgInput}>
              <button onClick={() => fileInputRef.current?.click()} style={s.chatBtn}><Camera size={18} /></button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..." style={s.textInput} />
              <button onClick={sendMessage} style={s.sendBtn}>➤</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Borrow Request Modal ──────────────────────────────────────────────────────
function BorrowRequestModal({ item, onClose, onSent }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ start_date: today, end_date: '', message: '' });
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  let maxEndDate = '';
  if (form.start_date && item.duration) {
    const start = new Date(form.start_date);
    start.setDate(start.getDate() + parseInt(item.duration, 10));
    maxEndDate = start.toISOString().split('T')[0];
  }

  const handleEndDateChange = (e) => {
    const selectedDate = e.target.value;
    if (selectedDate && maxEndDate && selectedDate > maxEndDate) {
      setErrorMsg(`Maximum borrow duration is ${item.duration} days.`);
      set('end_date', '');
    } else {
      setErrorMsg('');
      set('end_date', selectedDate);
    }
  };

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    set('start_date', newStart);
    if (form.end_date) {
      let newMax = '';
      if (newStart && item.duration) {
        const start = new Date(newStart);
        start.setDate(start.getDate() + parseInt(item.duration, 10));
        newMax = start.toISOString().split('T')[0];
      }
      if (newMax && form.end_date > newMax) {
        set('end_date', '');
        setErrorMsg(`Maximum borrow duration is ${item.duration} days.`);
      } else if (newStart > form.end_date) {
         set('end_date', '');
         setErrorMsg('');
      } else {
         setErrorMsg('');
      }
    }
  };

  const totalDays = form.start_date && form.end_date
    ? Math.max(1, Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / 86400000))
    : 0;
  const totalCost = totalDays * (parseFloat(item.deposit) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.end_date) return alert('Please select an end date');
    setSending(true);
    try {
      await axios.post('/borrow/request', { item_id: item.id, ...form });
      onSent();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h3 style={s.modalTitle}>Borrow Request — {item.title}</h3>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Owner: {item.owner_name}</p>
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={s.label}>Start Date</label>
              <input type="date" required min={today} value={form.start_date} onChange={handleStartDateChange} style={s.input} />
            </div>
            <div>
              <label style={s.label}>End Date</label>
              <input type="date" required min={form.start_date || today} max={maxEndDate} value={form.end_date} onChange={handleEndDateChange} style={s.input} />
            </div>
          </div>
          {errorMsg && (
            <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={14} /> {errorMsg}
            </div>
          )}

          {totalDays > 0 && (
            <div style={{ background: '#EAF4FE', borderRadius: '12px', padding: '12px 16px', fontSize: '13px' }}>
              {totalDays} day{totalDays !== 1 ? 's' : ''}
              {totalCost > 0 ? ` · Deposit: रू ${totalCost}` : ' · No deposit required'}
            </div>
          )}

          <label style={s.label}>Message (optional)</label>
          <textarea value={form.message} onChange={e => set('message', e.target.value)} style={{ ...s.input, height: '72px' }} />

          <div style={s.modalActions}>
            <button type="submit" disabled={sending} style={s.primaryBtn}>{sending ? 'Sending...' : 'Send Request'}</button>
            <button type="button" onClick={onClose} style={s.ghostBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(st) {
  return { pending: '#f59e0b', approved: '#10b981', accepted: '#10b981', rejected: '#ef4444', active: '#3b82f6', returned: '#8b5cf6', overdue: '#ef4444' }[st] || '#94a3b8';
}

function displayStatus(st) {
  const map = { pending: 'Pending', approved: 'Accepted', accepted: 'Accepted', rejected: 'Rejected', active: 'Active', returned: 'Complete', overdue: 'Overdue' };
  return map[st] || st;
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '24px', backgroundColor: '#EAF4FE', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  loading: { textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: '#64748b' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerIcon: { width: '56px', height: '56px', background: '#F88000', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: '#000', margin: 0 },
  subtitle: { color: '#64748b', margin: '4px 0 0', fontSize: '14px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '10px 18px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' },
  activeTab: { padding: '10px 18px', border: 'none', borderRadius: '12px', background: '#F88000', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' },
  badge: { background: 'rgba(255,255,255,0.3)', borderRadius: '20px', padding: '1px 7px', fontSize: '11px', fontWeight: '700' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '16px' },
  card: { background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' },
  cardImg: { height: '180px', background: '#f1f5f9', position: 'relative' },
  cardImgPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  availBadge: { position: 'absolute', top: '10px', right: '10px', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' },
  cardBody: { padding: '16px', flex: 1 },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#000', margin: '0 0 6px' },
  cardDesc: { fontSize: '13px', color: '#64748b', margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardMeta: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#64748b' },
  cardActions: { padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.05)' },
  listCol: { display: 'flex', flexDirection: 'column', gap: '12px' },
  requestCard: { background: '#fff', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
  requestLeft: { display: 'flex', gap: '14px', alignItems: 'center', flex: 1 },
  requestThumb: { width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' },
  requestTitle: { fontSize: '15px', fontWeight: '700', color: '#000' },
  requestMeta: { fontSize: '12px', color: '#64748b' },
  requestRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  statusBadge: { color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#64748b' },
  emptyIcon: { marginBottom: '12px' },
  chatLayout: { display: 'flex', background: '#fff', borderRadius: '16px', overflow: 'hidden', height: '500px' },
  convList: { width: '240px', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column' },
  convHeader: { padding: '16px', fontWeight: '700', borderBottom: '1px solid #eee' },
  convItem: { padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' },
  convAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#F88000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' },
  convName: { fontSize: '13px', fontWeight: '600' },
  convLast: { fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  msgPane: { flex: 1, display: 'flex', flexDirection: 'column' },
  msgHeader: { padding: '14px 16px', borderBottom: '1px solid #eee' },
  msgList: { flex: 1, padding: '16px', overflowY: 'auto' },
  bubble: { maxWidth: '75%', padding: '10px 14px', borderRadius: '14px', fontSize: '13px' },
  msgInput: { padding: '12px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' },
  textInput: { flex: 1, border: '1px solid #eee', borderRadius: '10px', padding: '8px 12px', outline: 'none' },
  sendBtn: { background: '#F88000', color: '#fff', border: 'none', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' },
  modalTitle: { margin: '0 0 16px', fontSize: '18px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#64748b' },
  input: { padding: '10px', border: '1px solid #eee', borderRadius: '8px' },
  modalActions: { display: 'flex', gap: '8px', marginTop: '12px' },
  primaryBtn: { padding: '10px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' },
  ghostBtn: { padding: '10px', background: 'transparent', border: '1px solid #eee', borderRadius: '10px', cursor: 'pointer' },
  dangerBtn: { padding: '8px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  addBtn: { padding: '10px 18px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' },
  chatBtn: { padding: '6px 12px', background: '#EAF4FE', color: '#F88000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  acceptBtn: { padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  rejectBtn: { padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  completeBtn: { padding: '8px 14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' },
};
