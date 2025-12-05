import React, { useEffect, useState } from 'react';
import { Activity, Users, Truck, ShoppingBag, Globe, BarChart2 } from 'lucide-react';

interface FooterProps {
    footerStats?: any;
    t?: (key: string) => string;
}

// Try to import git info, fallback if missing (during first install)
let gitInfo = { commit: 'dev', date: new Date().toISOString() };
try {
    gitInfo = require('../../git-info.json');
} catch (e) {
    // Ignore missing file
}

interface FooterStats {
    drivers: { online: number; total: number };
    customers: { online: number; total: number };
    admins: { online: number; total: number };
    support: { online: number; total: number };
    ordersCompletedToday: number;
    activeOrders: number;
    countriesReached: number;
    systemLoad: { rpm: number; status: string };
}

const Footer: React.FC<FooterProps> = () => {
    const version = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_VERSION) || '1.0.0';
    const commit = gitInfo.commit;
    const date = new Date(gitInfo.date).toLocaleDateString();
    const time = new Date(gitInfo.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const [stats, setStats] = useState<FooterStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Use relative URL - adjust if API is on different domain
                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
                const response = await fetch(`${apiUrl}/stats/footer`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch footer stats:', error);
            }
        };

        fetchStats();
        // Poll every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const StatItem = ({ label, value, icon: Icon, color = '#6B7280' }: any) => (
        <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px', fontSize: '0.7rem' }}>
            <Icon size={12} style={{ marginRight: '4px', color }} />
            <span style={{ marginRight: '4px', fontWeight: 600 }}>{value}</span>
            <span style={{ color: '#9CA3AF' }}>{label}</span>
        </div>
    );

    return (
        <footer className="site-footer" style={{
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#6B7280',
            borderTop: '1px solid #E5E7EB',
            background: '#F9FAFB'
        }}>
            {stats && (
                <div style={{
                    maxWidth: '80rem',
                    margin: '0 auto 1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '8px 16px',
                    borderBottom: '1px solid #E5E7EB',
                    paddingBottom: '1rem'
                }}>
                    <StatItem icon={Truck} label="Online Drivers" value={`${stats.drivers.online}/${stats.drivers.total}`} color="#10B981" />
                    <StatItem icon={Users} label="Online Customers" value={`${stats.customers.online}/${stats.customers.total}`} color="#3B82F6" />
                    <StatItem icon={Users} label="Online Support" value={`${stats.support.online}/${stats.support.total}`} color="#8B5CF6" />
                    <StatItem icon={Users} label="Online Admins" value={`${stats.admins.online}/${stats.admins.total}`} color="#EF4444" />
                    <StatItem icon={ShoppingBag} label="Orders Today" value={stats.ordersCompletedToday} color="#F59E0B" />
                    <StatItem icon={Activity} label="Active Orders" value={stats.activeOrders} color="#EC4899" />
                    <StatItem icon={Globe} label="Countries" value={stats.countriesReached} color="#6366F1" />
                    <StatItem icon={BarChart2} label="System Load" value={`${stats.systemLoad.status} (${stats.systemLoad.rpm} rpm)`}
                        color={stats.systemLoad.status === 'High' ? '#EF4444' : stats.systemLoad.status === 'Medium' ? '#F59E0B' : '#10B981'}
                    />
                </div>
            )}
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
                <p style={{ margin: 0 }}>
                    {`Matrix Delivery v${version} | Commit: ${commit} | ${date} ${time}`}
                </p>
            </div>
        </footer>
    );
};

export default Footer;
