import React, { useState, useEffect } from 'react';
import { Package, Truck, Zap, Shield, Users, Play, Star, Map as MapIcon, Globe, Activity, Lock, TrendingUp, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Stats {
    activeCouriers: number;
    totalDeliveries: number;
    uptime: string;
}

interface VisionCardProps {
    icon: React.ReactNode;
    title: string;
    desc: string;
    color: string;
}

interface RoadmapStepProps {
    phase: string;
    title: string;
    status: string;
    date: string;
    active?: boolean;
}

const MatrixLanding: React.FC = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [stats, setStats] = useState<Stats>({
        activeCouriers: 0,
        totalDeliveries: 0,
        uptime: '99.9%'
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';
                const response = await fetch(`${API_URL}/stats/footer`);
                if (response.ok) {
                    const data = await response.json();
                    setStats({
                        activeCouriers: data.drivers?.total || 156, // Fallback to mock if 0 (for demo)
                        totalDeliveries: data.ordersCompletedToday ? data.ordersCompletedToday + 12000 : 12450, // Mock base + today's
                        uptime: '99.9%'
                    });
                }
            } catch (error) {
                console.warn('Failed to fetch landing stats, using defaults');
                // Keep defaults
                setStats({
                    activeCouriers: 156,
                    totalDeliveries: 12450,
                    uptime: '99.9%'
                });
            }
        };

        fetchStats();
        // Refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-[#0A0E14] min-h-screen font-sans text-white overflow-x-hidden">
            {/* Navbar */}
            <nav className="border-b border-[#2A3142] bg-[#131820]/90 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#00FF41] to-[#00F0FF] rounded-lg flex items-center justify-center">
                            <Zap className="w-6 h-6 text-[#0A0E14]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-wider">MATRIX</h1>
                            <p className="text-[#00FF41] text-xs font-mono tracking-widest">DELIVERY</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="flex items-center gap-6 hidden md:flex">
                        <a href="#vision" className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors">Vision</a>
                        <a href="#stats" className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors">Live Stats</a>
                        <button onClick={() => navigate('/reviews')} className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors">Reviews</button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all"
                        >
                            Login
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden text-[#A0AEC0] hover:text-[#00FF41] transition-colors p-2 -mr-2 flex-shrink-0 w-10 h-10 flex items-center justify-center border-0 bg-transparent outline-none focus:outline-none"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation Drawer */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-[#2A3142] bg-[#131820] animate-slideDown">
                        <div className="px-6 py-4 flex flex-col gap-4">
                            <a
                                href="#vision"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors py-2"
                            >
                                Vision
                            </a>
                            <a
                                href="#stats"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors py-2"
                            >
                                Live Stats
                            </a>
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    navigate('/reviews');
                                }}
                                className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors text-left py-2"
                            >
                                Reviews
                            </button>
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    navigate('/login');
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all mt-2"
                            >
                                Login
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                {/* Matrix Background Effect (Simplified CSS/SVG representation or component) */}
                <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/c/c0/Digital_rain_animation_medium_letters_shine.gif')] opacity-10 pointer-events-none bg-cover"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-block px-4 py-1 bg-[#00FF41]/10 border border-[#00FF41] rounded-full mb-8 animate-pulse">
                        <span className="text-[#00FF41] text-sm font-semibold tracking-wider uppercase">Evolution Badge: Beta Phase</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                        Efficiency Unlocked. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF41] to-[#00F0FF]">Justice Delivered.</span> <br />
                        Transparency Guaranteed.
                    </h1>

                    <p className="text-xl text-[#A0AEC0] mb-10 max-w-2xl mx-auto">
                        The world's first decentralized logistics network powered by the people, for the people.
                        Experience the freedom of peer-to-peer delivery.
                    </p>

                    <div className="flex justify-center gap-4 flex-wrap">
                        <button onClick={() => navigate('/reviews')} className="px-8 py-4 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg text-lg hover:shadow-[0_0_30px_rgba(0,255,65,0.5)] transition-all flex items-center gap-2">
                            <Star className="w-5 h-5" />
                            Voice of the People
                        </button>
                        <button className="px-8 py-4 bg-[#131820] text-white font-bold rounded-lg text-lg border border-[#2A3142] hover:border-[#00FF41] hover:text-[#00FF41] transition-all flex items-center gap-2">
                            <Play className="w-5 h-5" />
                            Watch Manifesto
                        </button>
                    </div>
                </div>
            </section>

            {/* Live Matrix Stats Section */}
            <section id="stats" className="py-20 bg-[#0F1419] border-y border-[#1E293B]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center gap-3 mb-10">
                        <Activity className="w-6 h-6 text-[#00FF41] animate-pulse" />
                        <h2 className="text-2xl font-bold text-white">Live Matrix Statistics</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#00FF41] transition-colors">
                            <p className="text-[#A0AEC0] text-sm mb-1">Active Couriers</p>
                            <p className="text-4xl font-mono text-white font-bold">{stats.activeCouriers}</p>
                            <p className="text-[#00FF41] text-xs mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +12% this hour</p>
                        </div>
                        <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#00F0FF] transition-colors">
                            <p className="text-[#A0AEC0] text-sm mb-1">Total Deliveries</p>
                            <p className="text-4xl font-mono text-white font-bold">{stats.totalDeliveries.toLocaleString()}</p>
                            <p className="text-[#00F0FF] text-xs mt-2">Global Network</p>
                        </div>
                        <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#B026FF] transition-colors">
                            <p className="text-[#A0AEC0] text-sm mb-1">System Uptime</p>
                            <p className="text-4xl font-mono text-white font-bold">{stats.uptime}</p>
                            <p className="text-[#B026FF] text-xs mt-2">Decentralized Servers</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Vision Section */}
            <section id="vision" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Our Core Vision</h2>
                        <p className="text-[#A0AEC0]">The four pillars that define the Matrix.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <VisionCard
                            icon={<Globe className="w-8 h-8 text-[#00FF41]" />}
                            title="Freedom"
                            desc="Break free from traditional logistics constraints. Delivery without borders."
                            color="#00FF41"
                        />
                        <VisionCard
                            icon={<Shield className="w-8 h-8 text-[#00F0FF]" />}
                            title="Justice"
                            desc="Fair wages for couriers. Fair prices for customers. No hidden fees."
                            color="#00F0FF"
                        />
                        <VisionCard
                            icon={<Zap className="w-8 h-8 text-[#FFB800]" />}
                            title="Efficiency"
                            desc="AI-optimized routing ensures the fastest possible delivery times."
                            color="#FFB800"
                        />
                        <VisionCard
                            icon={<Lock className="w-8 h-8 text-[#B026FF]" />}
                            title="Transparency"
                            desc="Open source protocols. Real-time tracking. Verify everything."
                            color="#B026FF"
                        />
                    </div>
                </div>
            </section>

            {/* Global Roadmap Section */}
            <section className="py-20 bg-[#0F1419]">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-12">Global Roadmap</h2>
                    <div className="relative">
                        {/* Simple Roadmap visualization */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-[#2A3142] -translate-y-1/2 hidden md:block"></div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                            <RoadmapStep phase="Phase 1" title="Awakening" status="Completed" date="Q1 2025" />
                            <RoadmapStep phase="Phase 2" title="Expansion" status="Active" date="Q2 2025" active />
                            <RoadmapStep phase="Phase 3" title="Liberation" status="Upcoming" date="Q4 2025" />
                            <RoadmapStep phase="Phase 4" title="The Source" status="Planned" date="2026" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-[#2A3142] bg-[#0A0E14] text-center">
                <p className="text-[#64748B]">© 2025 Matrix Delivery. A Living Platform.</p>
            </footer>
        </div>
    );
};

// Sub-components
const VisionCard: React.FC<VisionCardProps> = ({ icon, title, desc, color }) => (
    <div className="bg-[#131820] p-8 rounded-2xl border border-[#2A3142] hover:border-[color:var(--hover-color)] transition-all hover:-translate-y-2 group" style={{ '--hover-color': color } as React.CSSProperties}>
        <div className="w-16 h-16 rounded-xl bg-[#0A0E14] border border-[#2A3142] flex items-center justify-center mb-6 group-hover:shadow-lg transition-shadow" style={{ boxShadow: `0 0 0 0 ${color}00` }}>
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3" style={{ color: color }}>{title}</h3>
        <p className="text-[#A0AEC0] leading-relaxed">{desc}</p>
    </div>
);

const RoadmapStep: React.FC<RoadmapStepProps> = ({ phase, title, status, date, active }) => (
    <div className={`bg-[#131820] p-6 rounded-xl border ${active ? 'border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.2)]' : 'border-[#2A3142]'} text-left`}>
        <div className="flex justify-between items-start mb-4">
            <span className={`text-xs font-mono px-2 py-1 rounded ${active ? 'bg-[#00FF41]/20 text-[#00FF41]' : 'bg-[#2A3142] text-[#A0AEC0]'}`}>{status}</span>
            <span className="text-xs text-[#64748B] font-mono">{date}</span>
        </div>
        <h4 className="text-lg font-bold mb-1">{title}</h4>
        <p className="text-sm text-[#A0AEC0]">{phase}</p>
    </div>
);

export default MatrixLanding;
