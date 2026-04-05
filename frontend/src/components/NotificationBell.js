import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { Bell, Bike, CheckCircle, Info, Handshake, ShoppingBag, Truck } from 'lucide-react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data);
      setUnread(res.data.filter(n => !n.is_read).length);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open && unread > 0) {
      try {
        await axios.put('/notifications/mark-read');
        setUnread(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } catch { /* silent */ }
    }
  };

  const handleNotificationClick = (n) => {
    if (n.type === 'borrow_accepted' && n.order_id) {
      setOpen(false);
      navigate(`/messages/${n.order_id}`);
    }
  };

  const typeIcon = (type) => {
    switch(type) {
      case 'order_accepted': return <Bike size={18} strokeWidth={1.5} color="#F88000" />;
      case 'order_delivered': return <CheckCircle size={18} strokeWidth={1.5} color="#10b981" />;
      case 'borrow_accepted': return <Handshake size={18} strokeWidth={1.5} color="#10b981" />;
      case 'new_order': return <ShoppingBag size={18} strokeWidth={1.5} color="#F88000" />;
      case 'new_delivery': return <Truck size={18} strokeWidth={1.5} color="#3b82f6" />;
      case 'info': return <Info size={18} strokeWidth={1.5} color="#3b82f6" />;
      default: return <Bell size={18} strokeWidth={1.5} color="#64748b" />;
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <button onClick={handleOpen} style={s.bell} title="Notifications">
        <Bell size={20} strokeWidth={1.5} color="#000" />
        {unread > 0 && <span style={s.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <span style={{ fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} strokeWidth={2} /> Notifications
            </span>
          </div>
          <div style={s.list}>
            {notifications.length === 0 ? (
              <div style={s.empty}>No notifications yet</div>
            ) : (
              notifications.map(n => {
                const isClickable = n.type === 'borrow_accepted' && n.order_id;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      ...s.item,
                      background: n.is_read ? '#fff' : '#fef9f0',
                      cursor: isClickable ? 'pointer' : 'default'
                    }}
                  >
                    <div style={s.itemIcon}>{typeIcon(n.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.itemTitle}>{n.title}</div>
                      <div style={s.itemMsg}>{n.message}</div>
                      {isClickable && (
                        <div style={s.actionLink}>Start Conversation →</div>
                      )}
                      <div style={s.itemTime}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    {!n.is_read && <div style={s.dot} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  bell: { position: 'relative', background: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s ease' },
  badge: { position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '700', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel: { position: 'absolute', top: '50px', right: 0, width: '340px', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', border: '1px solid rgba(0, 0, 0, 0.05)', zIndex: 2000, overflow: 'hidden' },
  panelHeader: { padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#EAF4FE' },
  list: { maxHeight: '380px', overflowY: 'auto' },
  empty: { padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' },
  item: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'default' },
  itemIcon: { flexShrink: 0, marginTop: '2px', background: '#f1f5f9', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: '13px', fontWeight: '600', color: '#000', marginBottom: '2px' },
  itemMsg: { fontSize: '12px', color: '#374151', lineHeight: '1.4' },
  itemTime: { fontSize: '11px', color: '#94a3b8', marginTop: '4px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#F88000', flexShrink: 0, marginTop: '4px' },
  actionLink: { fontSize: '12px', color: '#F88000', fontWeight: '600', marginTop: '4px' },
};
