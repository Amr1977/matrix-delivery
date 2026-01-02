import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Activity, Cpu, HardDrive, Clock, RefreshCw } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import api from '../../api';

interface HealthMetrics {
    memoryPercent: number;
    memoryUsedMb: number;
    memoryAvailableMb: number;
    pm2TotalMemoryMb: number;
    pm2Processes: Array<{
        name: string;
        status: string;
        memory_mb: number;
        restarts: number;
    }>;
    uptime: string;
    timestamp: string;
}

interface HistoryPoint {
    timestamp: string;
    memoryPercent: number;
    memoryUsedMb: number;
    memoryAvailableMb: number;
    pm2TotalMemoryMb: number;
}

interface HistoryResponse {
    hours: number;
    dataPoints: number;
    history: HistoryPoint[];
}

const SystemHealthDashboard: React.FC = () => {
    const [currentMetrics, setCurrentMetrics] = useState<HealthMetrics | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [timeRange, setTimeRange] = useState<24 | 72>(24);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchCurrentMetrics = useCallback(async () => {
        try {
            const response = await api.get('/admin/health/current');
            setCurrentMetrics(response);
            setLastUpdate(new Date());
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch metrics');
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await api.get(`/admin/health/history?hours=${timeRange}`);
            setHistory((response as HistoryResponse).history);
        } catch (err: any) {
            console.error('Failed to fetch history:', err);
        }
    }, [timeRange]);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            await Promise.all([fetchCurrentMetrics(), fetchHistory()]);
            setLoading(false);
        };
        fetchAll();

        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchAll, 60000);
        return () => clearInterval(interval);
    }, [fetchCurrentMetrics, fetchHistory]);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-400';
            case 'stopped': return 'text-red-400';
            case 'errored': return 'text-red-500';
            default: return 'text-yellow-400';
        }
    };

    if (loading && !currentMetrics) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-matrix-green animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">System Health</h2>
                    <p className="text-matrix-secondary text-sm">
                        {lastUpdate && `Last updated: ${lastUpdate.toLocaleTimeString()}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={timeRange === 24 ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setTimeRange(24)}
                    >
                        24h
                    </Button>
                    <Button
                        variant={timeRange === 72 ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setTimeRange(72)}
                    >
                        3 Days
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { fetchCurrentMetrics(); fetchHistory(); }}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            {currentMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-matrix-green/30">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-matrix-secondary text-sm">Memory Usage</p>
                                <p className="text-2xl font-bold text-white">{currentMetrics.memoryPercent}%</p>
                                <p className="text-sm text-matrix-secondary">
                                    {currentMetrics.memoryAvailableMb}MB available
                                </p>
                            </div>
                            <div className="p-2 bg-matrix-green/10 rounded-lg">
                                <HardDrive className="w-6 h-6 text-matrix-green" />
                            </div>
                        </div>
                    </Card>

                    <Card className="border-matrix-cyan/30">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-matrix-secondary text-sm">PM2 Memory</p>
                                <p className="text-2xl font-bold text-white">{currentMetrics.pm2TotalMemoryMb}MB</p>
                                <p className="text-sm text-matrix-secondary">
                                    {currentMetrics.pm2Processes.length} processes
                                </p>
                            </div>
                            <div className="p-2 bg-matrix-cyan/10 rounded-lg">
                                <Cpu className="w-6 h-6 text-matrix-cyan" />
                            </div>
                        </div>
                    </Card>

                    <Card className="border-purple-500/30">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-matrix-secondary text-sm">Uptime</p>
                                <p className="text-2xl font-bold text-white">{currentMetrics.uptime}</p>
                            </div>
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Clock className="w-6 h-6 text-purple-400" />
                            </div>
                        </div>
                    </Card>

                    <Card className="border-yellow-500/30">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-matrix-secondary text-sm">Data Points</p>
                                <p className="text-2xl font-bold text-white">{history.length}</p>
                                <p className="text-sm text-matrix-secondary">
                                    Last {timeRange}h
                                </p>
                            </div>
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Activity className="w-6 h-6 text-yellow-400" />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Memory Chart */}
            <Card>
                <h3 className="text-white text-lg font-semibold mb-4">Memory Usage Over Time</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={timeRange === 24 ? formatTime : formatDate}
                                stroke="#666"
                                tick={{ fill: '#888', fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#666"
                                tick={{ fill: '#888', fontSize: 12 }}
                                domain={[0, 100]}
                                tickFormatter={(v) => `${v}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1a1a2e',
                                    border: '1px solid #333',
                                    borderRadius: '8px'
                                }}
                                labelFormatter={(label) => new Date(label).toLocaleString()}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="memoryPercent"
                                name="Memory %"
                                stroke="#00FF41"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* PM2 Memory Chart */}
            <Card>
                <h3 className="text-white text-lg font-semibold mb-4">PM2 Process Memory</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={timeRange === 24 ? formatTime : formatDate}
                                stroke="#666"
                                tick={{ fill: '#888', fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#666"
                                tick={{ fill: '#888', fontSize: 12 }}
                                tickFormatter={(v) => `${v}MB`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1a1a2e',
                                    border: '1px solid #333',
                                    borderRadius: '8px'
                                }}
                                labelFormatter={(label) => new Date(label).toLocaleString()}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="pm2TotalMemoryMb"
                                name="PM2 Total (MB)"
                                stroke="#00F0FF"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* PM2 Processes Table */}
            {currentMetrics && currentMetrics.pm2Processes.length > 0 && (
                <Card>
                    <h3 className="text-white text-lg font-semibold mb-4">PM2 Processes</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-matrix-secondary text-sm border-b border-matrix-border">
                                    <th className="pb-3">Name</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Memory</th>
                                    <th className="pb-3">Restarts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentMetrics.pm2Processes.map((proc, i) => (
                                    <tr key={i} className="border-b border-matrix-border/50">
                                        <td className="py-3 text-white font-mono">{proc.name}</td>
                                        <td className={`py-3 font-semibold ${getStatusColor(proc.status)}`}>
                                            {proc.status}
                                        </td>
                                        <td className="py-3 text-white">{proc.memory_mb} MB</td>
                                        <td className="py-3 text-matrix-secondary">{proc.restarts}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default SystemHealthDashboard;
