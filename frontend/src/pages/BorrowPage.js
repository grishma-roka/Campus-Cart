import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function BorrowPage() {
  const { user, isSeller } = useAuth();
  const [items, setItems] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [sellerRequests, setSellerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // browse|my-requests|manage|chat
  const [showAddForm, setShowAddForm] = useState(false);
  const [requestModal, setRequestModal] = useState(null); // item to request
  const [chatTarget, setChatTarget] = useState(null); // { userId, userName, requestId, itemTitle }

  const fetchAll = useCallback(async () => {
    try {
      const [itemsRes, myReqRes] = await Promise.all([
        axios.get('/borrow/items'),
        axios.get('/borrow/my-requests'),
      ]);
      setItems(itemsRes.data);
      setMyRequests(myReqRes.data);

      if (isSeller) {
        const sellerRes = await axios.get('/borrow/seller-requests');
        setSellerRequests(sellerRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isSeller]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div style={s.loading}>Loading...</div>;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}>🤝</div>
          <div>
            <h1 style={s.title}>Borrow Instead of Buy</h1>
            <p style={s.subtitle}>Borrow items temporarily from fellow students</p>
          </div>
        </div>
        {isSeller && (
          <button onClick={() => setShowAddForm(true)} style={s.addBtn}>
            + Add Borrow Item
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { key: 'browse', label: '🏪 Browse Items', count: items.length },
          { key: 'my-requests', label: '📋 My Requests', count: myRequests.length },
          ...(isSeller ? [{ key: 'manage', label: '⚙️ Manage Requests', count: sellerRequests.filter(r => r.status === 'pending').length }] : []),
          { key: 'chat', label: '💬 Chat' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={activeTab === t.key ? s.activeTab : s.tab}
          >
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
          onChat={(req) => { setChatTarget({ userId: req.seller_id, userName: req.seller_name, requestId: req.id, itemTitle: req.title }); setActiveTab('chat'); }}
        />
      )}

      {/* Manage Requests (seller) */}
      {activeTab === 'manage' && isSeller && (
        <ManageRequestsTab
          requests={sellerRequests}
          onRespond={async (id, status) => {
            await axios.put(`/borrow/respond/${id}`, { status });
            fetchAll();
          }}
          onChat={(req) => { setChatTarget({ userId: req.borrower_id, userName: req.borrower_name, requestId: req.id, itemTitle: req.title }); setActiveTab('chat'); }}
        />
      )}

      {/* Chat */}
      {activeTab === 'chat' && (
        <ChatTab userId={user?.id} initialTarget={chatTarget} />
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <AddItemModal
          onClose={() => setShowAddForm(false)}
          onSaved={() => { setShowAddForm(false); fetchAll(); }}
        />
      )}

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
function BrowseTab({ items, userId, isSeller, onRequest, onRefresh }) {
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this borrow item?')) return;
    try {
      await axios.delete(`/borrow/items/${id}`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (items.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}>📦</div>
        <p>No items available for borrowing yet.</p>
        {isSeller && <p style={{ color: '#94a3b8', fontSize: '13px' }}>Add the first borrow item using the button above.</p>}
      </div>
    );
  }

  return (
    <div style={s.grid}>
      {items.map(item => {
        const images = item.images ? (typeof item.images === 'string' ? JSON.parse(item.images) : item.images) : [];
        const img = images[0] || null;
        const isOwner = item.seller_id === userId;

        return (
          <div key={item.id} style={s.card}>
            <div style={s.cardImg}>
              {img
                ? <img src={img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={s.cardImgPlaceholder}>📦</div>
              }
              <div style={{ ...s.availBadge, background: item.is_available ? '#10b981' : '#ef4444' }}>
                {item.is_available ? 'Available' : 'Unavailable'}
              </div>
            </div>
            <div style={s.cardBody}>
              <h3 style={s.cardTitle}>{item.title}</h3>
              {item.description && <p style={s.cardDesc}>{item.description}</p>}
              <div style={s.cardMeta}>
                <span>👤 {item.owner_name}</span>
                {item.duration && <span>📅 Up to {item.duration} days</span>}
                {item.deposit > 0 && <span>💰 रू {item.deposit}/day deposit</span>}
              </div>
            </div>
            <div style={s.cardActions}>
              {isOwner ? (
                <button onClick={() => handleDelete(item.id)} style={s.dangerBtn}>🗑️ Remove</button>
              ) : item.is_available ? (
                <button onClick={() => onRequest(item)} style={s.primaryBtn}>🤝 Borrow Request</button>
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
  if (requests.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}>📋</div>
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
                ? <img src={images[0]} alt={req.title} style={s.requestThumb} />
                : <div style={{ ...s.requestThumb, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📦</div>
              }
              <div>
                <div style={s.requestTitle}>{req.title}</div>
                <div style={s.requestMeta}>Owner: {req.seller_name}</div>
                <div style={s.requestMeta}>
                  {new Date(req.start_date).toLocaleDateString()} → {new Date(req.end_date).toLocaleDateString()}
                  &nbsp;·&nbsp; {req.total_days} days &nbsp;·&nbsp; रू {req.total_cost}
                </div>
                {req.message && <div style={s.requestMeta}>"{req.message}"</div>}
              </div>
            </div>
            <div style={s.requestRight}>
              <span style={{ ...s.statusBadge, background: statusColor(req.status) }}>{req.status}</span>
              {(req.status === 'approved' || req.status === 'active') && (
                <button onClick={() => onChat(req)} style={s.chatBtn}>💬 Chat</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Manage Requests Tab (Seller) ──────────────────────────────────────────────
function ManageRequestsTab({ requests, onRespond, onChat }) {
  if (requests.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}>⚙️</div>
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
              <div style={s.requestMeta}>Borrower: {req.borrower_name} · {req.borrower_phone || ''}</div>
              <div style={s.requestMeta}>
                {new Date(req.start_date).toLocaleDateString()} → {new Date(req.end_date).toLocaleDateString()}
                &nbsp;·&nbsp; {req.total_days} days &nbsp;·&nbsp; रू {req.total_cost}
              </div>
              {req.message && <div style={s.requestMeta}>Message: "{req.message}"</div>}
              <div style={s.requestMeta}>Requested: {new Date(req.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          <div style={s.requestRight}>
            <span style={{ ...s.statusBadge, background: statusColor(req.status) }}>{req.status}</span>
            {req.status === 'pending' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => onRespond(req.id, 'accepted')} style={s.acceptBtn}>✅ Accept</button>
                <button onClick={() => onRespond(req.id, 'rejected')} style={s.rejectBtn}>❌ Reject</button>
              </div>
            )}
            {(req.status === 'approved' || req.status === 'active') && (
              <button onClick={() => onChat(req)} style={s.chatBtn}>💬 Chat</button>
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
  const bottomRef = useRef(null);

  const fetchConversations = React.useCallback(async () => {
    try {
      const res = await axios.get('/chat/conversations');
      setConversations(res.data);
    } catch { /* silent */ }
  }, []);

  const fetchMessages = React.useCallback(async (targetUserId) => {
    try {
      const res = await axios.get(`/chat/messages/${targetUserId}`);
      setMessages(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (selected?.userId) {
      fetchMessages(selected.userId);
      const interval = setInterval(() => fetchMessages(selected.userId), 4000);
      return () => clearInterval(interval);
    }
  }, [selected, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      await axios.post('/chat/send', {
        receiver_id: selected.userId,
        message: text.trim(),
        borrow_request_id: selected.requestId || null,
      });
      setText('');
      fetchMessages(selected.userId);
      fetchConversations();
    } catch { /* silent */ } finally {
      setSending(false);
    }
  };

  return (
    <div style={s.chatLayout}>
      {/* Conversation list */}
      <div style={s.convList}>
        <div style={s.convHeader}>Conversations</div>
        {conversations.length === 0 && (
          <div style={{ padding: '20px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
            No conversations yet.<br />Accept a borrow request to start chatting.
          </div>
        )}
        {conversations.map(c => (
          <div
            key={c.other_user_id}
            onClick={() => setSelected({ userId: c.other_user_id, userName: c.other_user_name })}
            style={{
              ...s.convItem,
              background: selected?.userId === c.other_user_id ? '#EAF4FE' : '#fff',
            }}
          >
            <div style={s.convAvatar}>{c.other_user_name?.charAt(0)?.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.convName}>{c.other_user_name}</div>
              <div style={s.convLast}>{c.last_message}</div>
            </div>
            {c.unread_count > 0 && <div style={s.unreadDot}>{c.unread_count}</div>}
          </div>
        ))}
      </div>

      {/* Message pane */}
      <div style={s.msgPane}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Select a conversation or accept a borrow request to start chatting
          </div>
        ) : (
          <>
            <div style={s.msgHeader}>
              <div style={s.convAvatar}>{selected.userName?.charAt(0)?.toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>{selected.userName}</div>
                {selected.itemTitle && <div style={{ fontSize: '12px', color: '#64748b' }}>Re: {selected.itemTitle}</div>}
              </div>
            </div>
            <div style={s.msgList}>
              {messages.map(m => {
                const mine = m.sender_id === userId;
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                    <div style={{ ...s.bubble, background: mine ? '#F88000' : '#f1f5f9', color: mine ? '#fff' : '#000' }}>
                      <div>{m.message}</div>
                      <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div style={s.msgInput}>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                style={s.textInput}
              />
              <button onClick={sendMessage} disabled={sending || !text.trim()} style={s.sendBtn}>
                {sending ? '...' : '➤'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// need useCallback in ChatTab — already using React.useCallback above

// ─── Add Item Modal ────────────────────────────────────────────────────────────
function AddItemModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', image: '', duration: 7, deposit: '', location: '', is_available: true });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/borrow/items', form);
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h3 style={s.modalTitle}>Add Borrow Item</h3>
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Item Name *</label>
          <input required value={form.title} onChange={e => set('title', e.target.value)} style={s.input} placeholder="e.g. Scientific Calculator" />

          <label style={s.label}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...s.input, height: '80px', resize: 'vertical' }} placeholder="Describe the item..." />

          <label style={s.label}>Image URL (optional)</label>
          <input value={form.image} onChange={e => set('image', e.target.value)} style={s.input} placeholder="https://..." />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={s.label}>Max Borrow Duration (days)</label>
              <input type="number" min="1" value={form.duration} onChange={e => set('duration', e.target.value)} style={s.input} />
            </div>
            <div>
              <label style={s.label}>Deposit per day (रू, optional)</label>
              <input type="number" min="0" value={form.deposit} onChange={e => set('deposit', e.target.value)} style={s.input} placeholder="0" />
            </div>
          </div>

          <label style={s.label}>Pickup Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)} style={s.input} placeholder="e.g. Block A, Room 201" />

          <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_available} onChange={e => set('is_available', e.target.checked)} />
            Available for borrowing
          </label>

          <div style={s.modalActions}>
            <button type="submit" disabled={saving} style={s.primaryBtn}>{saving ? 'Saving...' : 'Add for Borrow'}</button>
            <button type="button" onClick={onClose} style={s.ghostBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Borrow Request Modal ──────────────────────────────────────────────────────
function BorrowRequestModal({ item, onClose, onSent }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ start_date: today, end_date: '', message: '' });
  const [sending, setSending] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
              <input type="date" required min={today} value={form.start_date} onChange={e => set('start_date', e.target.value)} style={s.input} />
            </div>
            <div>
              <label style={s.label}>End Date</label>
              <input type="date" required min={form.start_date || today} value={form.end_date} onChange={e => set('end_date', e.target.value)} style={s.input} />
            </div>
          </div>

          {totalDays > 0 && (
            <div style={{ background: '#EAF4FE', borderRadius: '12px', padding: '12px 16px', fontSize: '13px' }}>
              {totalDays} day{totalDays !== 1 ? 's' : ''}
              {totalCost > 0 ? ` · Deposit: रू ${totalCost}` : ' · No deposit required'}
              {item.duration && totalDays > item.duration && (
                <span style={{ color: '#ef4444' }}> ⚠️ Exceeds max {item.duration} days</span>
              )}
            </div>
          )}

          <label style={s.label}>Message to owner (optional)</label>
          <textarea value={form.message} onChange={e => set('message', e.target.value)} style={{ ...s.input, height: '72px', resize: 'vertical' }} placeholder="Why do you need it? When can you pick up?" />

          <div style={s.modalActions}>
            <button type="submit" disabled={sending} style={s.primaryBtn}>{sending ? 'Sending...' : '🤝 Send Request'}</button>
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '24px', backgroundColor: '#EAF4FE', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  loading: { textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: '#64748b' },

  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerIcon: { fontSize: '40px', background: '#F88000', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: '#000', margin: 0 },
  subtitle: { color: '#64748b', margin: '4px 0 0', fontSize: '14px' },

  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '10px 18px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' },
  activeTab: { padding: '10px 18px', border: 'none', borderRadius: '12px', background: '#F88000', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' },
  badge: { background: 'rgba(255,255,255,0.3)', borderRadius: '20px', padding: '1px 7px', fontSize: '12px', fontWeight: '700' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  card: { background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' },
  cardImg: { height: '180px', background: '#f1f5f9', position: 'relative', overflow: 'hidden' },
  cardImgPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' },
  availBadge: { position: 'absolute', top: '10px', right: '10px', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' },
  cardBody: { padding: '16px', flex: 1 },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#000', margin: '0 0 6px' },
  cardDesc: { fontSize: '13px', color: '#64748b', margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardMeta: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#64748b' },
  cardActions: { padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.05)' },

  listCol: { display: 'flex', flexDirection: 'column', gap: '12px' },
  requestCard: { background: '#fff', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
  requestLeft: { display: 'flex', gap: '14px', flex: 1, minWidth: 0 },
  requestThumb: { width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 },
  requestTitle: { fontSize: '15px', fontWeight: '700', color: '#000', marginBottom: '4px' },
  requestMeta: { fontSize: '12px', color: '#64748b', marginBottom: '2px' },
  requestRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 },
  statusBadge: { color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', textTransform: 'capitalize' },

  empty: { textAlign: 'center', padding: '60px 20px', color: '#64748b' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },

  // Chat
  chatLayout: { display: 'flex', gap: '0', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '560px' },
  convList: { width: '260px', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  convHeader: { padding: '16px', fontWeight: '700', fontSize: '14px', borderBottom: '1px solid rgba(0,0,0,0.07)' },
  convItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' },
  convAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#F88000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', flexShrink: 0 },
  convName: { fontSize: '13px', fontWeight: '600', color: '#000' },
  convLast: { fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' },
  unreadDot: { background: '#F88000', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  msgPane: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  msgHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)' },
  msgList: { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' },
  bubble: { maxWidth: '70%', padding: '10px 14px', borderRadius: '16px', fontSize: '14px', lineHeight: '1.4' },
  msgInput: { display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.07)' },
  textInput: { flex: 1, padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none' },
  sendBtn: { padding: '10px 18px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '700' },

  // Modals
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: '#000' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: { padding: '10px 14px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '10px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '8px', marginTop: '8px' },

  // Buttons
  primaryBtn: { padding: '11px 20px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif', width: '100%' },
  ghostBtn: { padding: '11px 20px', background: 'transparent', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
  addBtn: { padding: '11px 20px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif' },
  chatBtn: { padding: '8px 16px', background: '#EAF4FE', color: '#F88000', border: '1px solid #F88000', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif' },
  acceptBtn: { padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif' },
  rejectBtn: { padding: '8px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif' },
  dangerBtn: { padding: '10px 16px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif', width: '100%' },
};
