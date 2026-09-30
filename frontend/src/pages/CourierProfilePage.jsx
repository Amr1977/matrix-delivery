import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../i18n/i18nContext';
import { CourierCareerApi } from '../../services/api';
import { CourierPublicProfile, CourierCareerEvent, CourierTeam } from '../../services/api/types';
import { TierBadge } from '../courier/TierBadge';
import './CourierProfilePage.css';

const CourierProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useI18n();
    
    const [profile, setProfile] = useState<CourierPublicProfile | null>(null);
    const [careerEvents, setCareerEvents] = useState<CourierCareerEvent[]>([]);
    const [team, setTeam] = useState<CourierTeam | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        if (!id) return;
        
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const [profileRes, eventsRes, teamRes] = await Promise.all([
                    CourierCareerApi.getPublicProfile(id),
                    CourierCareerApi.getCareerHistory(id).catch(() => ({ career_events: [] })),
                    CourierCareerApi.getMyTeam().catch(() => ({ team: null }))
                ]);
                
                setProfile(profileRes.profile);
                setCareerEvents(eventsRes.career_events || []);
                setTeam(teamRes.team);
                setIsOwner(profileRes.profile.is_profile_owner === true);
            } catch (err: any) {
                if (err.statusCode === 403 || err.statusCode === 404) {
                    setError(err.message || t('courier.profile.notFound'));
                } else {
                    setError(t('courier.profile.loadError'));
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    if (loading) {
        return (
            <div className="courier-profile-page loading">
                <div className="matrix-loader">Loading...</div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="courier-profile-page error">
                <div className="error-state">
                    <h2>{t('courier.profile.notFound')}</h2>
                    <p>{error || t('courier.profile.privateOrNotExist')}</p>
                    <button onClick={() => navigate('/couriers/directory')} className="btn-primary">
                        {t('courier.profile.backToDirectory')}
                    </button>
                </div>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getEventIcon = (eventType: string) => {
        const icons: Record<string, string> = {
            joined_platform: '🚀',
            tier_promoted: '⬆️',
            tier_demoted: '⬇️',
            verified: '✅',
            milestone_deliveries_100: '💯',
            milestone_deliveries_500: '🎯',
            milestone_deliveries_1000: '🏆',
            badge_earned: '🏅',
            joined_team: '🤝',
            left_team: '👋',
            became_team_leader: '👑',
            profile_visibility_changed: '👁️'
        };
        return icons[eventType] || '📝';
    };

    const getEventLabel = (eventType: string, detail: any) => {
        switch (eventType) {
            case 'joined_platform':
                return t('courier.career.joinedPlatform');
            case 'tier_promoted':
                return t('courier.career.tierPromoted', { tier: detail.new_tier });
            case 'tier_demoted':
                return t('courier.career.tierDemoted', { tier: detail.new_tier });
            case 'verified':
                return t('courier.career.verified');
            case 'milestone_deliveries_100':
                return t('courier.career.milestone100');
            case 'milestone_deliveries_500':
                return t('courier.career.milestone500');
            case 'milestone_deliveries_1000':
                return t('courier.career.milestone1000');
            case 'badge_earned':
                return t('courier.career.badgeEarned', { badge: detail.badge_name });
            case 'joined_team':
                return t('courier.career.joinedTeam', { team: detail.team_name });
            case 'left_team':
                return t('courier.career.leftTeam', { team: detail.team_name });
            case 'became_team_leader':
                return t('courier.career.becameTeamLeader', { team: detail.team_name });
            case 'profile_visibility_changed':
                return detail.is_public 
                    ? t('courier.career.profileMadePublic') 
                    : t('courier.career.profileMadePrivate');
            default:
                return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    const locationParts = [profile.city, profile.service_area_zone, profile.country].filter(Boolean);
    const locationDisplay = locationParts.length > 0 ? locationParts.join(', ') : t('courier.profile.locationUnknown');

    return (
        <div className="courier-profile-page">
            {/* Header */}
            <header className="profile-header">
                <div className="header-content">
                    <div className="profile-avatar-section">
                        <div className="avatar-wrapper">
                            {profile.profile_picture_url ? (
                                <img 
                                    src={profile.profile_picture_url.startsWith('/') 
                                        ? `${process.env.REACT_APP_API_URL}${profile.profile_picture_url}` 
                                        : profile.profile_picture_url} 
                                    alt={profile.name}
                                    className="profile-avatar"
                                />
                            ) : (
                                <div className="avatar-placeholder">
                                    {profile.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="profile-info">
                        <h1 className="profile-name">{profile.name}</h1>
                        
                        <div className="profile-badges">
                            <TierBadge tier={profile.current_tier} size="large" />
                            {profile.is_verified && (
                                <span className="verified-badge">
                                    ✓ {t('profile.verified')}
                                </span>
                            )}
                        </div>
                        
                        <div className="profile-meta">
                            <span className="meta-item">
                                <span className="meta-icon">📍</span>
                                <span>{locationDisplay}</span>
                            </span>
                            <span className="meta-item">
                                <span className="meta-icon">📅</span>
                                <span>{t('courier.profile.courierSince', { date: formatDate(profile.created_at) })}</span>
                            </span>
                            {profile.license_number && (
                                <span className="meta-item">
                                    <span className="meta-icon">🪪</span>
                                    <span>{t('courier.profile.license', { number: profile.license_number })}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <section className="stats-section">
                <div className="stat-card">
                    <div className="stat-value">{profile.completed_deliveries.toLocaleString()}</div>
                    <div className="stat-label">{t('courier.profile.completedDeliveries')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{profile.rating.toFixed(1)}</div>
                    <div className="stat-label">{t('courier.profile.rating')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{profile.tenure_days}</div>
                    <div className="stat-label">{t('courier.profile.tenureDays')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        {profile.current_tier === 'team_leader' && team?.members?.length 
                            ? team.members.length 
                            : '—'}
                    </div>
                    <div className="stat-label">{t('courier.profile.teamSize')}</div>
                </div>
            </section>

            {/* Team Info */}
            {team && profile.current_tier === 'team_leader' && (
                <section className="team-section">
                    <h2 className="section-title">{t('courier.profile.leadingTeam')}</h2>
                    <div className="team-info">
                        <div className="team-header">
                            <h3>{team.name}</h3>
                            <span className="team-member-count">
                                {team.members?.length || 0} {t('courier.profile.members')}
                            </span>
                        </div>
                        {team.stats && (
                            <div className="team-stats">
                                <div className="team-stat">
                                    <span className="stat-value">{team.stats.total_deliveries.toLocaleString()}</span>
                                    <span className="stat-label">{t('courier.profile.teamDeliveries')}</span>
                                </div>
                                <div className="team-stat">
                                    <span className="stat-value">{team.stats.average_rating.toFixed(1)}</span>
                                    <span className="stat-label">{t('courier.profile.teamAvgRating')}</span>
                                </div>
                                <div className="team-stat">
                                    <span className="stat-value">{team.stats.verified_count}</span>
                                    <span className="stat-label">{t('courier.profile.verifiedMembers')}</span>
                                </div>
                            </div>
                        )}
                        <div className="team-members">
                            {team.members?.map(member => (
                                <div key={member.courier_user_id} className="team-member">
                                    <div className="member-avatar">
                                        {member.profile_picture_url ? (
                                            <img src={member.profile_picture_url} alt={member.name} />
                                        ) : (
                                            <span>{member.name?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">{member.name}</span>
                                        <span className="member-tier">
                                            <TierBadge tier={member.current_tier || 'junior'} size="small" />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {team && profile.current_tier !== 'team_leader' && (
                <section className="team-section">
                    <h2 className="section-title">{t('courier.profile.memberOfTeam')}</h2>
                    <div className="team-info">
                        <div className="team-header">
                            <h3>{team.name}</h3>
                            <span className="team-role">{t('courier.profile.member')}</span>
                        </div>
                        <div className="team-leader">
                            {team.members?.find(m => m.courier_user_id === team.leader_user_id) && (
                                <div className="leader-info">
                                    <span className="leader-label">{t('courier.profile.teamLeader')}</span>
                                    <span className="leader-name">
                                        {team.members.find(m => m.courier_user_id === team.leader_user_id)?.name}
                                    </span>
                                    <TierBadge tier={team.members.find(m => m.courier_user_id === team.leader_user_id)?.current_tier || 'senior'} size="small" />
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Career Timeline */}
            <section className="career-section">
                <h2 className="section-title">{t('courier.profile.careerTimeline')}</h2>
                <div className="timeline">
                    {careerEvents.length === 0 ? (
                        <div className="empty-timeline">
                            <p>{t('courier.profile.noCareerEvents')}</p>
                        </div>
                    ) : (
                        careerEvents.map((event, index) => (
                            <div key={event.id} className="timeline-item">
                                <div className="timeline-marker">
                                    <span className="timeline-icon">{getEventIcon(event.event_type)}</span>
                                </div>
                                <div className="timeline-content">
                                    <div className="timeline-header">
                                        <span className="timeline-event">{getEventLabel(event.event_type, event.event_detail)}</span>
                                        <span className="timeline-date">{formatDate(event.occurred_at)}</span>
                                    </div>
                                    {event.event_detail && Object.keys(event.event_detail).length > 0 && (
                                        <details className="timeline-details">
                                            <summary>{t('courier.profile.viewDetails')}</summary>
                                            <pre>{JSON.stringify(event.event_detail, null, 2)}</pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Owner actions */}
            {isOwner && (
                <section className="owner-actions">
                    <h2 className="section-title">{t('courier.profile.profileSettings')}</h2>
                    <Link to="/profile" className="btn-secondary">
                        {t('courier.profile.editProfile')}
                    </Link>
                </section>
            )}
        </div>
    );
};

export default CourierProfilePage;