import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import LiveMap from '../components/LiveMap';

export default function RiderDashboard() {
  const { user } = useAuth();
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [riderStatus, setRiderStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [showRiderRequest, setShowRiderRequest] = useState(false);
  const [riderRequest, setRiderRequest] = useState({ license_number: '', license_image: '' });

  // Location state
  const [locationPermission, setLocationPermission] = useState('pending'); // pending|granted|denied
  const [coords, setCoords] = useState(null);       // { lat, lng }
  const [address, setAddress] = useState('');
  const [riderAvailability, setRiderAvailability] = useState('available');
  const [accepting, setAccepting] = useState(null);

  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0); // throttle backend updates

  // Reverse geocode using Nominatim (free, no key)
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setAddress(data.display_name?.split(',').slice(0, 3).join(', ') || '');
    } catch { /* silent */ }
  }, []);

  // Send location to backend (throttled to once every 5s)
  const sendLocation = useCallback(async (lat, lng, availability) => {
    const now = Date.now();
    if (now - lastSentRef.current < 5000) return;
    lastSentRef.current = now;
    try {
      await axios.put('/delivery/location', {
        latitude: lat,
        longitude: lng,
        rider_availability: availability,
      });
    } catch { /* silent */ }
  }, []);

  const setOffline = useCallback(async () => {
    try { await axios.put('/delivery/location', { rider_availability: 'offline' }); } catch { /* best-effort */ }
  }, []);

  // Start watchPosition — called once on mount (or on retry)
  const startTracking = useCallback((availability = 'available') => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      setOffline();
      return;
    }
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setLocationPermission('granted');
        reverseGeocode(lat, lng);
        sendLocation(lat, lng, availability);
      },
      () => {
        setLocationPermission('denied');
        setOffline();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [reverseGeocode, sendLocation, setOffline]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setOffline();
  }, [setOffline]);

  const fetchData = useCallback(async () => {
    try {
      const statusRes = await axios.get('/rider/status');
      setRiderStatus(statusRes.data);

      if (user?.role === 'rider') {
        const [availableRes, myDeliveriesRes, statsRes, incomeRes] = await Promise.all([
          axios.get('/delivery/available'),
          axios.get('/delivery/my-deliveries'),
          axios.get('/rider/stats'),
          axios.get('/rider/income'),
        ]);
        const availData = availableRes.data;
        setAvailableDeliveries(Array.isArray(availData) ? availData : (availData.deliveries || []));
        setMyDeliveries(myDeliveriesRes.data);
        setStats(statsRes.data);
        setIncome(incomeRes.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // On mount: check permission then start tracking
  useEffect(() => {
    if (user?.role !== 'rider') return;

    const init = () => startTracking(riderAvailability);

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setLocationPermission('denied');
          setOffline();
        } else {
          init();
        }
        // Listen for permission changes
        result.onchange = () => {
          if (result.state === 'denied') { setLocationPermission('denied'); stopTracking(); }
          else { init(); }
        };
      }).catch(init);
    } else {
      init();
    }

    const interval = setInterval(fetchData, 15000);
    return () => {
      clearInterval(interval);
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [user]); // eslint-disable-line

  const handleAvailabilityChange = async (val) => {
    setRiderAvailability(val);
    if (val === 'offline') {
      stopTracking();
    } else {
      startTracking(val);
    }
  };

  const handleRiderRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/rider/request', riderRequest);
      alert('Rider request submitted! You will be notified once approved.');
      setShowRiderRequest(false);
      fetchData();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAcceptDelivery = async (deliveryId) => {
    setAccepting(deliveryId);
    try {
      await axios.put(`/delivery/accept/${deliveryId}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept delivery');
    } finally {
      setAccepting(null);
    }
  };

  const handleUpdateStatus = async (deliveryId, status) => {
    try {
      await axios.put(`/delivery/status/${deliveryId}`, { status });
      fetchData();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div style={s.loading}>Loading...</div>;

  // Not a rider yet
  if (user?.role !== 'rider' && (!riderStatus || riderStatus.status === 'none')) {
    return (
      <div style={s.container}>
        <div style={s.pageHeader}>
          <div style={s.pageHeaderIcon}>🏍️</div>
          <div>
            <h1 style={s.pageTitle}>Become a Rider</h1>
            <p style={s.pageSubtitle}>Apply to deliver on Campus Cart and start earning</p>
          </div>
        </div>
        <div style={s.card}>
          <button onClick={() => setShowRiderRequest(true)} style={s.primaryBtn}>
            Apply to Become a Rider
          </button>
        </div>
        {showRiderRequest && (
          <div style={s.overlay}>
            <div style={s.modal}>
              <h3 style={s.modalTitle}>Rider Application</h3>
              <form onSubmit={handleRiderRequest} style={s.form}>
                <input
                  type="text"
                  placeholder="License Number"
                  value={riderRequest.license_number}
                  onChange={(e) => setRiderRequest({ ...riderRequest, license_number: e.target.value })}
                  required
                  style={s.input}
                />
                <input
                  type="text"
                  placeholder="License Image URL (optional)"
                  value={riderRequest.license_image}
                  onChange={(e) => setRiderRequest({ ...riderRequest, license_image: e.target.value })}
                  style={s.input}
                />
                <div style={s.modalActions}>
                  <button type="submit" style={s.primaryBtn}>Submit</button>
                  <button type="button" onClick={() => setShowRiderRequest(false)} style={s.ghostBtn}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (user?.role !== 'rider' && riderStatus?.status === 'pending') {
    return (
      <div style={s.container}>
        <div style={s.pageHeader}>
          <div style={s.pageHeaderIcon}>⏳</div>
          <div>
            <h1 style={s.pageTitle}>Application Pending</h1>
            <p style={s.pageSubtitle}>Your rider application is under review</p>
          </div>
        </div>
        <div style={s.card}>
          <p>License: <strong>{riderStatus.license_number}</strong></p>
          <p>Submitted: {new Date(riderStatus.created_at).toLocaleDateString()}</p>
          <p style={{ color: '#64748b' }}>You will be notified via email once approved.</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'rider' && riderStatus?.status === 'rejected') {
    return (
      <div style={s.container}>
        <div style={s.pageHeader}>
          <div style={s.pageHeaderIcon}>❌</div>
          <div>
            <h1 style={s.pageTitle}>Application Rejected</h1>
            <p style={s.pageSubtitle}>Your application was not approved</p>
          </div>
        </div>
        <div style={s.card}>
          {riderStatus.admin_notes && <p>Reason: {riderStatus.admin_notes}</p>}
          <p style={{ color: '#64748b' }}>Contact support or reapply with updated information.</p>
        </div>
      </div>
    );
  }

  // Approved rider dashboard
  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div style={s.pageHeaderIcon}>🏍️</div>
        <div style={{ flex: 1 }}>
          <h1 style={s.pageTitle}>Rider Dashboard</h1>
          <p style={s.pageSubtitle}>Welcome, {user?.full_name}</p>
        </div>

        {/* Availability */}
        <div style={s.locationBar}>
          <select
            value={riderAvailability}
            onChange={(e) => handleAvailabilityChange(e.target.value)}
            style={{ ...s.availSelect, backgroundColor: availColor(riderAvailability) }}
          >
            <option value="available">🟢 Available</option>
            <option value="busy">🟡 Busy</option>
            <option value="offline">🔴 Offline</option>
          </select>
        </div>
      </div>

      {/* Live Location Panel */}
      <LocationPanel
        locationPermission={locationPermission}
        coords={coords}
        address={address}
        riderAvailability={riderAvailability}
        onRetry={() => startTracking(riderAvailability)}
      />

      {/* Stats */}
      {stats && (
        <div style={s.statsGrid}>
          {[
            { label: 'Total', value: stats.deliveries.total_deliveries, icon: '📦' },
            { label: 'Completed', value: stats.deliveries.completed_deliveries, icon: '✅' },
            { label: 'Active', value: stats.deliveries.active_deliveries, icon: '🚚' },
            { label: 'Earnings', value: `रू ${stats.deliveries.total_earnings || 0}`, icon: '💰' },
            { label: 'Rating', value: stats.ratings.average_rating ? `${parseFloat(stats.ratings.average_rating).toFixed(1)}⭐` : 'N/A', icon: '⭐' },
          ].map((st) => (
            <div key={st.label} style={s.statCard}>
              <div style={s.statIcon}>{st.icon}</div>
              <div style={s.statValue}>{st.value}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={activeTab === 'available' ? s.activeTab : s.tab} onClick={() => setActiveTab('available')}>
          🔔 Available ({availableDeliveries.length})
        </button>
        <button style={activeTab === 'my-deliveries' ? s.activeTab : s.tab} onClick={() => setActiveTab('my-deliveries')}>
          📋 My Deliveries ({myDeliveries.length})
        </button>
        <button style={activeTab === 'income' ? s.activeTab : s.tab} onClick={() => setActiveTab('income')}>
          💰 Income
        </button>
      </div>

      {/* Available Deliveries */}
      {activeTab === 'available' && (
        <div>
          {locationPermission === 'denied' ? (
            <div style={s.locationBanner}>
              <div style={s.locationBannerIcon}>🚫</div>
              <div style={s.locationBannerTitle}>Location Off — Enable location to receive delivery requests</div>
              <p style={s.locationBannerText}>
                Without location access, you won't appear to buyers and won't receive any orders.
              </p>
              <button onClick={() => startTracking(riderAvailability)} style={s.primaryBtn}>
                Enable Location
              </button>
            </div>
          ) : locationPermission === 'pending' ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>📍</div>
              <p>Requesting your location...</p>
            </div>
          ) : availableDeliveries.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>📭</div>
              <p>No deliveries available near you right now.</p>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>Orders expand to more riders every 30 seconds.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {availableDeliveries.map((d) => (
                <AvailableDeliveryCard
                  key={d.id}
                  delivery={d}
                  onAccept={handleAcceptDelivery}
                  accepting={accepting === d.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Deliveries */}
      {activeTab === 'my-deliveries' && (
        <div>
          {myDeliveries.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>📋</div>
              <p>No deliveries assigned yet.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {myDeliveries.map((d) => (
                <MyDeliveryCard key={d.id} delivery={d} onUpdateStatus={handleUpdateStatus} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Income */}
      {activeTab === 'income' && <IncomePanel income={income} />}
    </div>
  );
}

// ─── Location Panel ────────────────────────────────────────────────────────────
function LocationPanel({ locationPermission, coords, address, riderAvailability, onRetry }) {
  const isActive = locationPermission === 'granted' && riderAvailability !== 'offline';

  return (
    <div style={s.locationPanel}>
      {/* Status row */}
      <div style={s.locationStatusRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...s.locationDot, backgroundColor: isActive ? '#10b981' : '#ef4444', boxShadow: isActive ? '0 0 0 4px rgba(16,185,129,0.2)' : 'none' }} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: isActive ? '#10b981' : '#ef4444' }}>
              {isActive ? 'Location Active' : locationPermission === 'denied' ? 'Location Off' : 'Location Off (Offline)'}
            </div>
            {isActive && (
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
                📡 Receiving Orders Nearby
              </div>
            )}
            {locationPermission === 'denied' && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>
                Enable location to receive delivery requests
              </div>
            )}
          </div>
        </div>
        {locationPermission === 'denied' && (
          <button onClick={onRetry} style={{ ...s.primaryBtn, padding: '8px 16px', fontSize: '13px' }}>
            Enable Location
          </button>
        )}
      </div>

      {/* Map + coords */}
      {isActive && coords ? (
        <>
          <div style={{ marginBottom: '12px' }}>
            <LiveMap lat={coords.lat} lng={coords.lng} address={address} />
          </div>
          <div style={s.coordsRow}>
            <div style={s.coordItem}>
              <span style={s.coordLabel}>Latitude</span>
              <span style={s.coordValue}>{coords.lat.toFixed(6)}</span>
            </div>
            <div style={s.coordDivider} />
            <div style={s.coordItem}>
              <span style={s.coordLabel}>Longitude</span>
              <span style={s.coordValue}>{coords.lng.toFixed(6)}</span>
            </div>
            {address && (
              <>
                <div style={s.coordDivider} />
                <div style={{ ...s.coordItem, flex: 2 }}>
                  <span style={s.coordLabel}>Location</span>
                  <span style={{ ...s.coordValue, fontSize: '12px' }}>{address}</span>
                </div>
              </>
            )}
          </div>
        </>
      ) : locationPermission === 'pending' ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '14px' }}>
          ⏳ Requesting location...
        </div>
      ) : null}
    </div>
  );
}

// ─── Income Panel ──────────────────────────────────────────────────────────────
function IncomePanel({ income }) {
  if (!income) return <div style={s.emptyState}><div style={s.emptyIcon}>💰</div><p>Loading income data...</p></div>;

  const { periods, history, daily } = income;

  // Build last-7-days array filling missing days with 0
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const found = daily.find(r => r.day?.split('T')[0] === key || r.day === key);
    last7.push({ day: key, earned: found ? parseFloat(found.earned) : 0 });
  }
  const maxEarned = Math.max(...last7.map(d => d.earned), 1);

  const periodCards = [
    { label: 'Today',      value: periods.today      || 0, icon: '☀️',  color: '#f59e0b' },
    { label: 'This Week',  value: periods.this_week  || 0, icon: '📅',  color: '#3b82f6' },
    { label: 'This Month', value: periods.this_month || 0, icon: '🗓️', color: '#8b5cf6' },
    { label: 'All Time',   value: periods.all_time   || 0, icon: '🏆',  color: '#10b981' },
  ];

  return (
    <div>
      {/* Period cards */}
      <div style={s.incomeGrid}>
        {periodCards.map(pc => (
          <div key={pc.label} style={{ ...s.incomeCard, borderTop: `4px solid ${pc.color}` }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{pc.icon}</div>
            <div style={{ ...s.incomeValue, color: pc.color }}>रू {parseFloat(pc.value).toLocaleString()}</div>
            <div style={s.incomeLabel}>{pc.label}</div>
          </div>
        ))}
      </div>

      {/* 7-day bar chart */}
      <div style={s.chartCard}>
        <div style={s.chartTitle}>📊 Last 7 Days</div>
        <div style={s.chartBars}>
          {last7.map(d => (
            <div key={d.day} style={s.barCol}>
              <div style={s.barAmount}>
                {d.earned > 0 ? `रू${d.earned}` : ''}
              </div>
              <div
                style={{
                  ...s.bar,
                  height: `${Math.max((d.earned / maxEarned) * 120, d.earned > 0 ? 8 : 2)}px`,
                  backgroundColor: d.earned > 0 ? '#F88000' : '#e2e8f0',
                }}
              />
              <div style={s.barLabel}>
                {new Date(d.day).toLocaleDateString('en', { weekday: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History list */}
      <div style={s.historyCard}>
        <div style={s.chartTitle}>🧾 Delivery History</div>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
            No completed deliveries yet.
          </div>
        ) : (
          history.map(h => (
            <div key={h.id} style={s.historyRow}>
              <div style={s.historyLeft}>
                <div style={s.historyTitle}>{h.item_title}</div>
                <div style={s.historyMeta}>
                  👤 {h.buyer_name} &nbsp;·&nbsp; 📍 {h.delivery_address}
                </div>
                <div style={s.historyMeta}>
                  {h.delivery_time ? new Date(h.delivery_time).toLocaleString() : '—'}
                  &nbsp;·&nbsp; {paymentLabel(h.payment_method)}
                </div>
              </div>
              <div style={s.historyFee}>रू {parseFloat(h.delivery_fee).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Available Delivery Card ───────────────────────────────────────────────────
function AvailableDeliveryCard({ delivery: d, onAccept, accepting }) {
  const distanceLabel =
    d.distance_km !== null && d.distance_km !== undefined
      ? `${d.distance_km} km away`
      : 'Distance unknown';

  const distanceColor =
    d.distance_km === null ? '#94a3b8'
    : d.distance_km <= 2 ? '#10b981'
    : d.distance_km <= 5 ? '#f59e0b'
    : '#ef4444';

  const ageMin = Math.floor((d.order_age_seconds || 0) / 60);

  return (
    <div style={s.deliveryCard}>
      {/* Distance badge */}
      <div style={{ ...s.distanceBadge, backgroundColor: distanceColor }}>
        📍 {distanceLabel}
      </div>

      <div style={s.cardBody}>
        <h3 style={s.cardTitle}>{d.item_title}</h3>

        <div style={s.infoRow}><span style={s.infoIcon}>👤</span><span>{d.buyer_name}</span></div>
        <div style={s.infoRow}><span style={s.infoIcon}>📍</span><span style={s.infoText}>{d.delivery_address}</span></div>
        <div style={s.infoRow}><span style={s.infoIcon}>💰</span><span>रू {d.total_amount} &nbsp;·&nbsp; {paymentLabel(d.payment_method)}</span></div>
        <div style={s.infoRow}><span style={s.infoIcon}>🚚</span><span>Delivery fee: रू {d.delivery_fee}</span></div>
        <div style={s.infoRow}><span style={s.infoIcon}>⏱️</span><span style={{ color: '#94a3b8', fontSize: '12px' }}>
          Posted {ageMin < 1 ? 'just now' : `${ageMin} min ago`}
        </span></div>
      </div>

      <button
        onClick={() => onAccept(d.id)}
        disabled={accepting}
        style={{ ...s.primaryBtn, width: '100%', marginTop: '12px', opacity: accepting ? 0.6 : 1 }}
      >
        {accepting ? 'Accepting...' : '✅ Accept Delivery'}
      </button>
    </div>
  );
}

// ─── My Delivery Card ──────────────────────────────────────────────────────────
function MyDeliveryCard({ delivery: d, onUpdateStatus }) {
  const statusColor = {
    assigned: '#f59e0b',
    picked_up: '#3b82f6',
    delivered: '#10b981',
    cancelled: '#ef4444',
  }[d.status] || '#94a3b8';

  return (
    <div style={s.deliveryCard}>
      <div style={{ ...s.statusBadge, backgroundColor: statusColor }}>
        {statusIcon(d.status)} {d.status?.replace('_', ' ').toUpperCase()}
      </div>

      <div style={s.cardBody}>
        <h3 style={s.cardTitle}>{d.item_title}</h3>
        <div style={s.infoRow}><span style={s.infoIcon}>👤</span><span>{d.buyer_name} · {d.buyer_phone}</span></div>
        <div style={s.infoRow}><span style={s.infoIcon}>📍</span><span style={s.infoText}>{d.delivery_address}</span></div>
        <div style={s.infoRow}><span style={s.infoIcon}>💰</span><span>रू {d.total_amount} &nbsp;·&nbsp; {paymentLabel(d.payment_method)}</span></div>
        <div style={s.infoRow}><span style={s.infoIcon}>🏪</span><span>Seller: {d.seller_name} · {d.seller_phone}</span></div>
        {d.pickup_time && <div style={s.infoRow}><span style={s.infoIcon}>📦</span><span>Picked up: {new Date(d.pickup_time).toLocaleString()}</span></div>}
        {d.delivery_time && <div style={s.infoRow}><span style={s.infoIcon}>✅</span><span>Delivered: {new Date(d.delivery_time).toLocaleString()}</span></div>}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {d.status === 'assigned' && (
          <button onClick={() => onUpdateStatus(d.id, 'picked_up')} style={{ ...s.primaryBtn, flex: 1 }}>
            📦 Mark Picked Up
          </button>
        )}
        {d.status === 'picked_up' && (
          <button onClick={() => onUpdateStatus(d.id, 'delivered')} style={{ ...s.successBtn, flex: 1 }}>
            ✅ Mark Delivered
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function paymentLabel(pm) {
  return pm === 'esewa' ? '📱 eSewa' : '💵 COD';
}
function statusIcon(st) {
  return { assigned: '🚴', picked_up: '📦', delivered: '✅', cancelled: '❌' }[st] || '⏳';
}
function availColor(av) {
  return { available: '#d1fae5', busy: '#fef3c7', offline: '#fee2e2' }[av] || '#f1f5f9';
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '24px', backgroundColor: '#EAF4FE', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  loading: { textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: '#64748b' },

  pageHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  pageHeaderIcon: { fontSize: '40px', background: '#F88000', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: '24px', fontWeight: '700', color: '#000', margin: 0 },
  pageSubtitle: { color: '#64748b', margin: '4px 0 0', fontSize: '14px' },

  locationBar: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  availSelect: { padding: '8px 12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  locationBtn: { padding: '8px 14px', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'Inter, sans-serif' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { background: '#fff', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  statIcon: { fontSize: '24px', marginBottom: '8px' },
  statValue: { fontSize: '22px', fontWeight: '700', color: '#F88000' },
  statLabel: { fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' },

  tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tab: { padding: '10px 20px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500', fontFamily: 'Inter, sans-serif' },
  activeTab: { padding: '10px 20px', border: 'none', borderRadius: '12px', background: '#F88000', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },

  deliveryCard: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' },
  distanceBadge: { display: 'inline-block', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', marginBottom: '12px' },
  statusBadge: { display: 'inline-block', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '6px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#000', margin: '0 0 8px' },
  infoRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#374151' },
  infoIcon: { fontSize: '14px', flexShrink: 0, marginTop: '1px' },
  infoText: { wordBreak: 'break-word' },

  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#64748b' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },

  card: { background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center', marginBottom: '16px' },

  primaryBtn: { padding: '12px 20px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif' },
  successBtn: { padding: '12px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif' },
  ghostBtn: { padding: '12px 20px', background: 'transparent', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '20px', padding: '32px', width: '90%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#000' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '12px 16px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none' },
  modalActions: { display: 'flex', gap: '8px', marginTop: '8px' },

  // Income
  incomeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' },
  incomeCard: { background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  incomeValue: { fontSize: '26px', fontWeight: '700', marginBottom: '4px' },
  incomeLabel: { fontSize: '13px', color: '#64748b', fontWeight: '500' },

  chartCard: { background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  chartTitle: { fontSize: '15px', fontWeight: '700', color: '#000', marginBottom: '20px' },
  chartBars: { display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px' },
  barCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' },
  barAmount: { fontSize: '10px', color: '#F88000', fontWeight: '600', minHeight: '14px', textAlign: 'center' },
  bar: { width: '100%', borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease', minHeight: '2px' },
  barLabel: { fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '4px' },

  historyCard: { background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  historyRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' },
  historyLeft: { flex: 1, minWidth: 0 },
  historyTitle: { fontSize: '14px', fontWeight: '600', color: '#000', marginBottom: '4px' },
  historyMeta: { fontSize: '12px', color: '#64748b', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  historyFee: { fontSize: '16px', fontWeight: '700', color: '#10b981', marginLeft: '16px', flexShrink: 0 },

  // Location banner
  locationBanner: { background: '#fff', borderRadius: '16px', padding: '48px 32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '480px', margin: '0 auto' },
  locationBannerIcon: { fontSize: '56px', marginBottom: '16px' },
  locationBannerTitle: { fontSize: '20px', fontWeight: '700', color: '#000', marginBottom: '8px' },
  locationBannerText: { color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' },

  // Location panel
  locationPanel: { background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  locationStatusRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  locationDot: { width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s' },
  coordsRow: { display: 'flex', alignItems: 'center', gap: '0', background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', flexWrap: 'wrap', gap: '8px' },
  coordItem: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '120px' },
  coordLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  coordValue: { fontSize: '14px', fontWeight: '700', color: '#000', fontFamily: 'monospace' },
  coordDivider: { width: '1px', height: '36px', background: '#e2e8f0', flexShrink: 0 },
};
