import React, { useMemo, useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:3002/api';

const sizeOptions = ['All sizes', '4', '5', '6', '7', '8', '10', '12', '14'];
const typeOptions = ['All types', 'T-Shirt', 'Polo', 'Shirt', 'Jeans', 'Dress', 'Skirt', 'Hoodie', 'Kurta'];
const priceOptions = [
  { label: 'All prices', value: 'all' },
  { label: 'Under 500', value: 'under-500' },
  { label: '500 - 999', value: '500-999' },
  { label: '1000 - 1499', value: '1000-1499' },
  { label: '1500+', value: '1500-plus' },
];

const getBestGender = (item) => {
  const text = `${item.name || ''} ${item.category || ''} ${item.brand || ''}`.toLowerCase();
  if (text.includes('girl') || text.includes('women') || text.includes('female')) return 'girl';
  if (text.includes('boy') || text.includes('men') || text.includes('male')) return 'boy';
  return 'all';
};

const QRCode = ({ code }) => (
  <svg viewBox="0 0 160 160" className="qr-code" role="img" aria-label="Customer quick response code">
    <rect width="160" height="160" rx="18" fill="#fff" />
    {Array.from({ length: 8 }).map((_, row) =>
      Array.from({ length: 8 }).map((__, col) => {
        const shouldFill =
          (row + col + (row % 3) + (col % 2)) % 2 === 0 || (row > 1 && row < 6 && col > 1 && col < 6);
        return (
          <rect
            key={`${row}-${col}`}
            x={row * 16 + 10}
            y={col * 16 + 10}
            width="12"
            height="12"
            fill={shouldFill ? '#0f172a' : '#fff'}
            rx="2"
          />
        );
      })
    )}
    <text x="80" y="150" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
      {code}
    </text>
  </svg>
);

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('pos_token') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTab, setSelectedTab] = useState('catalogue');
  const [selectedGender, setSelectedGender] = useState('boy');
  const [selectedSize, setSelectedSize] = useState('All sizes');
  const [selectedType, setSelectedType] = useState('All types');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [customerName, setCustomerName] = useState('');
  const [cart, setCart] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const apiCall = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      body: options.body ? options.body : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  };

  const loadInventory = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [productData, categoryData] = await Promise.all([
        apiCall('/products'),
        apiCall('/categories'),
      ]);
      setInventory(productData);
      setCategories(categoryData || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadInventory();
    }
  }, [token]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });
      localStorage.setItem('pos_token', data.token);
      setToken(data.token);
      setError('');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('pos_token');
    setToken('');
    setInventory([]);
    setCart([]);
    setCustomerName('');
  };

  const catalogueItems = useMemo(() => {
    return inventory.filter((item) => {
      const genderMatch =
        selectedGender === 'all' ||
        getBestGender(item) === selectedGender ||
        (selectedGender === 'boy' && getBestGender(item) !== 'girl') ||
        (selectedGender === 'girl' && getBestGender(item) !== 'boy');

      const sizeMatch = selectedSize === 'All sizes' || String(item.size).includes(String(selectedSize));
      const typeMatch = selectedType === 'All types' || item.category === selectedType || item.name.includes(selectedType);

      let priceMatch = true;
      if (selectedPrice === 'under-500') priceMatch = Number(item.price) < 500;
      if (selectedPrice === '500-999') priceMatch = Number(item.price) >= 500 && Number(item.price) <= 999;
      if (selectedPrice === '1000-1499') priceMatch = Number(item.price) >= 1000 && Number(item.price) <= 1499;
      if (selectedPrice === '1500-plus') priceMatch = Number(item.price) >= 1500;

      return genderMatch && sizeMatch && typeMatch && priceMatch;
    });
  }, [inventory, selectedGender, selectedSize, selectedType, selectedPrice]);

  const addToCart = (item) => {
    setCart((currentCart) => {
      const found = currentCart.find((cartItem) => cartItem.id === item.id);
      if (!found) {
        return [...currentCart, { ...item, quantity: 1 }];
      }

      if (found.quantity >= item.stock) {
        setError('Insufficient stock for this item.');
        return currentCart;
      }

      return currentCart.map((cartItem) =>
        cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
      );
    });
    setError('');
  };

  const updateCartItem = (id, delta) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== id) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.stock) {
            setError('Quantity exceeds available stock.');
            return item;
          }
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean)
    );
    setError('');
  };

  const total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  const handleSale = async () => {
    if (!cart.length) {
      setError('Add at least one product to the bill.');
      return;
    }

    setLoading(true);
    try {
      await apiCall('/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.id,
            price: Number(item.price),
            quantity: Number(item.quantity),
          })),
          total,
          customerName: customerName.trim() || null,
          cartDiscount: 0,
        }),
      });

      setCart([]);
      setCustomerName('');
      setError('');
      alert('Sale completed successfully.');
      await loadInventory();
    } catch (err) {
      setError(err.message || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (id, additionalStock) => {
    try {
      await apiCall(`/products/${id}/restock`, {
        method: 'PUT',
        body: JSON.stringify({ additionalStock: Number(additionalStock) }),
      });
      await loadInventory();
      setError('');
      alert('Stock updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to restock item');
    }
  };

  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <p className="eyebrow">POS access</p>
          <h1>Garments POS Login</h1>
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
            {error && <div className="form-error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="catalogue-app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Retail digital catalogue</p>
          <h1>Garments POS System</h1>
        </div>

        <div className="top-actions">
          <div className="customer-qr-panel">
            <div className="qr-label">Customer QR</div>
            <QRCode code="CUST-2047" />
          </div>
          <button type="button" className="logout-button" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tab-bar">
        {['catalogue', 'inventory', 'labels', 'billing'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={selectedTab === tab ? 'active' : ''}
            onClick={() => setSelectedTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {error && <div className="global-alert">{error}</div>}

      {selectedTab === 'catalogue' && (
        <main className="catalogue-layout">
          <aside className="filter-panel">
            <div className="panel-header">
              <span className="badge">Quick filter</span>
              <h2>Build customer look</h2>
            </div>

            <div className="filter-block">
              <label>Customer type</label>
              <div className="segmented-control">
                <button type="button" className={selectedGender === 'boy' ? 'active' : ''} onClick={() => setSelectedGender('boy')}>Boy</button>
                <button type="button" className={selectedGender === 'girl' ? 'active' : ''} onClick={() => setSelectedGender('girl')}>Girl</button>
              </div>
            </div>

            <div className="filter-block">
              <label htmlFor="size-select">Select size</label>
              <select id="size-select" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="filter-block">
              <label htmlFor="type-select">Select type</label>
              <select id="type-select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="filter-block">
              <label htmlFor="price-select">Select price</label>
              <select id="price-select" value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)}>
                {priceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="summary-box">
              <p>Available styles</p>
              <strong>{catalogueItems.length}</strong>
              <span>matching products</span>
            </div>
          </aside>

          <section className="results-panel">
            <div className="results-header">
              <div>
                <p className="eyebrow dark">Catalogue</p>
                <h2>{selectedGender === 'boy' ? 'Boys collection' : 'Girls collection'}</h2>
              </div>
              <span className="result-count">{catalogueItems.length} items</span>
            </div>

            {loading ? (
              <div className="status-box">Loading inventory...</div>
            ) : (
              <div className="product-grid">
                {catalogueItems.length > 0 ? (
                  catalogueItems.map((item) => (
                    <article className="product-card" key={item.id}>
                      <div className="product-visual">{item.category?.includes('Dress') || item.name?.toLowerCase().includes('dress') ? '??' : '??'}</div>
                      <div className="product-body">
                        <div className="card-topline">
                          <span className="product-type">{item.category || 'General'}</span>
                          <span className="product-stock">{item.stock} in stock</span>
                        </div>
                        <h3>{item.name}</h3>
                        <p>{item.color || 'Standard color'} • Size {item.size}</p>
                        <div className="size-row">
                          <span>Barcode</span>
                          <strong>{item.barcode}</strong>
                        </div>
                        <div className="price-row">
                          <div>
                            <small>Price</small>
                            <strong>{Number(item.price)}</strong>
                          </div>
                          <button type="button" onClick={() => addToCart(item)}>Add to bill</button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <h3>No matching items</h3>
                    <p>Try a different size, category, or price range.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      )}

      {selectedTab === 'inventory' && (
        <section className="panel-box">
          <div className="panel-header">
            <h2>Inventory</h2>
          </div>
          <div className="inventory-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Barcode</th>
                  <th>Restock</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.size}</td>
                    <td>{Number(item.price)}</td>
                    <td>{item.stock}</td>
                    <td>{item.barcode}</td>
                    <td>
                      <div className="restock-wrap">
                        <input
                          type="number"
                          min="1"
                          defaultValue="5"
                          id={`restock-${item.id}`}
                        />
                        <button type="button" onClick={() => handleRestock(item.id, document.getElementById(`restock-${item.id}`).value)}>
                          Add
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedTab === 'labels' && (
        <section className="panel-box">
          <div className="panel-header">
            <h2>Label printing</h2>
          </div>
          <div className="label-grid">
            {inventory.slice(0, 12).map((item) => (
              <div key={item.id} className="label-item">
                <div className="label-top">
                  <span>{item.name}</span>
                  <strong>{Number(item.price)}</strong>
                </div>
                <div className="label-meta">
                  <span>Size: {item.size}</span>
                  <span>Barcode: {item.barcode}</span>
                </div>
                <button type="button" onClick={() => window.print()}>
                  Print label
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedTab === 'billing' && (
        <section className="billing-layout">
          <div className="panel-box billing-panel">
            <div className="panel-header">
              <h2>Billing</h2>
            </div>
            <div className="customer-field">
              <label htmlFor="customer-name">Customer name</label>
              <input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="bill-items">
              {cart.length === 0 ? (
                <p className="empty-note">No items in bill yet.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="bill-item">
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.size}</small>
                    </div>
                    <div className="qty-controls">
                      <button type="button" onClick={() => updateCartItem(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateCartItem(item.id, 1)}>+</button>
                    </div>
                    <span>{Number(item.price) * item.quantity}</span>
                  </div>
                ))
              )}
            </div>
            <div className="bill-total">
              <span>Total</span>
              <strong>{total}</strong>
            </div>
            <button type="button" className="complete-sale" onClick={handleSale} disabled={loading || !cart.length}>
              {loading ? 'Processing...' : 'Complete sale'}
            </button>
          </div>

          <div className="panel-box product-panel">
            <div className="panel-header">
              <h2>Add from catalogue</h2>
            </div>
            <div className="quick-grid">
              {catalogueItems.slice(0, 12).map((item) => (
                <div className="quick-item" key={item.id}>
                  <span>{item.name}</span>
                  <small>{item.size}</small>
                  <strong>{Number(item.price)}</strong>
                  <button type="button" onClick={() => addToCart(item)}>Add</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
