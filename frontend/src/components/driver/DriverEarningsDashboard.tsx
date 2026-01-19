import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EarningsStats, OrderHistoryResponse } from '../../types';

interface DriverEarningsDashboardProps {
    token: string;
    API_URL: string;
    t: (key: string) => string;
}

// Loading Skeleton Components
const SkeletonCard = () => (
    <div className="card" style={{ textAlign: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}>
        <div style={{ height: '1rem', background: '#E5E7EB', borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
        <div style={{ height: '2.5rem', background: '#E5E7EB', borderRadius: '0.25rem', width: '60%', margin: '0 auto' }} />
    </div>
);

const SkeletonChart = () => (
    <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ height: '1.5rem', background: '#E5E7EB', borderRadius: '0.25rem', marginBottom: '1rem', width: '40%' }} />
        <div style={{ height: '300px', background: '#F3F4F6', borderRadius: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
);

const SkeletonTableRow = () => (
    <tr style={{ borderTop: '1px solid #E5E7EB' }}>
        <td style={{ padding: '0.75rem 1rem' }}>
            <div style={{ height: '1rem', background: '#E5E7EB', borderRadius: '0.25rem', marginBottom: '0.25rem' }} />
            <div style={{ height: '0.75rem', background: '#F3F4F6', borderRadius: '0.25rem', width: '60%' }} />
        </td>
        <td style={{ padding: '0.75rem 1rem' }}>
            <div style={{ height: '1rem', background: '#E5E7EB', borderRadius: '0.25rem', width: '80px' }} />
        </td>
        <td style={{ padding: '0.75rem 1rem' }}>
            <div style={{ height: '1rem', background: '#E5E7EB', borderRadius: '0.25rem', width: '60px' }} />
        </td>
        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
            <div style={{ height: '1rem', background: '#E5E7EB', borderRadius: '0.25rem', width: '70px', marginLeft: 'auto' }} />
        </td>
    </tr>
);

const DriverEarningsDashboard: React.FC<DriverEarningsDashboardProps> = ({ token, API_URL, t }) => {
    const [stats, setStats] = useState<EarningsStats | null>(null);
    const [history, setHistory] = useState<OrderHistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');

    // Date range filter state
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [startDate, endDate] = dateRange;
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchHistory(1);
    }, []);

    useEffect(() => {
        fetchHistory(page);
    }, [page]);

    useEffect(() => {
        if (startDate && endDate) {
            fetchStats();
            fetchHistory(1);
        }
    }, [startDate, endDate]);

    const fetchStats = async () => {
        try {
            let url = `${API_URL}/drivers/earnings/stats`;
            if (startDate && endDate) {
                const params = new URLSearchParams({
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                });
                url += `?${params}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (pageNum: number) => {
        setHistoryLoading(true);
        try {
            let url = `${API_URL}/drivers/earnings/history?page=${pageNum}&limit=10`;
            if (startDate && endDate) {
                url += `&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch history');
            const data = await res.json();
            setHistory(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const applyDatePreset = (preset: string) => {
        const today = new Date();
        let start: Date, end: Date;

        switch (preset) {
            case 'last7days':
                start = new Date(today);
                start.setDate(today.getDate() - 7);
                end = today;
                break;
            case 'last30days':
                start = new Date(today);
                start.setDate(today.getDate() - 30);
                end = today;
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = today;
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'all':
                setDateRange([null, null]);
                return;
            default:
                return;
        }

        setDateRange([start, end]);
    };

    const exportToCSV = () => {
        if (!history || history.orders.length === 0) return;

        const headers = ['Date', 'Time', 'Order Number', 'Rating', 'Amount'];
        const rows = history.orders.map(order => [
            new Date(order.date).toLocaleDateString(),
            new Date(order.date).toLocaleTimeString(),
            order.orderNumber,
            order.rating ? `${order.rating} stars` : 'No rating',
            `$${order.amount.toFixed(2)}`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `earnings_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (!stats || !history) return;

        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text('Driver Earnings Report', 14, 20);

        // Date range
        doc.setFontSize(10);
        const dateRangeText = startDate && endDate
            ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
            : 'All Time';
        doc.text(`Period: ${dateRangeText}`, 14, 28);

        // Summary stats
        doc.setFontSize(12);
        doc.text('Summary', 14, 40);
        doc.setFontSize(10);
        doc.text(`Today: $${stats.today.toFixed(2)}`, 14, 48);
        doc.text(`This Week: $${stats.week.toFixed(2)}`, 14, 54);
        doc.text(`This Month: $${stats.month.toFixed(2)}`, 14, 60);

        // Order history table
        const tableData = history.orders.map(order => [
            new Date(order.date).toLocaleDateString(),
            new Date(order.date).toLocaleTimeString(),
            order.orderNumber,
            order.rating ? `${order.rating} ★` : '-',
            `$${order.amount.toFixed(2)}`
        ]);

        autoTable(doc, {
            head: [['Date', 'Time', 'Order #', 'Rating', 'Amount']],
            body: tableData,
            startY: 70,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] }
        });

        doc.save(`earnings_report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading && !stats) {
        return (
            <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ color: 'var(--matrix-bright-green)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    💰 {t('driverEarnings.title')}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
                <SkeletonChart />
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ color: 'var(--matrix-bright-green)', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                    💰 {t('driverEarnings.title')}
                </h2>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Date Range Presets */}
                    <button
                        onClick={() => applyDatePreset('last7days')}
                        style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        {t('driverEarnings.last7Days')}
                    </button>
                    <button
                        onClick={() => applyDatePreset('last30days')}
                        style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        {t('driverEarnings.last30Days')}
                    </button>
                    <button
                        onClick={() => applyDatePreset('thisMonth')}
                        style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        {t('driverEarnings.thisMonth')}
                    </button>
                    <button
                        onClick={() => applyDatePreset('lastMonth')}
                        style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        {t('driverEarnings.lastMonth')}
                    </button>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        style={{ padding: '0.5rem 1rem', background: '#6B7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        📅 {t('driverEarnings.customRange')}
                    </button>
                    {(startDate || endDate) && (
                        <button
                            onClick={() => applyDatePreset('all')}
                            style={{ padding: '0.5rem 1rem', background: '#EF4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                            {t('driverEarnings.clearFilter')}
                        </button>
                    )}
                </div>
            </div>

            {/* Custom Date Picker */}
            {showDatePicker && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'white', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                    <DatePicker
                        selectsRange={true}
                        startDate={startDate}
                        endDate={endDate}
                        onChange={(update) => setDateRange(update)}
                        inline
                        maxDate={new Date()}
                    />
                </div>
            )}

            {/* Active Filter Display */}
            {startDate && endDate && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#EFF6FF', borderRadius: '0.375rem', border: '1px solid #DBEAFE' }}>
                    <span style={{ fontSize: '0.875rem', color: '#1E40AF' }}>
                        📅 {t('driverEarnings.showingData')} {startDate.toLocaleDateString()} {t('driverEarnings.to')} {endDate.toLocaleDateString()}
                    </span>
                </div>
            )}

            {error && (
                <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: '#6B7280', textTransform: 'uppercase' }}>{t('driverEarnings.today')}</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--matrix-bright-green)', margin: '0.5rem 0' }}>
                        ${stats?.today.toFixed(2) || '0.00'}
                    </p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: '#6B7280', textTransform: 'uppercase' }}>{t('driverEarnings.thisWeek')}</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--matrix-bright-green)', margin: '0.5rem 0' }}>
                        ${stats?.week.toFixed(2) || '0.00'}
                    </p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.875rem', color: '#6B7280', textTransform: 'uppercase' }}>{t('driverEarnings.thisMonth')}</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--matrix-bright-green)', margin: '0.5rem 0' }}>
                        ${stats?.month.toFixed(2) || '0.00'}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#374151' }}>{t('driverEarnings.trendTitle')}</h3>
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

            {/* Export Buttons */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                    onClick={exportToCSV}
                    disabled={!history || history.orders.length === 0}
                    style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', opacity: (!history || history.orders.length === 0) ? 0.5 : 1 }}
                >
                    📄 {t('driverEarnings.exportCSV')}
                </button>
                <button
                    onClick={exportToPDF}
                    disabled={!history || history.orders.length === 0}
                    style={{ padding: '0.5rem 1rem', background: '#EF4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', opacity: (!history || history.orders.length === 0) ? 0.5 : 1 }}
                >
                    📑 {t('driverEarnings.exportPDF')}
                </button>
            </div>

            {/* History Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#374151', margin: 0 }}>{t('driverEarnings.recentDeliveries')}</h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F9FAFB' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>{t('driverEarnings.date')}</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>{t('driverEarnings.orderNum')}</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>{t('driverEarnings.rating')}</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>{t('driverEarnings.amount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyLoading ? (
                                <>
                                    <SkeletonTableRow />
                                    <SkeletonTableRow />
                                    <SkeletonTableRow />
                                </>
                            ) : history?.orders.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>{t('driverEarnings.noOrders')}</td>
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
                            {t('driverEarnings.previous')}
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                            {t('driverEarnings.pageInfo').replace('{current}', page.toString()).replace('{total}', history.pagination.totalPages.toString())}
                        </span>
                        <button
                            disabled={page === history.pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', background: page === history.pagination.totalPages ? '#F3F4F6' : 'white', cursor: page === history.pagination.totalPages ? 'not-allowed' : 'pointer' }}
                        >
                            {t('driverEarnings.next')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverEarningsDashboard;
