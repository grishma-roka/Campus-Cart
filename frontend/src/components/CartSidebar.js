import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShoppingBag, X, Trash2 } from 'lucide-react';

export default function CartSidebar() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const backendUrl = 'http://localhost:5000';

  if (!isCartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        style={styles.overlay}
        onClick={() => setIsCartOpen(false)}
      />
      
      {/* Cart Sidebar */}
      <div style={styles.cartSidebar}>
        {/* Header */}
        <div style={styles.cartHeader}>
          <h2 style={styles.cartTitle}>
            Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
          </h2>
          <button 
            onClick={() => setIsCartOpen(false)}
            style={styles.closeButton}
          >
            <X size={24} color="#64748b" strokeWidth={1.5} />
          </button>
        </div>

        {/* Cart Items */}
        <div style={styles.cartContent}>
          {cartItems.length === 0 ? (
            <div style={styles.emptyCart}>
              <div style={styles.emptyIcon}><ShoppingBag size={64} strokeWidth={1.5} color="#cbd5e1" /></div>
              <h3 style={styles.emptyTitle}>Your cart is lonely!</h3>
              <p style={styles.emptyText}>Add some gadgets to keep it company.</p>
            </div>
          ) : (
            <>
              {cartItems.map(item => (
                <div key={item.id} style={styles.cartItem}>
                  <img 
                    src={item.image 
                      ? (item.image.startsWith('http') ? item.image : `${backendUrl}${item.image}`)
                      : `https://dummyimage.com/100x100/4CAF50/ffffff&text=${encodeURIComponent(item.title.substring(0, 3))}`}
                    alt={item.title}
                    style={styles.itemImage}
                  />
                  <div style={styles.itemDetails}>
                    <h4 style={styles.itemTitle}>{item.title}</h4>
                    <p style={styles.itemPrice}>{Number(item.price).toLocaleString('en-IN', { style: 'currency', currency: 'NPR' })}</p>
                    <p style={styles.quantityText}>Quantity: 1</p>
                  </div>
                  
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    style={{...styles.removeButton, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                    title="Remove from cart"
                  >
                    <Trash2 size={18} color="#ef4444" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div style={styles.cartFooter}>

            <div style={styles.totalSection}>
              <div style={styles.estimatedRow}>
                <span style={styles.estimatedLabel}>Estimated Total</span>
                <span style={styles.estimatedAmount}>{getCartTotal().toLocaleString('en-IN', { style: 'currency', currency: 'NPR' })}</span>
              </div>
            </div>
            
            <button 
              onClick={() => { setIsCartOpen(false); navigate('/checkout'); }}
              style={styles.checkoutButton}
            >
              Checkout
            </button>
            
            <button 
              onClick={() => setIsCartOpen(false)}
              style={styles.clearButton}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
    animation: 'fadeIn 0.3s ease'
  },
  cartSidebar: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '100%',
    maxWidth: '420px',
    height: '100vh',
    backgroundColor: '#fff',
    boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.04)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.3s ease',
    fontFamily: 'Inter, sans-serif'
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid #E0E0E0',
    backgroundColor: '#fff'
  },
  cartTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Inter, sans-serif'
  },
  cartIcon: {
    fontSize: '28px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  cartContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px'
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    padding: '48px 24px'
  },
  emptyIcon: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'center',
    opacity: 0.8
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  cartItem: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#F6F6F6',
    borderRadius: '16px',
    marginBottom: '12px',
    position: 'relative'
  },
  itemImage: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '12px',
    backgroundColor: '#fff'
  },
  itemDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  itemTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
    color: '#000',
    lineHeight: '1.3',
    fontFamily: 'Inter, sans-serif'
  },
  itemPrice: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#F88000'
  },
  quantityText: {
    margin: 0,
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
    marginTop: '4px'
  },
  removeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    opacity: 0.6,
    transition: 'opacity 0.2s ease'
  },
  cartFooter: {
    padding: '24px',
    borderTop: '1px solid #E0E0E0',
    backgroundColor: '#fff'
  },
  promoSection: {
    marginBottom: '20px'
  },
  promoInput: {
    display: 'none'
  },
  promoButton: {
    background: 'none',
    border: 'none',
    color: '#F88000',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    textAlign: 'left'
  },
  totalSection: {
    marginBottom: '20px'
  },
  subtotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb'
  },
  subtotalLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b'
  },
  subtotalAmount: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b'
  },
  estimatedRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 0 20px 0'
  },
  estimatedLabel: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Inter, sans-serif'
  },
  estimatedAmount: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#F88000'
  },
  totalLabel: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  totalAmount: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#F88000'
  },
  checkoutButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#F88000',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'all 0.3s ease',
    fontFamily: 'Inter, sans-serif'
  },
  clearButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#fff',
    color: '#F88000',
    border: '2px solid #F88000',
    borderRadius: '24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'Inter, sans-serif'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`;
document.head.appendChild(styleSheet);
