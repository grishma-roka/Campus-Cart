import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { Bike, Package, MapPin, User, CheckCircle, Truck, Clock, Store, CircleDollarSign, Banknote } from 'lucide-react';

export default function DeliveriesPage() {
  const { user } = useAuth();
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [tab, setTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [avRes, myRes] = await Promise.all([
        axios.get('/delivery/available'),
        axios.get('/delivery/my-deliveries'),
      ]);
      const avData = avRes.data;
      setAvailable(Array.isArray(avData) ? avData : (avData?.deliveries || []));
      setMine(Array.isArray(myRes.data) ? myRes.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const accept = async (deliveryId) => {
    setActing(deliveryId);
    try {
      await axios.put(`/delivery/accept/${deliveryId}`);
      await fetchAll();
      setTab('mine');
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to accept');
    } finally {
      setActing(null);
    }
  };

  const updateStatus = async (deliveryId, status) => {
    setActing(deliveryId);
    try {
      await axios.put(`/delivery/status/${deliveryId}`, { status });
      await fetchAll();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div style={s.loading}>Loading deliveries...</div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerIcon}><Bike size={28} color="#fff" strokeWidth={1.5} /></div>
        <div>
          <h1 style={s.title}>Deliveries</h1>
          <p style={s.sub}>Accept and manage your deliveries</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button
          onClick={() => setTab('available')}
          style={{ ...s.tab, ...(tab === 'available' ? s.activeTab : {}) }}
        >
          📦 Available {available.length > 0 && <span style={s.badge}>{available.length}</span>}
        </button>
        <button
          onClick={() => setTab('mine')}
          style={{ ...s.tab, ...(tab === 'mine' ? s.activeTab : {}) }}
        >
          🏍️ My Deliveries {mine.filter(d => d.status !== 'delivered').length > 0 && (
            <span style={s.badge}>{mine.filter(d => d.status !== 'delivered').length}</span>
          )}
        </button>
      </div>

      {/* Available deliveries */}
      {tab === 'available' && (
        <div style={s.list}>
          {available.length === 0 ? (
            <div style={s.empty}>
              <Package size={48} color="#94a3b8" strokeWidth={1.5} />
              <p>No pending deliveries right now.</p>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>You'll be notified when a seller marks an item ready.</p>
            </div>
          ) : available.map(d => (
            <div key={d.id} style={s.card}>
              <div style={s.cardTop}>
                <h3 style={s.itemTitle}>{d.item_title}</h3>
                <span style={{ ...s.statusPill, background: '#f59e0b' }}>Pending</span>
              </div>
              <div style={s.row}><Store size={14} color="#F88000" /><span style={s.pickup}>Pickup: {d.pickup_address || 'Seller location'}</span></div>
              <div style={s.row}><MapPin size={14} color="#64748b" /><span>Deliver to: {d.delivery_address}</span></div>
              <div style={s.row}><User size={14} color="#64748b" /><span>Buyer: {d.buyer_name} {d.buyer_phone && `· ${d.buyer_phone}`}</span></div>
              <div style={s.row}><CircleDollarSign size={14} color="#64748b" /><span>Order: रू {d.total_amount} · Your fee: <strong style={{ color: '#10b981' }}>रू {d.delivery_fee}</strong></span></div>
              <div style={s.row}><Banknote size={14} color="#64748b" /><span>{d.payment_method === 'esewa' ? 'Paid Online' : 'Collect Cash (COD)'}</span></div>
              <button
                onClick={() => accept(d.id)}
                disabled={acting === d.id}
                style={{ ...s.btn, background: '#F88000', marginTop: '14px' }}
              >
                {acting === d.id ? 'Accepting...' : '✅ Accept Delivery'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* My deliveries */}
      {tab === 'mine' && (
        <div style={s.list}>
          {mine.length === 0 ? (
            <div style={s.empty}>
              <Bike size={48} color="#94a3b8" strokeWidth={1.5} />
              <p>No deliveries assigned yet.</p>
            </div>
          ) : mine.map(d => {
            const statusColor = {
              assigned: '#f59e0b',
              picked_up: '#a855f7',
              out_for_delivery: '#3b82f6',
              delivered: '#10b981',
            }[d.status] || '#94a3b8';

            const statusLabel = {
              assigned: 'Accepted',
              picked_up: 'Picked Up',
              out_for_delivery: 'Out for Delivery',
              delivered: 'Delivered',
            }[d.status] || d.status;

            return (
              <div key={d.id} style={s.card}>
                <div style={s.cardTop}>
                  <h3 style={s.itemTitle}>{d.item_title}</h3>
                  <span style={{ ...s.statusPill, background: statusColor }}>{statusLabel}</span>
                </div>
                <div style={s.row}><Store size={14} color="#F88000" /><span style={s.pickup}>Pickup: {d.pickup_address || d.seller_name || 'Seller'}</span></div>
                <div style={s.row}><MapPin size={14} color="#64748b" /><span>Deliver to: {d.delivery_address}</span></div>
                <div style={s.row}><User size={14} color="#64748b" /><span>Buyer: {d.buyer_name} {d.buyer_phone && `· ${d.buyer_phone}`}</span></div>
                <div style={s.row}><CircleDollarSign size={14} color="#64748b" /><span>Your fee: <strong style={{ color: '#10b981' }}>रू {d.delivery_fee}</strong></span></div>

                {/* Action buttons — sequential */}
                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {d.status === 'assigned' && (
                    <button onClick={() => updateStatus(d.id, 'picked_up')} disabled={acting === d.id} style={{ ...s.btn, background: '#a855f7' }}>
                      {acting === d.id ? '...' : '📦 Mark Picked Up'}
                    </button>
                  )}
                  {d.status === 'picked_up' && (
                    <button onClick={() => updateStatus(d.id, 'out_for_delivery')} disabled={acting === d.id} style={{ ...s.btn, background: '#3b82f6' }}>
                      {acting === d.id ? '...' : '🛵 Out for Delivery'}
                    </button>
                  )}
                  {d.status === 'out_for_delivery' && (
                    <button onClick={() => updateStatus(d.id, 'delivered')} disabled={acting === d.id} style={{ ...s.btn, background: '#10b981' }}>
                      {acting === d.id ? '...' : '✅ Mark Delivered'}
                    </button>
                  )}
                  {d.status === 'delivered' && (
                    <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '700' }}>✅ Completed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { maxWidth: '700px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#EAF4FE' },
  loading: { textAlign: 'center', padding: '4rem', color: '#64748b' },
  header: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' },
  headerIcon: { background: '#F88000', borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 },
  sub: { fontSize: '13px', color: '#64748b', margin: '4px 0 0' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tab: { flex: 1, padding: '12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  activeTab: { background: '#F88000', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(248,128,0,0.25)' },
  badge: { background: 'rgba(255,255,255,0.3)', borderRadius: '20px', padding: '1px 7px', fontSize: '11px', fontWeight: '800' },
  list: { display: 'flex', flexDirection: 'column', gap: '14px' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#fff', borderRadius: '16px' },
  card: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  itemTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 },
  statusPill: { color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px' },
  row: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#374151' },
  pickup: { color: '#F88000', fontWeight: '600' },
  btn: { padding: '12px 20px', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'Inter, sans-serif', flex: 1 },
};
