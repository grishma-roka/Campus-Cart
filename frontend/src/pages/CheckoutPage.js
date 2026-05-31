import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../context/CartContext';
import { MapPin, CreditCard, Banknote, Smartphone, Package, User, Mail, Info } from 'lucide-react';

// This prevents the page from crashing if images are a string or a JSON array
const safeParseImages = (imageData) => {
  if (!imageData) return [];
  if (Array.isArray(imageData)) return imageData;
  try {
    const parsed = JSON.parse(imageData);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    // If it's a plain string like "/uploads/...", just return it in an array
    return [imageData];
  }
};

export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, getCartTotal, clearCart } = useCart();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    deliveryLocation: '',
    notes: '',
    paymentMethod: 'cod',
    esewaNumber: ''
  });
  
  const [errors, setErrors] = useState({});
  const [deliveryCoords, setDeliveryCoords] = useState({ lat: null, lng: null });
  const [deliveryFeeEstimate, setDeliveryFeeEstimate] = useState({ delivery_fee: 40, distance_km: 1.5 });
  const [feeLoading, setFeeLoading] = useState(false);
  const esewaFormRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (id) {
      fetchItemDetails();
    } else {
      if (cartItems && cartItems.length > 0) {
        setItem({
          id: 'cart',
          title: `Shopping Cart (${cartItems.length} items)`,
          price: getCartTotal(),
          images: cartItems[0].image || cartItems[0].images || '[]',
          seller_id: null,
          is_sold: false
        });
        setLoading(false);
      } else {
        alert("Your cart is empty");
        navigate('/dashboard');
      }
    }

    // Capture buyer's current location for delivery proximity
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDeliveryCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fail — coords are optional
      );
    }
  }, [id, user]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.full_name || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  // Debounced delivery fee estimate
  useEffect(() => {
    if (!item || !formData.deliveryLocation) return;
    const timer = setTimeout(async () => {
      try {
        setFeeLoading(true);
        const res = await axios.get('/orders/estimate-fee', {
          params: {
            pickup_location: item.pickup_location || '',
            delivery_address: formData.deliveryLocation
          }
        });
        setDeliveryFeeEstimate(res.data);
      } catch (e) {
        // Fallback to default
        setDeliveryFeeEstimate({ delivery_fee: 40, distance_km: 1.5 });
      } finally {
        setFeeLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.deliveryLocation, item]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/items/${id}`);
      
      // Check if item is available
      if (response.data.is_sold) {
        alert('This item has already been sold');
        navigate('/dashboard');
        return;
      }
      
      // Check if trying to buy own item
      if (response.data.seller_id === user.id) {
        alert('You cannot buy your own item');
        navigate('/dashboard');
        return;
      }
      
      setItem(response.data);
    } catch (error) {
      console.error('Error fetching item:', error);
      alert('Failed to load item details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (!formData.deliveryLocation.trim()) newErrors.deliveryLocation = 'Delivery location is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const orderData = {
        delivery_address: formData.deliveryLocation,
        delivery_lat: deliveryCoords.lat,
        delivery_lng: deliveryCoords.lng,
        phone: formData.phone,
        notes: formData.notes,
      };

      if (id) {
        // Direct Single Item Checkout Mode
        orderData.item_id = parseInt(id);

        if (formData.paymentMethod === 'esewa') {
          // Initiate eSewa payment — in development, bypass is automatic
          const res = await axios.post('/payment/esewa/initiate', {
            ...orderData,
            bypassEsewa: process.env.NODE_ENV === 'development'
          });

          // Dev bypass — order created instantly, go to success page
          if (res.data.devBypass) {
            navigate('/order-success', {
              state: {
                orderDetails: {
                  item_title: res.data.item_title,
                  fullName: formData.fullName,
                  phone: formData.phone,
                  deliveryLocation: formData.deliveryLocation,
                  total_amount: parseFloat(res.data.total_amount) + parseFloat(res.data.delivery_fee || 0)
                }
              }
            });
            return;
          }
          const { formUrl, formData: esewaFields, checkoutContext } = res.data;

          localStorage.setItem('esewa_checkout', JSON.stringify(checkoutContext));

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = formUrl;
          Object.entries(esewaFields).forEach(([key, val]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = val;
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
        } else {
          // COD Create order directly
          const res = await axios.post('/orders/create', { ...orderData, payment_method: 'cod' });
          navigate('/order-success', {
            state: {
              orderDetails: {
                item_title: item.title,
                fullName: formData.fullName,
                phone: formData.phone,
                deliveryLocation: formData.deliveryLocation,
                total_amount: item.price
              }
            }
          });
        }
      } else {
        // Global Cart Bulk Checkout Mode
        if (formData.paymentMethod === 'esewa') {
          alert('eSewa payment currently only supports single items. Please use Cash on Delivery for full cart checkouts.');
          setSubmitting(false);
          return;
        }

        // Standard COD Loop Processing
        for (const cartItem of cartItems) {
          await axios.post('/orders/create', {
            ...orderData,
            item_id: parseInt(cartItem.id),
            payment_method: 'cod'
          });
        }
        
        clearCart();
        navigate('/order-success', {
          state: {
            orderDetails: {
              item_title: `${cartItems.length} items`,
              fullName: formData.fullName,
              phone: formData.phone,
              deliveryLocation: formData.deliveryLocation,
              total_amount: getCartTotal()
            }
          }
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading checkout...</p>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const images = safeParseImages(item.images);
  let mainImage = images[0] || `https://dummyimage.com/200x200/4CAF50/ffffff&text=${encodeURIComponent(item.title.substring(0, 3))}`;
  if (mainImage.startsWith('/uploads')) {
    mainImage = `https://campus-cart-on6p.onrender.com${mainImage}`;
  }

  const itemPrice = parseFloat(item.price) || 0;
  const deliveryFee = deliveryFeeEstimate.delivery_fee || 40;
  const totalAmount = itemPrice + deliveryFee;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backButton}>
            ← Back
          </button>
          <h1 style={styles.pageTitle}>Checkout</h1>
        </div>

        <div style={styles.checkoutLayout}>
          {/* Left Side - Form */}
          <div style={styles.formSection}>
            <form onSubmit={handleSubmit}>
              {/* Delivery Information */}
              <div style={styles.formCard}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.cardIcon}><MapPin size={24} color="#F88000" /></span>
                  Delivery Information
                </h2>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    style={{...styles.input, ...(errors.fullName ? styles.inputError : {})}}
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && <span style={styles.errorText}>{errors.fullName}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{...styles.input, ...(errors.phone ? styles.inputError : {})}}
                    placeholder="9812345678"
                  />
                  {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Delivery Location *</label>
                  <input
                    type="text"
                    name="deliveryLocation"
                    value={formData.deliveryLocation}
                    onChange={handleInputChange}
                    style={{...styles.input, ...(errors.deliveryLocation ? styles.inputError : {})}}
                    placeholder="e.g., Hostel Block A, Room 205"
                  />
                  {errors.deliveryLocation && <span style={styles.errorText}>{errors.deliveryLocation}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Additional Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    style={styles.textarea}
                    placeholder="Any special instructions for delivery..."
                    rows="3"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div style={styles.formCard}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.cardIcon}><CreditCard size={24} color="#F88000" /></span>
                  Payment Method
                </h2>

                <div style={styles.paymentOptions}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleInputChange}
                      style={styles.radio}
                    />
                    <div style={styles.radioContent}>
                      <span style={{...styles.radioTitle, display: 'flex', alignItems: 'center'}}><Banknote size={16} style={{marginRight: '6px'}} /> Cash on Delivery</span>
                      <span style={styles.radioDesc}>Pay when you receive the item</span>
                    </div>
                  </label>

                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="esewa"
                      checked={formData.paymentMethod === 'esewa'}
                      onChange={handleInputChange}
                      style={styles.radio}
                    />
                    <div style={styles.radioContent}>
                      <span style={{...styles.radioTitle, display: 'flex', alignItems: 'center'}}><Smartphone size={16} style={{marginRight: '6px'}} /> Pay with eSewa</span>
                      <span style={styles.radioDesc}>Redirect to eSewa gateway — secure online payment</span>
                    </div>
                  </label>
                </div>

                {formData.paymentMethod === 'esewa' && (
                  <div style={{ background: '#EAF4FE', border: '1px solid rgba(248, 128, 0, 0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#000', display: 'flex', alignItems: 'center' }}>
                    <Info size={16} style={{marginRight: '8px', color: '#F88000'}} /> You will be redirected to eSewa to complete payment. After payment, your order will be confirmed automatically.
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                style={{...styles.submitButton, ...(submitting ? styles.submitButtonDisabled : {})}}
                disabled={submitting}
              >
                {submitting
                  ? 'Processing...'
                  : formData.paymentMethod === 'esewa'
                    ? 'Pay with eSewa →'
                    : 'Place Order (COD)'}
              </button>
            </form>
          </div>

          {/* Right Side - Order Summary */}
          <div style={styles.summarySection}>
            <div style={styles.summaryCard}>
              <h2 style={styles.cardTitle}>
                <span style={styles.cardIcon}><Package size={24} color="#F88000" /></span>
                Order Summary
              </h2>

              {/* Item Details */}
              <div style={styles.itemSummary}>
                <img src={mainImage} alt={item.title} style={styles.summaryImage} />
                <div style={styles.summaryDetails}>
                  <h3 style={styles.summaryTitle}>{item.title}</h3>
                  <p style={styles.summaryCategory}>{item.category}</p>
                  <p style={styles.summaryCondition}>Condition: {item.condition_status || 'Good'}</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div style={styles.priceBreakdown}>
                <div style={styles.priceRow}>
                  <span style={styles.priceLabel}>Item Price</span>
                  <span style={styles.priceValue}>रू {itemPrice.toLocaleString()}</span>
                </div>
                <div style={styles.priceRow}>
                  <span style={styles.priceLabel}>
                    🛵 Delivery Fee
                    {deliveryFeeEstimate.distance_km && (
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
                        ({deliveryFeeEstimate.distance_km} km)
                      </span>
                    )}
                    {feeLoading && <span style={{ fontSize: '11px', color: '#F88000', marginLeft: '6px' }}>estimating...</span>}
                  </span>
                  <span style={{ ...styles.priceValue, color: '#F88000' }}>रू {deliveryFee}</span>
                </div>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Total Amount</span>
                  <span style={styles.totalValue}>रू {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Seller Info */}
              <div style={styles.sellerInfo}>
                <h4 style={styles.sellerTitle}>Seller Information</h4>
                <p style={styles.sellerName}><User size={14} style={{marginRight: '6px', color: '#64748b'}} /> {item.seller_name}</p>
                <p style={styles.sellerEmail}><Mail size={14} style={{marginRight: '6px'}} /> {item.seller_email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#EAF4FE',
    paddingTop: '120px',
    paddingBottom: '40px',
    fontFamily: 'Inter, sans-serif'
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px'
  },
  header: {
    marginBottom: '32px'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#fff',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    color: '#000',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'all 0.3s ease'
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#000',
    margin: 0
  },
  checkoutLayout: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '32px'
  },

  // Form Section
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  formCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '20px',
    fontWeight: '700',
    color: '#000',
    marginBottom: '24px'
  },
  cardIcon: {
    fontSize: '24px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    fontSize: '15px',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.3s ease',
    outline: 'none'
  },
  inputError: {
    borderColor: '#e74c3c'
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    fontSize: '15px',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.3s ease',
    outline: 'none',
    resize: 'vertical'
  },
  errorText: {
    display: 'block',
    color: '#e74c3c',
    fontSize: '13px',
    marginTop: '4px',
    fontWeight: '500'
  },

  // Payment Options
  paymentOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    border: '2px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  radio: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  },
  radioContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  radioTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#000'
  },
  radioDesc: {
    fontSize: '13px',
    color: '#64748b'
  },

  // Submit Button
  submitButton: {
    width: '100%',
    padding: '18px',
    background: '#F88000',
    color: '#fff',
    border: 'none',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(248, 128, 0, 0.3)'
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },

  // Summary Section
  summarySection: {
    position: 'sticky',
    top: '120px',
    height: 'fit-content'
  },
  summaryCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
  },
  itemSummary: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  },
  summaryImage: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '12px',
    background: '#f1f5f9'
  },
  summaryDetails: {
    flex: 1
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  summaryCategory: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 4px 0'
  },
  summaryCondition: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  priceBreakdown: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  priceLabel: {
    fontSize: '14px',
    color: '#64748b'
  },
  priceValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '2px solid rgba(0, 0, 0, 0.1)'
  },
  totalLabel: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#000'
  },
  totalValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#F88000'
  },
  sellerInfo: {
    background: '#f8f9fa',
    borderRadius: '12px',
    padding: '16px'
  },
  sellerTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#000',
    margin: '0 0 12px 0'
  },
  sellerName: {
    fontSize: '14px',
    color: '#000',
    margin: '0 0 8px 0'
  },
  sellerEmail: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },

  // Loading State
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#EAF4FE'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(248, 128, 0, 0.1)',
    borderTop: '4px solid #F88000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  loadingText: {
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '500'
  }
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    input:focus, textarea:focus {
      border-color: #F88000 !important;
    }
    
    .radio-label:has(input:checked) {
      border-color: #F88000 !important;
      background: rgba(248, 128, 0, 0.05) !important;
    }
  `;
  document.head.appendChild(styleSheet);
}
