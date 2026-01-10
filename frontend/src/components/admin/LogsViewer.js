import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import './LogsViewer.css';

const LogsViewer = ({ apiUrl }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        level: '',
        source: '',
        category: '',
        startDate: '',
        endDate: '',
        search: '',
        page: 1,
        limit: 50
    });

    // Auto-refresh
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const data = await api.get(`/logs?${queryParams.toString()}`);
            setLogs(data.logs);
            setPagination(data.pagination);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const data = await api.get('/logs/stats');
            setStats(data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [fetchLogs, fetchStats]);

    // Auto-refresh effect
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchLogs();
            fetchStats();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchLogs, fetchStats]);

    // Handle filter change
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
        }));
    };

    // Export logs
    const exportLogs = (format = 'json') => {
        if (format === 'json') {
            const dataStr = JSON.stringify(logs, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `logs_${new Date().toISOString()}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            const headers = ['ID', 'Timestamp', 'Level', 'Source', 'Category', 'Message', 'User ID', 'URL', 'Status Code'];
            const rows = logs.map(log => [
                log.id,
                log.timestamp,
                log.level,
                log.source,
                log.category || '',
                log.message.replace(/"/g, '""'),
                log.user_id || '',
                log.url || '',
                log.status_code || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            const dataBlob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `logs_${new Date().toISOString()}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    // Get level badge class
    const getLevelClass = (level) => {
        const classes = {
            error: 'log-level-error',
            warn: 'log-level-warn',
            info: 'log-level-info',
            debug: 'log-level-debug',
            http: 'log-level-http'
        };
        return classes[level] || 'log-level-default';
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="logs-viewer">
            {/* Stats Section */}
            {stats && (
                <div className="logs-stats">
                    <div className="stat-card">
                        <div className="stat-label">Total Logs</div>
                        <div className="stat-value">{parseInt(stats.total_logs).toLocaleString()}</div>
                    </div>
                    <div className="stat-card stat-error">
                        <div className="stat-label">Errors</div>
                        <div className="stat-value">{parseInt(stats.error_count).toLocaleString()}</div>
                    </div>
                    <div className="stat-card stat-warn">
                        <div className="stat-label">Warnings</div>
                        <div className="stat-value">{parseInt(stats.warn_count).toLocaleString()}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Last 24h</div>
                        <div className="stat-value">{parseInt(stats.last_24h_count).toLocaleString()}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Frontend</div>
                        <div className="stat-value">{parseInt(stats.frontend_count).toLocaleString()}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Backend</div>
                        <div className="stat-value">{parseInt(stats.backend_count).toLocaleString()}</div>
                    </div>
                </div>
            )}

            {/* Filters Section */}
            <div className="logs-filters">
                <div className="filter-row">
                    <select
                        value={filters.level}
                        onChange={(e) => handleFilterChange('level', e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Levels</option>
                        <option value="error">Error</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                        <option value="http">HTTP</option>
                    </select>

                    <select
                        value={filters.source}
                        onChange={(e) => handleFilterChange('source', e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Sources</option>
                        <option value="frontend">Frontend</option>
                        <option value="backend">Backend</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Category..."
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="filter-input"
                    />

                    <input
                        type="date"
                        placeholder="Start Date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        className="filter-input"
                    />

                    <input
                        type="date"
                        placeholder="End Date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        className="filter-input"
                    />
                </div>

                <div className="filter-row">
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="filter-input filter-search"
                    />

                    <label className="auto-refresh-toggle">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh ({refreshInterval / 1000}s)
                    </label>

                    <button onClick={fetchLogs} className="btn-refresh" disabled={loading}>
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>

                    <button onClick={() => exportLogs('json')} className="btn-export">
                        Export JSON
                    </button>

                    <button onClick={() => exportLogs('csv')} className="btn-export">
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="logs-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Logs Table */}
            <div className="logs-table-container">
                <table className="logs-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Level</th>
                            <th>Source</th>
                            <th>Category</th>
                            <th>Message</th>
                            <th>User</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="no-logs">
                                    {loading ? 'Loading logs...' : 'No logs found'}
                                </td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className={`log-row ${getLevelClass(log.level)}`}>
                                    <td className="log-timestamp">{formatTimestamp(log.timestamp)}</td>
                                    <td>
                                        <span className={`log-level-badge ${getLevelClass(log.level)}`}>
                                            {log.level.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>{log.source}</td>
                                    <td>{log.category || '-'}</td>
                                    <td className="log-message">
                                        {log.message.length > 100
                                            ? `${log.message.substring(0, 100)}...`
                                            : log.message}
                                    </td>
                                    <td>{log.user_id || '-'}</td>
                                    <td>
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="btn-view-details"
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="logs-pagination">
                    <button
                        onClick={() => handleFilterChange('page', filters.page - 1)}
                        disabled={filters.page === 1}
                        className="btn-page"
                    >
                        Previous
                    </button>
                    <span className="page-info">
                        Page {pagination.page} of {pagination.totalPages}
                        ({pagination.totalCount} total logs)
                    </span>
                    <button
                        onClick={() => handleFilterChange('page', filters.page + 1)}
                        disabled={!pagination.hasMore}
                        className="btn-page"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="log-modal-overlay" onClick={() => setSelectedLog(null)}>
                    <div className="log-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="log-modal-header">
                            <h3>Log Details</h3>
                            <button onClick={() => setSelectedLog(null)} className="btn-close">×</button>
                        </div>
                        <div className="log-modal-body">
                            <div className="log-detail-row">
                                <strong>ID:</strong> {selectedLog.id}
                            </div>
                            <div className="log-detail-row">
                                <strong>Timestamp:</strong> {formatTimestamp(selectedLog.timestamp)}
                            </div>
                            <div className="log-detail-row">
                                <strong>Level:</strong>
                                <span className={`log-level-badge ${getLevelClass(selectedLog.level)}`}>
                                    {selectedLog.level.toUpperCase()}
                                </span>
                            </div>
                            <div className="log-detail-row">
                                <strong>Source:</strong> {selectedLog.source}
                            </div>
                            <div className="log-detail-row">
                                <strong>Category:</strong> {selectedLog.category || '-'}
                            </div>
                            <div className="log-detail-row">
                                <strong>Message:</strong>
                                <pre className="log-detail-pre">{selectedLog.message}</pre>
                            </div>
                            {selectedLog.user_id && (
                                <div className="log-detail-row">
                                    <strong>User ID:</strong> {selectedLog.user_id}
                                </div>
                            )}
                            {selectedLog.session_id && (
                                <div className="log-detail-row">
                                    <strong>Session ID:</strong> {selectedLog.session_id}
                                </div>
                            )}
                            {selectedLog.url && (
                                <div className="log-detail-row">
                                    <strong>URL:</strong> {selectedLog.url}
                                </div>
                            )}
                            {selectedLog.method && (
                                <div className="log-detail-row">
                                    <strong>Method:</strong> {selectedLog.method}
                                </div>
                            )}
                            {selectedLog.status_code && (
                                <div className="log-detail-row">
                                    <strong>Status Code:</strong> {selectedLog.status_code}
                                </div>
                            )}
                            {selectedLog.duration_ms && (
                                <div className="log-detail-row">
                                    <strong>Duration:</strong> {selectedLog.duration_ms}ms
                                </div>
                            )}
                            {selectedLog.ip_address && (
                                <div className="log-detail-row">
                                    <strong>IP Address:</strong> {selectedLog.ip_address}
                                </div>
                            )}
                            {selectedLog.user_agent && (
                                <div className="log-detail-row">
                                    <strong>User Agent:</strong>
                                    <pre className="log-detail-pre">{selectedLog.user_agent}</pre>
                                </div>
                            )}
                            {selectedLog.stack_trace && (
                                <div className="log-detail-row">
                                    <strong>Stack Trace:</strong>
                                    <pre className="log-detail-pre log-stack-trace">{selectedLog.stack_trace}</pre>
                                </div>
                            )}
                            {selectedLog.metadata && (
                                <div className="log-detail-row">
                                    <strong>Metadata:</strong>
                                    <pre className="log-detail-pre">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogsViewer;
