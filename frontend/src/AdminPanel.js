import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from './api';
import usePageVisibility from './hooks/usePageVisibility';
import LogsViewer from './components/admin/LogsViewer';
import SystemHealthDashboard from './components/admin/SystemHealthDashboard';
import { AdminPaymentsPanel } from './components/admin';
import AdminSideMenu from './components/admin/AdminSideMenu';
import { AdminWalletsPanel } from './components/admin/AdminWalletsPanel';
import { AdminWithdrawalsPanel } from './components/admin/AdminWithdrawalsPanel';

const AdminPanel = ({ onClose }) => {
  const API_URL = process.env.REACT_APP_API_URL;
  const isPageVisible = usePageVisibility();

  // Dashboard State
  const [activeTab, setActiveTab] = useState('overview');
  const [sideMenuCollapsed, setSideMenuCollapsed] = useState(false);
  const [pendingTopupCount, setPendingTopupCount] = useState(0);
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [usersPagination, setUsersPagination] = useState(null);
  const [ordersPagination, setOrdersPagination] = useState(null);
  const [userCounts, setUserCounts] = useState({ totalVerified: null });
  const [systemLogs, setSystemLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsType, setLogsType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [deployStatus, setDeployStatus] = useState(null);
  const [error, setError] = useState('');

  // User Management
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Pagination
  const [usersPage, setUsersPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const itemsPerPage = 20;

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const roleParam = filterRole === 'all' ? '' : filterRole;
      const [statsData, usersData, ordersData, vcData] = await Promise.all([
        api.get(`/admin/stats?range=${dateRange}`),
        api.get(`/admin/users?page=${usersPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}${roleParam ? '&primary_role=' + roleParam : ''}`),
        api.get(`/admin/orders?page=${ordersPage}&limit=${itemsPerPage}`),
        api.get(`/admin/users?page=1&limit=1&status=verified`)
      ]);

      setStats(statsData);
      setUsers(usersData.users || []);
      setUsersPagination(usersData.pagination || null);
      setOrders(ordersData.orders || []);
      setOrdersPagination(ordersData.pagination || null);
      setUserCounts({ totalVerified: vcData.pagination?.totalCount || null });
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Network error: ' + (err.message || 'Unable to connect to server'));
    } finally {
      setLoading(false);
    }
  }, [dateRange, usersPage, ordersPage, itemsPerPage, searchQuery, filterRole]);

  // Fetch pending topup count for badge
  const fetchPendingTopupCount = useCallback(async () => {
    try {
      const data = await api.get('/admin/topups/pending?limit=1');
      setPendingTopupCount(data.pendingCount || 0);
    } catch (err) {
      // Silently fail - badge will show 0
      setPendingTopupCount(0);
    }
  }, []);

  // Handle side menu item selection
  const handleMenuItemSelect = (itemId) => {
    setActiveTab(itemId);
  };

  // Toggle side menu collapse
  const handleToggleCollapse = () => {
    setSideMenuCollapsed(!sideMenuCollapsed);
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/logs?page=${logsPage}&limit=50&type=${logsType}`);
      setSystemLogs(data.logs || []);
      setLogsPagination(data.pagination || null);
    } catch (err) {
      setError('Network error: Unable to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [logsPage, logsType]);

  useEffect(() => {
    // Initial fetch if visible
    if (isPageVisible) {
      fetchDashboardData();
      fetchPendingTopupCount();
    }

    // Adaptive polling: 30s visible, 5m hidden
    const intervalTime = isPageVisible ? 30000 : 300000;
    const interval = setInterval(() => {
      if (isPageVisible || !document.hidden) {
        fetchDashboardData();
        fetchPendingTopupCount();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchPendingTopupCount, isPageVisible]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);



  const triggerBackendDeploy = async () => {
    setDeployStatus('running');
    try {
      const data = await api.post('/admin/deploy');
      setDeployStatus(`completed (code ${data.exitCode})`);
    } catch (e) {
      setDeployStatus(`failed: ${e.message}`);
    }
  };

  const handleUserAction = async (action, userId, data = {}) => {
    setLoading(true);
    try {
      await api.post(`/admin/users/${userId}/${action}`, data);
      fetchDashboardData();
      setShowUserModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Authentication is handled via httpOnly cookies by the parent component
    onClose(); // Close the admin panel
  };

  const updateUserRoles = async (userId, { add = [], remove = [] }) => {
    setLoading(true);
    try {
      await api.post(`/admin/users/${userId}/granted_roles`, { add, remove });
      await fetchDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayStats = stats || { totalUsers: 0, totalOrders: 0, activeOrders: 0, revenue: 0, ordersByStatus: [], revenueData: [], userGrowth: [] };

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
    <div style={{ minHeight: '100vh', background: 'var(--matrix-black)', color: 'var(--matrix-bright-green)' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, var(--matrix-black) 0%, var(--matrix-dark-green) 100%)',
        color: 'var(--matrix-bright-green)',
        padding: '1rem 2rem',
        borderBottom: '2px solid var(--matrix-border)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        zIndex: 1000
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%'
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }} className="header-title">
              🛡️ Admin Dashboard
            </h1>
            <p style={{ fontSize: '0.875rem', opacity: 0.9 }} className="text-matrix">Matrix Delivery System Control</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={triggerBackendDeploy}
              className="btn btn-primary"
            >
              🚀 Deploy Backend
            </button>
            {deployStatus && (
              <span style={{ fontSize: '0.75rem', color: deployStatus.startsWith('completed') ? '#10B981' : '#EF4444' }}>
                {`Deploy: ${deployStatus}`}
              </span>
            )}
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              ✖ Close
            </button>
            <button
              onClick={logout}
              className="btn btn-danger"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      {/* Side Menu */}
      <AdminSideMenu
        activeItem={activeTab}
        onItemSelect={handleMenuItemSelect}
        pendingTopupCount={pendingTopupCount}
        pendingWithdrawalCount={pendingWithdrawalCount}
        collapsed={sideMenuCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <main style={{ 
        marginLeft: sideMenuCollapsed ? '64px' : '240px',
        marginTop: '64px', // Account for fixed header
        padding: '2rem',
        minHeight: 'calc(100vh - 64px)',
        transition: 'margin-left 0.3s ease'
      }}>
        {/* Error Message */}
        {error && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              background: 'rgba(248, 113, 113, 0.2)',
              color: 'var(--status-cancelled)',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--status-cancelled)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <span style={{ fontWeight: '600' }}>{error}</span>
              </div>
              <button
                onClick={() => setError('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#991B1B',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  padding: '0.25rem'
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}
        {/* Content Panels */}
        {activeTab === 'overview' && (
          <div>
            <div className="card" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {['24h', '7d', '30d', '90d'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={dateRange === range ? 'btn btn-primary' : 'btn'}
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
              <div className="card">
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
              <div className="card">
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
            <div className="card">
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

        {activeTab === 'health' && (
          <div style={{ marginTop: '2rem' }}>
            <SystemHealthDashboard />
          </div>
        )}

        {activeTab === 'payments-topups' && (
          <div>
            <AdminPaymentsPanel onPendingCountChange={setPendingTopupCount} />
          </div>
        )}

        {activeTab === 'payments-withdrawals' && (
          <div>
            <AdminWithdrawalsPanel onPendingCountChange={setPendingWithdrawalCount} />
          </div>
        )}

        {activeTab === 'payments-wallets' && (
          <AdminWalletsPanel />
        )}

        {activeTab === 'users' && (
          <div>
            {/* User Management Header */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Search users by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className=""
                  style={{ flex: 1 }}
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  style={{ minWidth: '150px' }}
                >
                  <option value="all">All granted_roles</option>
                  <option value="customer">Customers</option>
                  <option value="driver">Drivers</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#F0F9FF', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Total Users</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>{(displayStats.totalUsers || 0).toLocaleString()}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#FEF3C7', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Customers</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>{(displayStats.usersByRole?.customer || 0).toLocaleString()}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#D1FAE5', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Drivers</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>{(displayStats.usersByRole?.driver || 0).toLocaleString()}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#FCE7F3', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Verified</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>{userCounts.totalVerified != null ? userCounts.totalVerified.toLocaleString() : '—'}</p>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>User</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>primary_role</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Rating</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Orders</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Joined</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                        🔄 Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                        📭 No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--matrix-dim-green) 0%, var(--matrix-dark-green) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--matrix-bright-green)',
                              fontWeight: 'bold'
                            }}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
                                {user.name}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--matrix-green)' }}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: user.primary_role === 'customer' ? '#DBEAFE' : '#FEF3C7',
                            color: user.primary_role === 'customer' ? '#1E40AF' : '#92400E'
                          }}>
                            {user.primary_role.charAt(0).toUpperCase() + user.primary_role.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: user.is_verified ? '#D1FAE5' : '#FEE2E2',
                            color: user.is_verified ? '#065F46' : '#991B1B'
                          }}>
                            {user.is_verified ? '✓ Verified' : '⏳ Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ color: '#FCD34D', fontSize: '1rem' }}>★</span>
                            <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                              {user.rating ? user.rating.toFixed(1) : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                          {user.totalOrders || 0}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#6B7280' }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                              className="btn btn-primary"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleUserAction(user.is_verified ? 'suspend' : 'verify', user.id)}
                              disabled={loading}
                              className={loading ? 'btn btn-danger' : (user.is_verified ? 'btn btn-danger' : 'btn btn-success')}
                            >
                              {user.is_verified ? 'Suspend' : 'Verify'}
                            </button>
                            <button
                              onClick={() => {
                                const isAdmin = (user.granted_roles || [user.primary_role]).includes('admin');
                                updateUserRoles(user.id, isAdmin ? { remove: ['admin'] } : { add: ['admin'] });
                              }}
                              disabled={loading}
                              className="btn btn-primary"
                            >
                              {(user.granted_roles || [user.primary_role]).includes('admin') ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => {
                                const isSupport = (user.granted_roles || [user.primary_role]).includes('support');
                                updateUserRoles(user.id, isSupport ? { remove: ['support'] } : { add: ['support'] });
                              }}
                              disabled={loading}
                              className="btn btn-success"
                            >
                              {(user.granted_roles || [user.primary_role]).includes('support') ? 'Remove Support' : 'Grant Support'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {usersPagination && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                  <button disabled={usersPagination.page <= 1} onClick={() => setUsersPage(usersPagination.page - 1)} className="btn">Prev</button>
                  <span>Page {usersPagination.page} / {usersPagination.totalPages}</span>
                  <button disabled={usersPagination.page >= usersPagination.totalPages} onClick={() => setUsersPage(usersPagination.page + 1)} className="btn">Next</button>
                </div>
              )}
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
                {[
                  { label: 'Pending Bids', color: '#92400E', bg: '#FEF3C7' },
                  { label: 'Accepted', color: '#1E40AF', bg: '#DBEAFE' },
                  { label: 'In Transit', color: '#831843', bg: '#FCE7F3' },
                  { label: 'Delivered', color: '#065F46', bg: '#D1FAE5' }
                ].map(card => {
                  const count = (displayStats.ordersByStatus || []).find(s => s.name === card.label)?.value || 0;
                  return (
                    <div key={card.label} style={{ padding: '1rem', background: card.bg, borderRadius: '0.5rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>{card.label}</p>
                      <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: card.color }}>{count.toLocaleString()}</p>
                    </div>
                  );
                })}
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
                    {loading ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                          🔄 Loading orders...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                          📭 No orders found
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        const statusColors = {
                          pending_bids: { bg: '#FEF3C7', text: '#92400E' },
                          accepted: { bg: '#DBEAFE', text: '#1E40AF' },
                          picked_up: { bg: '#C084FC', text: '#6B21A8' },
                          in_transit: { bg: '#FCE7F3', text: '#831843' },
                          delivered: { bg: '#D1FAE5', text: '#065F46' },
                          cancelled: { bg: '#FEE2E2', text: '#991B1B' }
                        };

                        return (
                          <tr key={order.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                            <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                              {order.orderNumber || order.id}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                              {order.customerName || 'N/A'}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                              {order.driverName || '—'}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                background: statusColors[order.status]?.bg || '#F3F4F6',
                                color: statusColors[order.status]?.text || '#6B7280'
                              }}>
                                {order.status ? order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                              ${order.assignedDriverBidPrice ? parseFloat(order.assignedDriverBidPrice).toFixed(2) : order.price ? parseFloat(order.price).toFixed(2) : 'N/A'}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#6B7280' }}>
                              {new Date(order.createdAt).toLocaleDateString()}
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {ordersPagination && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button disabled={ordersPagination.page <= 1} onClick={() => setOrdersPage(ordersPagination.page - 1)} style={{ padding: '0.5rem 1rem' }}>Prev</button>
                  <span>Page {ordersPagination.page} / {ordersPagination.totalPages}</span>
                  <button disabled={ordersPagination.page >= ordersPagination.totalPages} onClick={() => setOrdersPage(ordersPagination.page + 1)} style={{ padding: '0.5rem 1rem' }}>Next</button>
                </div>
              )}
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
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>${(displayStats.metrics?.avgOrderValue || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Order Completion Rate</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10B981' }}>{(displayStats.metrics?.completionRate || 0).toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Average Delivery Time</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>{(displayStats.metrics?.avgDeliveryTime || 0).toFixed(2)} hrs</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Average Rating</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10B981' }}>{(displayStats.metrics?.avgRating || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Orders by Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={displayStats.ordersByStatus} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.name} outerRadius={80} fill="#8884d8" dataKey="value">
                        {displayStats.ordersByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Revenue Trend</h3>
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
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <LogsViewer apiUrl={API_URL} />
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
                        <option>USD ($) - US Dollar</option>
                        <option>EUR (€) - Euro</option>
                        <option>GBP (£) - British Pound</option>
                        <option>EGP (LE) - Egyptian Pound</option>
                        <option>SAR (﷼) - Saudi Riyal</option>
                        <option>AED (د.إ) - UAE Dirham</option>
                        <option>KWD (د.ك) - Kuwaiti Dinar</option>
                        <option>QAR (﷼) - Qatari Riyal</option>
                        <option>BHD (د.ب) - Bahraini Dinar</option>
                        <option>OMR (﷼) - Omani Rial</option>
                        <option>JOD (د.ا) - Jordanian Dinar</option>
                        <option>LBP (ل.ل) - Lebanese Pound</option>
                        <option>IQD (ع.د) - Iraqi Dinar</option>
                        <option>TRY (₺) - Turkish Lira</option>
                        <option>INR (₹) - Indian Rupee</option>
                        <option>PKR (₨) - Pakistani Rupee</option>
                        <option>BDT (৳) - Bangladeshi Taka</option>
                        <option>CNY (¥) - Chinese Yuan</option>
                        <option>JPY (¥) - Japanese Yen</option>
                        <option>KRW (₩) - South Korean Won</option>
                        <option>MYR (RM) - Malaysian Ringgit</option>
                        <option>SGD (S$) - Singapore Dollar</option>
                        <option>THB (฿) - Thai Baht</option>
                        <option>CAD (C$) - Canadian Dollar</option>
                        <option>AUD (A$) - Australian Dollar</option>
                        <option>NZD (NZ$) - New Zealand Dollar</option>
                        <option>ZAR (R) - South African Rand</option>
                        <option>NGN (₦) - Nigerian Naira</option>
                        <option>KES (KSh) - Kenyan Shilling</option>
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

      {/* Responsive Styles */}
      <style jsx>{`
        @media (max-width: 1024px) {
          main {
            margin-left: 64px !important;
          }
        }

        @media (max-width: 768px) {
          main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;
