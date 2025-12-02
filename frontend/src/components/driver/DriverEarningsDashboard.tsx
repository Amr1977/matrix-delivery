import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EarningsStats, OrderHistoryResponse } from '../../types';

interface DriverEarningsDashboardProps {
    token: string;
    API_URL: string;
    t: (key: string) => string;
}

const DriverEarningsDashboard: React.FC<DriverEarningsDashboardProps> = ({ token, API_URL, t }) => {
    const [stats, setStats] = useState<EarningsStats | null>(null);
    const [history, setHistory] = useState<OrderHistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats();
        fetchHistory(1);
    }, []);

    useEffect(() => {
        fetchHistory(page);
    }, [page]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/drivers/earnings/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        }
    };

    const fetchHistory = async (pageNum: number) => {
        try {
            const res = await fetch(`${API_URL}/drivers/earnings/history?page=${pageNum}&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch history');
            const data = await res.json();
            setHistory(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--matrix-green)' }}>Loading earnings data...</div>;
    }

    return (
        <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--matrix-bright-green)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                💰 Driver Earnings
            </h2>

            {error && (
                <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: '#6B7280', textTransform: 'uppercase' }}>Today</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--matrix-bright-green)', margin: '0.5rem 0' }}>
                        ${stats?.today.toFixed(2) || '0.00'}
                    </p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: '#6B7280', textTransform: 'uppercase' }}>This Week</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--matrix-bright-green)', margin: '0.5rem 0' }}>
                        ${stats?.week.toFixed(2) || '0.00'}
                    </p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: '#6B7280', textTransform: 'uppercase' }}>This Month</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--matrix-bright-green)', margin: '0.5rem 0' }}>
                        ${stats?.month.toFixed(2) || '0.00'}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#374151' }}>Earnings Trend (Last 7 Days)</h3>
                <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.chartData || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid var(--matrix-border)', color: 'white' }}
                                itemStyle={{ color: 'var(--matrix-bright-green)' }}
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                            />
                            <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* History Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#374151', margin: 0 }}>Recent Deliveries</h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F9FAFB' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>Order #</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>Rating</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history?.orders.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>No completed orders yet.</td>
                                </tr>
                            ) : (
                                history?.orders.map((order) => (
                                    <tr key={order.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>
                                            {new Date(order.date).toLocaleDateString()} <br />
                                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{new Date(order.date).toLocaleTimeString()}</span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{order.orderNumber}</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>
                                            {order.rating ? (
                                                <span style={{ color: '#F59E0B' }}>{'★'.repeat(order.rating)}</span>
                                            ) : (
                                                <span style={{ color: '#9CA3AF' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 'bold', color: '#10B981' }}>
                                            ${order.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {history && history.pagination.totalPages > 1 && (
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', borderTop: '1px solid #E5E7EB' }}>
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', background: page === 1 ? '#F3F4F6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                        >
                            Previous
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                            Page {page} of {history.pagination.totalPages}
                        </span>
                        <button
                            disabled={page === history.pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', background: page === history.pagination.totalPages ? '#F3F4F6' : 'white', cursor: page === history.pagination.totalPages ? 'not-allowed' : 'pointer' }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverEarningsDashboard;
