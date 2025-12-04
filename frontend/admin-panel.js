import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

  // Authentication - using cookie-based auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  // Dashboard State
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [deployStatus, setDeployStatus] = useState(null);

  // User Management
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, dateRange]);

  const triggerBackendDeploy = async () => {
    if (!isAuthenticated) return;
    setDeployStatus('running');
    try {
      const response = await fetch(`${API_URL}/admin/deploy`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      setDeployStatus(response.ok ? `completed (code ${data.exitCode})` : `failed: ${data.error || 'unknown'}`);
    } catch (e) {
      setDeployStatus(`failed: ${e.message}`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginForm)
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();

      // Check if user is admin
      if (data.user.role !== 'admin' && !data.user.roles?.includes('admin')) {
        throw new Error('Unauthorized: Admin access only');
      }

      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel using cookie-based auth
      const [statsRes, usersRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats?range=${dateRange}`, { credentials: 'include' }),
        fetch(`${API_URL}/admin/users?page=${currentPage}&limit=${itemsPerPage}`, { credentials: 'include' }),
        fetch(`${API_URL}/admin/orders?page=${currentPage}&limit=${itemsPerPage}`, { credentials: 'include' })
      ]);

      // Handle authentication errors
      if (statsRes.status === 401 || usersRes.status === 401 || ordersRes.status === 401) {
        console.warn('Admin session expired, logging out');
        logout();
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleUserAction = async (action, userId, data = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Action failed');

      fetchDashboardData();
      setShowUserModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setIsAuthenticated(false);
  };

  // Mock stats for demonstration (replace with actual API data)
  const mockStats = {
    totalUsers: 1247,
    totalOrders: 3542,
    activeOrders: 89,
    completedOrders: 3201,
    revenue: 125480,
    newUsers: 45,
    userGrowth: [
      { date: '2024-01', users: 850 },
      { date: '2024-02', users: 920 },
      { date: '2024-03', users: 1050 },
      { date: '2024-04', users: 1150 },
      { date: '2024-05', users: 1247 }
    ],
    ordersByStatus: [
      { name: 'Pending Bids', value: 45, color: '#FCD34D' },
      { name: 'Accepted', value: 20, color: '#60A5FA' },
      { name: 'In Transit', value: 24, color: '#F472B6' },
      { name: 'Delivered', value: 3201, color: '#34D399' }
    ],
    revenueData: [
      { month: 'Jan', revenue: 18500 },
      { month: 'Feb', revenue: 22000 },
      { month: 'Mar', revenue: 25000 },
      { month: 'Apr', revenue: 28500 },
      { month: 'May', revenue: 31480 }
    ]
  };

  const displayStats = stats || mockStats;

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '3rem',
          maxWidth: '28rem',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              🛡️ Admin Dashboard
            </h1>
            <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
              Matrix Delivery System Control
            </p>
          </div>

          {error && (
            <div style={{
              background: '#FEE2E2',
              color: '#991B1B',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Admin Email
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="admin@matrix-delivery.com"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '0.875rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? '🔄 Authenticating...' : '🔐 Sign In'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '0.75rem',
            marginTop: '1.5rem'
          }}>
            ⚡ Secured with end-to-end encryption
          </p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, change, icon, color }) => (
    <div style={{
      background: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: `2px solid ${color}20`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>{title}</p>
          <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1F2937' }}>{value}</p>
        </div>
        <div style={{
          background: `${color}20`,
          color: color,
          width: '3rem',
          height: '3rem',
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem'
        }}>
          {icon}
        </div>
      </div>
      {change && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            color: change > 0 ? '#10B981' : '#EF4444',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>vs last period</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              🛡️ Admin Dashboard
            </h1>
            <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Matrix Delivery System Control</p>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'background 0.2s'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{
        background: 'white',
        borderBottom: '2px solid #E5E7EB',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          gap: '0.5rem',
          padding: '0 2rem',
          alignItems: 'center'
        }}>
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'users', label: '👥 Users', icon: '👥' },
            { id: 'orders', label: '📦 Orders', icon: '📦' },
            { id: 'analytics', label: '📈 Analytics', icon: '📈' },
            { id: 'logs', label: '📋 Logs', icon: '📋' },
            { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6B7280',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={triggerBackendDeploy}
              style={{
                padding: '0.75rem 1rem',
                background: '#F59E0B',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              🚀 Deploy Backend
            </button>
            {deployStatus && (
              <span style={{ fontSize: '0.75rem', color: deployStatus.startsWith('completed') ? '#10B981' : '#EF4444' }}>
                {`Deploy: ${deployStatus}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {activeTab === 'overview' && (
          <div>
            {/* Date Range Filter */}
            <div style={{
              background: 'white',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              {['24h', '7d', '30d', '90d'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: dateRange === range ? '#667eea' : '#F3F4F6',
                    color: dateRange === range ? 'white' : '#6B7280',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}
                >
                  {range === '24h' ? 'Last 24 Hours' :
                    range === '7d' ? 'Last 7 Days' :
                      range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                </button>
              ))}
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <StatCard
                title="Total Users"
                value={displayStats.totalUsers.toLocaleString()}
                change={12.5}
                icon="👥"
                color="#667eea"
              />
              <StatCard
                title="Total Orders"
                value={displayStats.totalOrders.toLocaleString()}
                change={8.3}
                icon="📦"
                color="#f093fb"
              />
              <StatCard
                title="Active Orders"
                value={displayStats.activeOrders}
                icon="🚚"
                color="#4ade80"
              />
              <StatCard
                title="Revenue"
                value={`$${displayStats.revenue.toLocaleString()}`}
                change={15.2}
                icon="💰"
                color="#fbbf24"
              />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Revenue Chart */}
              <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  📈 Revenue Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={displayStats.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#667eea" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Orders by Status */}
              <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  📊 Orders by Status
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={displayStats.ordersByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {displayStats.ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Growth Chart */}
            <div style={{
              background: 'white',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                👥 User Growth
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={displayStats.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Bar dataKey="users" fill="#667eea" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            {/* User Management Header */}
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Search users by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    minWidth: '150px'
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="customer">Customers</option>
                  <option value="driver">Drivers</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#F0F9FF', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Total Users</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>1,247</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#FEF3C7', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Customers</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>892</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#D1FAE5', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Drivers</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>355</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#FCE7F3', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Verified</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>1,105</p>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div style={{
              background: 'white',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>User</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Role</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Rating</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Orders</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Joined</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(10)].map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                          }}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <div>
                            <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
                              User Name {i + 1}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>user{i + 1}@example.com</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: i % 2 === 0 ? '#DBEAFE' : '#FEF3C7',
                          color: i % 2 === 0 ? '#1E40AF' : '#92400E'
                        }}>
                          {i % 2 === 0 ? 'Customer' : 'Driver'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: i % 3 === 0 ? '#D1FAE5' : '#FEE2E2',
                          color: i % 3 === 0 ? '#065F46' : '#991B1B'
                        }}>
                          {i % 3 === 0 ? '✓ Verified' : '⏳ Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ color: '#FCD34D', fontSize: '1rem' }}>★</span>
                          <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                            {(4.0 + Math.random()).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                        {Math.floor(Math.random() * 50)}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#6B7280' }}>
                        {new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedUser({ id: i + 1, name: `User ${i + 1}` });
                              setShowUserModal(true);
                            }}
                            style={{
                              padding: '0.375rem 0.75rem',
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            View
                          </button>
                          <button
                            style={{
                              padding: '0.375rem 0.75rem',
                              background: i % 3 === 0 ? '#EF4444' : '#10B981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            {i % 3 === 0 ? 'Suspend' : 'Verify'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                📦 Order Management
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#FEF3C7', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Pending Bids</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#92400E' }}>45</p>
                </div>
                <div style={{ padding: '1rem', background: '#DBEAFE', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Accepted</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1E40AF' }}>89</p>
                </div>
                <div style={{ padding: '1rem', background: '#FCE7F3', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>In Transit</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#831843' }}>124</p>
                </div>
                <div style={{ padding: '1rem', background: '#D1FAE5', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Delivered</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#065F46' }}>3,201</p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Order ID</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Customer</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Driver</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Amount</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Date</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(15)].map((_, i) => {
                      const statuses = ['pending_bids', 'accepted', 'in_transit', 'delivered'];
                      const status = statuses[i % statuses.length];
                      const statusColors = {
                        pending_bids: { bg: '#FEF3C7', text: '#92400E' },
                        accepted: { bg: '#DBEAFE', text: '#1E40AF' },
                        in_transit: { bg: '#FCE7F3', text: '#831843' },
                        delivered: { bg: '#D1FAE5', text: '#065F46' }
                      };

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                            ORD-{1700000000000 + i}-{String(i).padStart(3, '0')}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>Customer {i + 1}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                            {status === 'pending_bids' ? '—' : `Driver ${i + 1}`}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: statusColors[status].bg,
                              color: statusColors[status].text
                            }}>
                              {status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                            ${(50 + Math.random() * 150).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#6B7280' }}>
                            {new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  background: '#667eea',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                📈 Advanced Analytics
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Platform Performance</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Average Order Value</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>$87.50</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Order Completion Rate</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10B981' }}>94.3%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Average Delivery Time</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>2.4 hrs</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Customer Satisfaction</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10B981' }}>4.7/5.0</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Top Performers</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        background: '#F9FAFB',
                        borderRadius: '0.5rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${['#667eea', '#f093fb', '#4ade80', '#fbbf24', '#f87171'][i]} 0%, ${['#764ba2', '#f5576c', '#22c55e', '#f59e0b', '#dc2626'][i]} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1.25rem'
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
                            Driver {i + 1}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                            {250 - i * 30} deliveries • ⭐ {(4.8 - i * 0.1).toFixed(1)}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#10B981' }}>
                            ${(15000 - i * 2000).toLocaleString()}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>earned</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Order Volume by Hour</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { hour: '00:00', orders: 12 },
                    { hour: '04:00', orders: 8 },
                    { hour: '08:00', orders: 45 },
                    { hour: '12:00', orders: 89 },
                    { hour: '16:00', orders: 67 },
                    { hour: '20:00', orders: 54 },
                    { hour: '23:00', orders: 28 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="hour" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#667eea" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                📋 System Activity Logs
              </h2>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {['All', 'Users', 'Orders', 'Payments', 'System', 'Errors'].map(filter => (
                  <button
                    key={filter}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[...Array(20)].map((_, i) => {
                  const logTypes = [
                    { icon: '👤', color: '#667eea', action: 'User registered', type: 'user' },
                    { icon: '📦', color: '#f093fb', action: 'Order created', type: 'order' },
                    { icon: '💰', color: '#4ade80', action: 'Payment processed', type: 'payment' },
                    { icon: '🚚', color: '#fbbf24', action: 'Delivery completed', type: 'delivery' },
                    { icon: '⚠️', color: '#f87171', action: 'Error logged', type: 'error' }
                  ];
                  const log = logTypes[i % logTypes.length];

                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: '#F9FAFB',
                      borderRadius: '0.5rem',
                      borderLeft: `4px solid ${log.color}`
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '0.5rem',
                        background: `${log.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                      }}>
                        {log.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
                          {log.action}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                          User ID: USER{1000 + i} • IP: 192.168.{Math.floor(Math.random() * 255)}.{Math.floor(Math.random() * 255)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                          {new Date(Date.now() - i * 3600000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                ⚙️ System Settings
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>General Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        Platform Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Matrix Delivery"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        Platform Commission (%)
                      </label>
                      <input
                        type="number"
                        defaultValue="15"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        Default Currency
                      </label>
                      <select
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                        <option>GBP (£)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Security Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { label: 'Enable Two-Factor Authentication', checked: true },
                      { label: 'Require Email Verification', checked: true },
                      { label: 'Enable IP Whitelisting', checked: false },
                      { label: 'Log All Admin Actions', checked: true }
                    ].map((setting, i) => (
                      <label key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '1rem',
                        background: '#F9FAFB',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          defaultChecked={setting.checked}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{setting.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#DC2626' }}>
                  ⚠️ Danger Zone
                </h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#FEE2E2',
                      color: '#991B1B',
                      border: '2px solid #FCA5A5',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}
                  >
                    🗑️ Clear All Logs
                  </button>
                  <button
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#FEE2E2',
                      color: '#991B1B',
                      border: '2px solid #FCA5A5',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}
                  >
                    💾 Backup Database
                  </button>
                  <button
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#DC2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}
                  >
                    🔄 Reset System
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* User Modal */}
      {showUserModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '2px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>User Details</h3>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6B7280'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
                Manage user account and permissions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={() => handleUserAction('verify', selectedUser.id)}
                  disabled={loading}
                  style={{
                    padding: '0.75rem',
                    background: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  ✓ Verify User
                </button>
                <button
                  style={{
                    padding: '0.75rem',
                    background: '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ⏸️ Suspend Account
                </button>
                <button
                  style={{
                    padding: '0.75rem',
                    background: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🗑️ Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard
