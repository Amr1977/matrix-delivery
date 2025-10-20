import React, { useState, useEffect } from 'react';

const DeliveryApp = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  const [authState, setAuthState] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer'
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fromLocation: '',
    toLocation: '',
    price: ''
  });

  const [bidInput, setBidInput] = useState({});

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      setCurrentUser(data);
      setError('');
      fetchOrders();
    } catch (err) {
      console.error(err);
      logout();
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!authForm.name || !authForm.email || !authForm.password) {
      setError('All fields required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setAuthForm({ name: '', email: '', password: '', role: 'customer' });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) {
      setError('Email and password required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setAuthForm({ name: '', email: '', password: '', role: 'customer' });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setOrders([]);
    setAuthState('login');
    setError('');
  };

  const handlePublishOrder = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.fromLocation || !formData.toLocation) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const newOrder = {
        title: formData.title,
        description: formData.description,
        from: {
          lat: 40.7128 + Math.random() * 0.1,
          lng: -74.0060 + Math.random() * 0.1,
          name: formData.fromLocation
        },
        to: {
          lat: 40.7589 + Math.random() * 0.1,
          lng: -73.9851 + Math.random() * 0.1,
          name: formData.toLocation
        },
        price: parseFloat(formData.price),
        status: 'open',
        bids: [],
        assignedDriver: null
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOrder)
      });

      if (!response.ok) throw new Error('Failed to publish order');

      setFormData({ title: '', description: '', fromLocation: '', toLocation: '', price: '' });
      setShowOrderForm(false);
      fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBidOnOrder = async (orderId, bidPrice) => {
    if (!bidPrice || parseFloat(bidPrice) <= 0) {
      setError('Enter a valid bid price');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bidPrice: parseFloat(bidPrice) })
      });

      if (!response.ok) throw new Error('Failed to place bid');

      fetchOrders();
      setBidInput({ ...bidInput, [orderId]: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async (orderId, userId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to accept bid');

      fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to complete order');

      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #EFF6FF, #E0E7FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '2rem', maxWidth: '28rem', width: '100%' }}>
          <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1.5rem' }}>📦</div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1F2937', marginBottom: '0.5rem', textAlign: 'center' }}>DeliverHub</h1>
          <p style={{ color: '#6B7280', marginBottom: '1.5rem', textAlign: 'center' }}>P2P Delivery Marketplace</p>

          {error && (
            <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #FEE2E2' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {authState === 'login' ? (
              <>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Sign In</h2>
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{ width: '100%', background: '#4F46E5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? 'Loading...' : 'Sign In'}
                </button>
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setAuthState('register'); setError(''); }}
                    style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Sign Up
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Create Account</h2>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <select
                  value={authForm.role}
                  onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                >
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                </select>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  style={{ width: '100%', background: '#4F46E5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? 'Loading...' : 'Create Account'}
                </button>
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setAuthState('login'); setError(''); }}
                    style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Sign In
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <header style={{ background: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>DeliverHub</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: '600', color: '#1F2937' }}>{currentUser?.name}</p>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', textTransform: 'capitalize' }}>{currentUser?.role}</p>
            </div>
            <button
              onClick={logout}
              style={{ padding: '0.5rem 1rem', background: '#DC2626', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem' }}>
        {error && (
          <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #FEE2E2' }}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
          </div>
        )}

        {currentUser?.role === 'customer' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              disabled={loading}
              style={{ background: '#4F46E5', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              📦 {showOrderForm ? 'Cancel' : 'Publish New Order'}
            </button>
          </div>
        )}

        {showOrderForm && (
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Create New Order</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Order Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', minHeight: '80px' }}
              />
              <input
                type="text"
                placeholder="From Location"
                value={formData.fromLocation}
                onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
              />
              <input
                type="text"
                placeholder="To Location"
                value={formData.toLocation}
                onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
              />
              <input
                type="number"
                placeholder="Price ($)"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                step="0.01"
              />
              <button
                onClick={handlePublishOrder}
                disabled={loading}
                style={{ background: '#10B981', color: 'white', padding: '0.5rem', borderRadius: '0.375rem', fontWeight: '600', border: 'none', cursor: 'pointer' }}
              >
                {loading ? 'Publishing...' : 'Publish Order'}
              </button>
            </div>
          </div>
        )}

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {currentUser?.role === 'customer' ? 'My Orders' : 'Available Orders'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '0.5rem' }}>No orders available</p>
          ) : (
            orders.map((order) => (
              <div key={order._id || order.id} style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{order.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>{order.description}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4F46E5', marginBottom: '0.5rem' }}>${order.price.toFixed ? order.price.toFixed(2) : parseFloat(order.price).toFixed(2)}</p>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                  📍 {order.from ? `${order.from.name} → ${order.to.name}` : `Pickup: ${order.fromName} → Drop: ${order.toName}`}
                </p>
                <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '600', background: order.status === 'open' ? '#FEF3C7' : order.status === 'accepted' ? '#DBEAFE' : '#D1FAE5', color: order.status === 'open' ? '#92400E' : order.status === 'accepted' ? '#1E40AF' : '#065F46' }}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>

                {order.status === 'open' && currentUser?.role === 'driver' && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      placeholder="Your bid"
                      value={bidInput[order._id || order.id] || ''}
                      onChange={(e) => setBidInput({ ...bidInput, [order._id || order.id]: e.target.value })}
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                    />
                    <button
                      onClick={() => handleBidOnOrder(order._id || order.id, bidInput[order._id || order.id])}
                      style={{ background: '#10B981', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Bid
                    </button>
                  </div>
                )}

                {order.status === 'open' && order.bids && order.bids.length > 0 && currentUser?.role === 'customer' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Bids ({order.bids.length}):</p>
                    {order.bids.map((bid, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#F9FAFB', borderRadius: '0.375rem', marginBottom: '0.25rem' }}>
                        <span>{bid.driverName}: ${(bid.bidPrice.toFixed ? bid.bidPrice.toFixed(2) : parseFloat(bid.bidPrice).toFixed(2))}</span>
                        <button
                          onClick={() => handleAcceptBid(order._id || order.id, bid.userId)}
                          style={{ background: '#10B981', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {order.status === 'accepted' && order.assignedDriver && (currentUser?.id === order.assignedDriver?.userId) && (
                  <button
                    onClick={() => handleCompleteOrder(order._id || order.id)}
                    style={{ marginTop: '0.75rem', background: '#3B82F6', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600', width: '100%' }}
                  >
                    Complete Delivery
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default DeliveryApp;
