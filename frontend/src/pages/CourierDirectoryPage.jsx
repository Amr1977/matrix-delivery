import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../i18n/i18nContext';
import { CourierCareerApi } from '../../services/api';
import { CourierPublicProfile, CourierTier, CourierDirectoryFilters } from '../../services/api/types';
import { TierBadge } from '../courier/TierBadge';
import './CourierDirectoryPage.css';

const CourierDirectoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    
    const [couriers, setCouriers] = useState<CourierPublicProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    
    const [filters, setFilters] = useState<CourierDirectoryFilters>({
        page: 1,
        limit: 20,
        tier: undefined,
        city: '',
        country: ''
    });
    
    const [filterOpen, setFilterOpen] = useState(false);

    const TIER_OPTIONS: { value: CourierTier | ''; label: string }[] = [
        { value: '', label: t('courier.directory.allTiers') },
        { value: 'junior', label: t('courier.tier.junior') },
        { value: 'mid', label: t('courier.tier.mid') },
        { value: 'senior', label: t('courier.tier.senior') },
        { value: 'team_leader', label: t('courier.tier.teamLeader') }
    ];

    const fetchDirectory = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const apiFilters = { ...filters };
            if (!apiFilters.tier) delete apiFilters.tier;
            if (!apiFilters.city) delete apiFilters.city;
            if (!apiFilters.country) delete apiFilters.country;
            
            const response = await CourierCareerApi.getDirectory(apiFilters);
            setCouriers(response.couriers);
            setPagination(response.pagination);
        } catch (err: any) {
            setError(t('courier.directory.loadError'));
            console.error('Failed to load directory:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDirectory();
    }, [fetchDirectory]);

    const handleFilterChange = (key: keyof CourierDirectoryFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const clearFilters = () => {
        setFilters({
            page: 1,
            limit: 20,
            tier: undefined,
            city: '',
            country: ''
        });
    };

    const hasActiveFilters = filters.tier || filters.city || filters.country;

    const formatNumber = (num: number) => num.toLocaleString();

    return (
        <div className="courier-directory-page">
            {/* Header */}
            <header className="directory-header">
                <div className="header-content">
                    <h1>{t('courier.directory.title')}</h1>
                    <p className="header-subtitle">{t('courier.directory.subtitle')}</p>
                </div>
                
                <div className="header-actions">
                    <button 
                        className={`filter-toggle ${filterOpen ? 'open' : ''}`}
                        onClick={() => setFilterOpen(!filterOpen)}
                    >
                        🔍 {t('courier.directory.filters')}
                        {hasActiveFilters && (
                            <span className="filter-badge">{Object.values(filters).filter(v => v).length - 1}</span>
                        )}
                    </button>
                </div>
            </header>

            {/* Filters Panel */}
            <div className={`filters-panel ${filterOpen ? 'open' : ''}`}>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>{t('courier.directory.filterByTier')}</label>
                        <select
                            value={filters.tier || ''}
                            onChange={(e) => handleFilterChange('tier', e.target.value || undefined)}
                        >
                            {TIER_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label>{t('courier.directory.filterByCity')}</label>
                        <input
                            type="text"
                            placeholder={t('courier.directory.cityPlaceholder')}
                            value={filters.city}
                            onChange={(e) => handleFilterChange('city', e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>{t('courier.directory.filterByCountry')}</label>
                        <input
                            type="text"
                            placeholder={t('courier.directory.countryPlaceholder')}
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                        />
                    </div>
                </div>
                
                {hasActiveFilters && (
                    <button className="clear-filters" onClick={clearFilters}>
                        {t('courier.directory.clearFilters')}
                    </button>
                )}
            </div>

            {/* Results Count */}
            <div className="results-info">
                <span>{t('courier.directory.showingResults', { 
                    count: pagination.total,
                    from: ((pagination.page - 1) * pagination.limit) + 1,
                    to: Math.min(pagination.page * pagination.limit, pagination.total)
                })}</span>
            </div>

            {/* Couriers Grid */}
            <div className="directory-content">
                {loading && couriers.length === 0 ? (
                    <div className="loading-state">
                        <div className="matrix-loader">{t('common.loading')}</div>
                    </div>
                ) : couriers.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <h2>{t('courier.directory.noCouriers')}</h2>
                        <p>{hasActiveFilters ? t('courier.directory.noCouriersFiltered') : t('courier.directory.noCouriersYet')}</p>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="btn-primary">
                                {t('courier.directory.clearFilters')}
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="couriers-grid">
                            {couriers.map(courier => (
                                <Link 
                                    key={courier.id} 
                                    to={`/couriers/${courier.id}/profile`}
                                    className="courier-card"
                                >
                                    <div className="card-avatar">
                                        {courier.profile_picture_url ? (
                                            <img 
                                                src={courier.profile_picture_url.startsWith('/') 
                                                    ? `${process.env.REACT_APP_API_URL}${courier.profile_picture_url}` 
                                                    : courier.profile_picture_url} 
                                                alt={courier.name}
                                            />
                                        ) : (
                                            <span className="avatar-placeholder">{courier.name.charAt(0).toUpperCase()}</span>
                                        )}
                                        <TierBadge tier={courier.current_tier} size="small" className="card-tier" />
                                    </div>
                                    
                                    <div className="card-info">
                                        <h3 className="card-name">{courier.name}</h3>
                                        
                                        <div className="card-meta">
                                            <span className="meta-item">
                                                <span className="meta-icon">📍</span>
                                                <span>{[courier.city, courier.service_area_zone, courier.country].filter(Boolean).join(', ') || t('courier.profile.locationUnknown')}</span>
                                            </span>
                                            <span className="meta-item">
                                                <span className="meta-icon">📅</span>
                                                <span>{t('courier.directory.memberSince', { year: new Date(courier.created_at).getFullYear() })}</span>
                                            </span>
                                        </div>
                                        
                                        <div className="card-stats">
                                            <div className="stat">
                                                <span className="stat-value">{formatNumber(courier.completed_deliveries)}</span>
                                                <span className="stat-label">{t('courier.directory.deliveries')}</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-value">{courier.rating.toFixed(1)}</span>
                                                <span className="stat-label">{t('courier.directory.rating')}</span>
                                            </div>
                                            {courier.is_verified && (
                                                <div className="stat verified">
                                                    <span className="stat-value">✓</span>
                                                    <span className="stat-label">{t('courier.directory.verified')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <nav className="pagination" aria-label="Pagination">
                                <button
                                    className="page-btn"
                                    onClick={() => handlePageChange(1)}
                                    disabled={pagination.page === 1}
                                >
                                    ««
                                </button>
                                <button
                                    className="page-btn"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                >
                                    «
                                </button>
                                
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (pagination.page <= 3) {
                                        pageNum = i + 1;
                                    } else if (pagination.page >= pagination.totalPages - 2) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    } else {
                                        pageNum = pagination.page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            className={`page-btn ${pagination.page === pageNum ? 'active' : ''}`}
                                            onClick={() => handlePageChange(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                
                                <button
                                    className="page-btn"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    »
                                </button>
                                <button
                                    className="page-btn"
                                    onClick={() => handlePageChange(pagination.totalPages)}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    »»
                                </button>
                            </nav>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CourierDirectoryPage;