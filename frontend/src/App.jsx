import React, { useState, useEffect } from 'react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  useEffect(() => {
    fetchProducts();
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (err) {
      console.warn("Backend not ready yet:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        throw new Error('Failed to load products');
      }
    } catch (err) {
      console.error(err);
      // Fallback mock items with realistic INR prices
      setProducts([
        {
          id: 1,
          title: "Aura ANC Pro Wireless Headphones",
          category: "Audio",
          price: 14999.00,
          rating: 4.9,
          image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
          description: "Studio-grade acoustic architecture with adaptive hybrid active noise cancellation.",
          stock: 25
        },
        {
          id: 2,
          title: "Vanguard Titanium Smartwatch",
          category: "Wearables",
          price: 24999.00,
          rating: 4.8,
          image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
          description: "Aerospace-grade titanium chassis, always-on OLED sapphire screen, 7-day battery.",
          stock: 18
        },
        {
          id: 3,
          title: "HyperShift Mechanical Keyboard",
          category: "Peripherals",
          price: 8499.00,
          rating: 4.7,
          image_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
          description: "Gasket-mounted hot-swappable switches, PBT double-shot keycaps, RGB backlighting.",
          stock: 30
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openOrdersModal = () => {
    fetchOrders();
    setIsOrdersModalOpen(true);
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`Added "${product.title}" to cart!`);
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName || !customerEmail) {
      alert("Please enter your name and email.");
      return;
    }

    try {
      setIsSubmitting(true);
      const itemsSummary = cart.map(i => `${i.title} (x${i.qty})`).join(', ');
      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        items_summary: itemsSummary,
        total_amount: parseFloat(cartSubtotal.toFixed(2))
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const orderData = await res.json();
        showToast(`Order #${orderData.id} placed & stored in PostgreSQL!`);
        setCart([]);
        setCustomerName('');
        setCustomerEmail('');
        setIsCartOpen(false);
      } else {
        alert("Failed to create order on server.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting order: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['All', 'Audio', 'Wearables', 'Peripherals', 'Lifestyle', 'Display'];
  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="app-container">
      {/* Port Security & DevOps Bar */}
      <div className="port-security-bar">
        <div className="port-status-group">
          <div className="port-tag">
            <span className="indicator public"></span>
            <strong>Open Port:</strong> 80 (Public HTTP via Nginx)
          </div>
          <div className="port-tag">
            <span className="indicator private"></span>
            <strong>Private Port:</strong> 8000 (FastAPI Internal)
          </div>
          <div className="port-tag">
            <span className="indicator private"></span>
            <strong>Private Port:</strong> 5432 (PostgreSQL Internal)
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Status:</span>
          <span style={{ color: systemHealth ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
            {systemHealth ? '● Docker Services Healthy' : '○ Initializing Backend'}
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-title">NEXUS STORE</h1>
          </div>
        </div>

        <div className="nav-actions">
          <button className="nav-btn" onClick={() => setIsArchModalOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            Port Architecture
          </button>

          <button className="nav-btn" onClick={openOrdersModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Orders in DB
          </button>

          <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Cart
            {totalCartCount > 0 && <span className="cart-badge">{totalCartCount}</span>}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-subtitle">Premium Audio &amp; Studio Gear</div>
        <h2 className="hero-title">Next-Gen Gear. Studio Engineering.</h2>
        <p className="hero-desc">
          Discover high-performance wireless acoustics, tactile mechanical keyboards, and precision peripherals engineered for creators.
        </p>
      </section>

      {/* Category Filter */}
      <section className="filter-bar">
        <div className="category-chips">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Showing {filteredProducts.length} items
        </div>
      </section>

      {/* Products Grid */}
      <main className="products-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            Loading e-commerce inventory from PostgreSQL...
          </div>
        ) : (
          filteredProducts.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-img-wrapper">
                <img src={p.image_url} alt={p.title} className="product-img" loading="lazy" />
                <span className="product-category-tag">{p.category}</span>
                <span className="product-rating">
                  ★ {p.rating}
                </span>
              </div>
              <div className="product-info">
                <h3 className="product-title">{p.title}</h3>
                <p className="product-desc">{p.description}</p>
                <div className="product-footer">
                  <div className="price-box">
                    <span className="price-label">Price</span>
                    <span className="product-price">₹{Number(p.price).toLocaleString('en-IN')}</span>
                  </div>
                  <button className="add-btn" onClick={() => addToCart(p)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add to Cart
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </main>

      {/* Cart & Checkout Modal */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Shopping Cart & Checkout</h3>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}>✕</button>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-secondary)' }}>
                Your cart is empty. Add some high-tech gear!
              </div>
            ) : (
              <>
                <div className="cart-items-list">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-details">
                        <img src={item.image_url} alt={item.title} className="cart-thumb" />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</div>
                          <div style={{ color: '#38bdf8', fontSize: '0.85rem' }}>₹{Number(item.price).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      <div className="cart-qty-ctrl">
                        <button className="qty-btn" onClick={() => updateCartQty(item.id, -1)}>-</button>
                        <span style={{ fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateCartQty(item.id, 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <span style={{ color: 'var(--text-secondary)' }}>Order Total:</span>
                  <span className="total-amount">₹{Number(cartSubtotal).toLocaleString('en-IN')}</span>
                </div>

                <form className="checkout-form" onSubmit={handleCheckout}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Alex Morgan"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="alex@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving to Database...' : `Place Order (₹${Number(cartSubtotal).toLocaleString('en-IN')})`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Port Security & Architecture Modal */}
      {isArchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsArchModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Port Exposure & Security Matrix</h3>
              <button className="close-btn" onClick={() => setIsArchModalOpen(false)}>✕</button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              <strong>Network Security Architecture:</strong> Only port 80 is open to external traffic; all database and backend ports remain strictly private.
            </p>

            <table className="port-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Internal Port</th>
                  <th>Host / Public Port</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Nginx + React Frontend</strong></td>
                  <td>80</td>
                  <td>80 (HTTP)</td>
                  <td><span className="badge-open">OPEN (Public)</span></td>
                </tr>
                <tr>
                  <td><strong>FastAPI Backend</strong></td>
                  <td>8000</td>
                  <td>None (Not published)</td>
                  <td><span className="badge-private">PRIVATE</span></td>
                </tr>
                <tr>
                  <td><strong>PostgreSQL Database</strong></td>
                  <td>5432</td>
                  <td>None (Not published)</td>
                  <td><span className="badge-private">PRIVATE</span></td>
                </tr>
              </tbody>
            </table>

            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <strong>Why this architecture is secure:</strong>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                <li>Only port <strong>80</strong> is mapped in <code>docker-compose.yml</code> (<code>80:80</code>).</li>
                <li>Nginx receives all browser traffic. Requests starting with <code>/api</code> are reverse-proxied internally to <code>http://backend:8000</code>.</li>
                <li>The PostgreSQL container (<code>5432</code>) has NO published host port, preventing any external attackers from querying or dumping the database.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Orders History Modal */}
      {isOrdersModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOrdersModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">PostgreSQL Order Records</h3>
              <button className="close-btn" onClick={() => setIsOrdersModalOpen(false)}>✕</button>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                No orders recorded yet. Place one from the cart to test database persistence!
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="order-card">
                  <div className="order-top">
                    <strong>Order #{o.id} — {o.customer_name}</strong>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="order-items">{o.items_summary}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    Customer: {o.customer_email} • Status: {o.status} • Placed: {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="toast">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        NexusStore Cloud Platform • Enterprise Containerized E-Commerce Architecture
      </footer>
    </div>
  );
}
