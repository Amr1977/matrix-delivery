import React, { useState, useEffect } from 'react';
import { Package, Truck, Zap, Shield, Users, Play, Star, Map as MapIcon, Globe, Activity, Lock, TrendingUp, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { useI18n } from '../i18n/i18nContext';

interface Stats {
    totalCouriers: number;
    totalClients: number;
    totalVendors: number;
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
    const { t, locale, changeLocale } = useI18n();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [stats, setStats] = useState<Stats>({
        totalCouriers: 0,
        totalClients: 0,
        totalVendors: 0,
        totalDeliveries: 0,
        uptime: '0m'
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const API_URL = process.env.REACT_APP_API_URL;
                const response = await fetch(`${API_URL}/stats/footer`);
                if (response.ok) {
                    const data = await response.json();
                    setStats({
                        totalCouriers: data.drivers?.total || 0,
                        totalClients: data.customers?.total || 0,
                        totalVendors: data.vendors?.total || 0,
                        totalDeliveries: data.totalDeliveriesLifetime || 0,
                        uptime: data.uptime || '0m'
                    });
                }
            } catch (error) {
                console.warn('Failed to fetch landing stats, using defaults');
                setStats({
                    totalCouriers: 0,
                    totalClients: 0,
                    totalVendors: 0,
                    totalDeliveries: 0,
                    uptime: '0m'
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
                            <p className="text-[#00FF41] text-xs font-mono tracking-widest">PLATFORM</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="flex items-center gap-6 hidden md:flex">
                        <a href="#vision" className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors">{t('landing.vision')}</a>
                        <a href="#stats" className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors">{t('landing.liveStats')}</a>
                        <button onClick={() => navigate('/reviews')} className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors">{t('landing.reviews')}</button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all"
                        >
                            {t('landing.login')}
                        </button>
                        <div style={{ position: 'fixed', top: 'calc(0.75rem + env(safe-area-inset-top))', right: 'calc(0.75rem + env(safe-area-inset-right))', zIndex: 2000 }}>
                            <LanguageSwitcher locale={locale} changeLocale={changeLocale} />
                        </div>
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
                                {t('landing.vision')}
                            </a>
                            <a
                                href="#stats"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors py-2"
                            >
                                {t('landing.liveStats')}
                            </a>
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    navigate('/reviews');
                                }}
                                className="text-[#A0AEC0] hover:text-[#00FF41] transition-colors text-left py-2"
                            >
                                {t('landing.reviews')}
                            </button>
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    navigate('/login');
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all mt-2"
                            >
                                {t('landing.login')}
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
                        <span className="text-[#00FF41] text-sm font-semibold tracking-wider uppercase">{t('landing.evolutionBadge')}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                        {t('landing.heroTitle')}
                    </h1>

                    <p className="text-xl text-[#A0AEC0] mb-10 max-w-2xl mx-auto">
                        {t('landing.heroSubtitle')}
                    </p>

                    <div className="flex justify-center gap-4 flex-wrap">
                        <button onClick={() => navigate('/reviews')} className="px-8 py-4 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg text-lg hover:shadow-[0_0_30px_rgba(0,255,65,0.5)] transition-all flex items-center gap-2">
                            <Star className="w-5 h-5" />
                            {t('landing.voiceOfPeople')}
                        </button>
                        <button className="px-8 py-4 bg-[#131820] text-white font-bold rounded-lg text-lg border border-[#2A3142] hover:border-[#00FF41] hover:text-[#00FF41] transition-all flex items-center gap-2">
                            <Play className="w-5 h-5" />
                            {t('landing.watchManifesto')}
                        </button>
                    </div>
                </div>
            </section>

            {/* Vision Section */}
            <section id="vision" className="py-20 bg-[#0F1419] border-y border-[#1E293B]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">{t('landing.visionTitle')}</h2>
                        <p className="text-[#A0AEC0]">{t('landing.visionSubtitle')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <VisionCard
                            icon={<Globe className="w-8 h-8 text-[#00FF41]" />}
                            title={t('landing.visionFreedom')}
                            desc={t('landing.visionFreedomDesc')}
                            color="#00FF41"
                        />
                        <VisionCard
                            icon={<Shield className="w-8 h-8 text-[#00F0FF]" />}
                            title={t('landing.visionJustice')}
                            desc={t('landing.visionJusticeDesc')}
                            color="#00F0FF"
                        />
                        <VisionCard
                            icon={<Zap className="w-8 h-8 text-[#FFB800]" />}
                            title={t('landing.visionEfficiency')}
                            desc={t('landing.visionEfficiencyDesc')}
                            color="#FFB800"
                        />
                        <VisionCard
                            icon={<Lock className="w-8 h-8 text-[#B026FF]" />}
                            title={t('landing.visionTransparency')}
                            desc={t('landing.visionTransparencyDesc')}
                            color="#B026FF"
                        />
                    </div>
                </div>
            </section>

            {/* Global Roadmap Section */}
            <section className="py-24 relative">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-12">{t('landing.roadmapTitle')}</h2>
                    <div className="relative">
                        {/* Simple Roadmap visualization */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-[#2A3142] -translate-y-1/2 hidden md:block"></div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                            <RoadmapStep phase={t('landing.phase1')} title={t('landing.heroTitle').split('.')[0] + '.'} status={t('landing.statusCompleted')} date="Q1 2025" />
                            <RoadmapStep phase={t('landing.phase2')} title={t('landing.vision')} status={t('landing.statusActive')} date="Q2 2025" active />
                            <RoadmapStep phase={t('landing.phase3')} title={t('landing.visionFreedom')} status={t('landing.statusUpcoming')} date="Q4 2025" />
                            <RoadmapStep phase={t('landing.phase4')} title="The Source" status={t('landing.statusPlanned')} date="2026" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Live Matrix Stats Section */}
            <section id="stats" className="py-20 bg-[#0F1419] border-y border-[#1E293B]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center gap-3 mb-10">
                        <Activity className="w-6 h-6 text-[#00FF41] animate-pulse" />
                        <h2 className="text-2xl font-bold text-white">{t('landing.statsTitle')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {/* 1. Registered Couriers */}
                        <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#00FF41] transition-colors">
                            <p className="text-[#A0AEC0] text-sm mb-1">{t('landing.couriers')}</p>
                            <p className="text-3xl font-mono text-white font-bold">{stats.totalCouriers}</p>
                            <p className="text-[#00FF41] text-xs mt-2 flex items-center gap-1"><Shield className="w-3 h-3" /> {t('landing.licensed')}</p>
                        </div>

                        {/* 2. Registered Clients */}
                        <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#F0F0FF] transition-colors">
                            <p className="text-[#A0AEC0] text-sm mb-1">{t('landing.clients')}</p>
                            <p className="text-3xl font-mono text-white font-bold">{stats.totalClients}</p>
                            <p className="text-[#F0F0FF] text-xs mt-2 flex items-center gap-1"><Users className="w-3 h-3" /> {t('landing.growing')}</p>
                        </div>

                        {/* 3. Registered Vendors */}
                        <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#FFB800] transition-colors">
                            <p className="text-[#A0AEC0] text-sm mb-1">{t('landing.vendors')}</p>
                            <p className="text-3xl font-mono text-white font-bold">{stats.totalVendors}</p>
                            <p className="text-[#FFB800] text-xs mt-2 flex items-center gap-1"><Package className="w-3 h-3" /> {t('landing.partners')}</p>
                        </div>

                        {/* 4. Total Deliveries */}
                        <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#00F0FF] transition-colors">
                            <p className="text-[#A0AEC0] text-sm mb-1">{t('landing.deliveries')}</p>
                            <p className="text-3xl font-mono text-white font-bold">{stats.totalDeliveries.toLocaleString()}</p>
                            <p className="text-[#00F0FF] text-xs mt-2 flex items-center gap-1"><Truck className="w-3 h-3" /> {t('landing.lifetime')}</p>
                        </div>

                        {/* 5. System Uptime */}
                        <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#B026FF] transition-colors">
                            <p className="text-[#A0AEC0] text-sm mb-1">{t('landing.uptime')}</p>
                            <p className="text-3xl font-mono text-white font-bold">{stats.uptime}</p>
                            <p className="text-[#B026FF] text-xs mt-2 flex items-center gap-1"><Activity className="w-3 h-3" /> {t('landing.online')}</p>
                        </div>
                    </div>
                </div>
            </section>

            

            {/* Footer */}
            <footer className="py-12 border-t border-[#2A3142] bg-[#0A0E14] text-center">
                <p className="text-[#64748B]">{t('landing.footer')}</p>
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
