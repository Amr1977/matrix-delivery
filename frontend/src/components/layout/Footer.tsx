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

const Footer: React.FC<FooterProps> = ({ footerStats }) => {
    const version = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_VERSION) || '1.0.0';
    const commit = gitInfo.commit;
    const date = new Date(gitInfo.date).toLocaleDateString();
    const time = new Date(gitInfo.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const [stats, setStats] = useState<FooterStats | null>(footerStats || null);

    useEffect(() => {
        // If footerStats is provided via prop, use it and skip fetching
        if (footerStats) {
            setStats(footerStats);
            return;
        }

        // Only fetch if no footerStats prop is provided
        const fetchStats = async () => {
            try {
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
        // Poll every 30 seconds only if not using prop
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [footerStats]);

    const StatItem = ({ label, value, icon: Icon }: any) => (
        <div style={{ display: 'flex', alignItems: 'center', margin: '0 12px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            <Icon size={14} style={{ marginRight: '6px', color: '#00FF41' }} />
            <span style={{ marginRight: '6px', fontWeight: 600, color: '#00FF41' }}>{value}</span>
            <span style={{ color: '#008F11' }}>{label}</span>
        </div>
    );

    return (
        <footer className="site-footer" style={{
            padding: '1.5rem 1rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#008F11',
            borderTop: '1px solid #003300',
            background: '#000000',
            fontFamily: 'monospace'
        }}>
            {stats && (
                <div style={{
                    maxWidth: '80rem',
                    margin: '0 auto 1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '12px 24px',
                    borderBottom: '1px solid #003300',
                    paddingBottom: '1rem'
                }}>
                    <StatItem icon={Truck} label="Online Drivers" value={`${stats.drivers?.online ?? 0}/${stats.drivers?.total ?? 0}`} />
                    <StatItem icon={Users} label="Online Customers" value={`${stats.customers?.online ?? 0}/${stats.customers?.total ?? 0}`} />
                    {stats.support && <StatItem icon={Users} label="Online Support" value={`${stats.support.online}/${stats.support.total}`} />}
                    {stats.admins && <StatItem icon={Users} label="Online Admins" value={`${stats.admins.online}/${stats.admins.total}`} />}
                    <StatItem icon={ShoppingBag} label="Orders Today" value={stats.ordersCompletedToday ?? 0} />
                    <StatItem icon={Activity} label="Active Orders" value={stats.activeOrders ?? 0} />
                    <StatItem icon={Globe} label="Countries" value={stats.countriesReached ?? 0} />
                    {stats.systemLoad && <StatItem icon={BarChart2} label="System Load" value={`${stats.systemLoad.status} (${stats.systemLoad.rpm} rpm)`} />}
                </div>
            )}
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
                <p style={{ margin: 0, color: '#004400' }}>
                    {`Matrix Delivery v${version} | Commit: ${commit} | ${date} ${time}`}
                </p>
            </div>
        </footer>
    );
};

export default Footer;
