import React from 'react';
import { useI18n } from 'i18n/i18nContext';

// Courier tier types
type CourierTier = "junior" | "mid" | "senior" | "team_leader";

interface TierBadgeProps {
    tier: CourierTier;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    className?: string;
}

const TIER_COLORS: Record<CourierTier, { bg: string; text: string; border: string }> = {
    junior: {
        bg: 'rgba(107, 114, 128, 0.2)',
        text: '#9CA3AF',
        border: 'rgba(107, 114, 128, 0.3)'
    },
    mid: {
        bg: 'rgba(59, 130, 246, 0.2)',
        text: '#60A5FA',
        border: 'rgba(59, 130, 246, 0.3)'
    },
    senior: {
        bg: 'rgba(245, 158, 11, 0.2)',
        text: '#FBBF24',
        border: 'rgba(245, 158, 11, 0.3)'
    },
    team_leader: {
        bg: 'rgba(168, 85, 247, 0.2)',
        text: '#C084FC',
        border: 'rgba(168, 85, 247, 0.3)'
    }
};

const TIER_ICONS: Record<CourierTier, string> = {
    junior: '🌱',
    mid: '⭐',
    senior: '🏆',
    team_leader: '👑'
};

const SIZE_STYLES: Record<'small' | 'medium' | 'large', { padding: string; fontSize: string; borderRadius: string; gap: string }> = {
    small: { padding: '2px 8px', fontSize: '11px', borderRadius: '10px', gap: '3px' },
    medium: { padding: '4px 12px', fontSize: '13px', borderRadius: '12px', gap: '5px' },
    large: { padding: '8px 16px', fontSize: '16px', borderRadius: '16px', gap: '8px' }
};

export const TierBadge: React.FC<TierBadgeProps> = ({
    tier,
    size = 'medium',
    showLabel = true,
    className = ''
}) => {
    const { t } = useI18n();
    const colors = TIER_COLORS[tier] || TIER_COLORS.junior;
    const sizeStyle = SIZE_STYLES[size];
    const icon = TIER_ICONS[tier] || '';

    // Translation keys for tier names
    const tierLabels: Record<CourierTier, string> = {
        junior: t('courier.tier.junior') || 'Junior',
        mid: t('courier.tier.mid') || 'Mid',
        senior: t('courier.tier.senior') || 'Senior',
        team_leader: t('courier.tier.teamLeader') || 'Team Leader'
    };

    return (
        <span
            className={`tier-badge ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: sizeStyle.gap,
                padding: sizeStyle.padding,
                borderRadius: sizeStyle.borderRadius,
                fontSize: sizeStyle.fontSize,
                fontWeight: 'bold',
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                textTransform: 'capitalize',
                whiteSpace: 'nowrap'
            }}
        >
            {size !== 'small' && icon}
            {showLabel && <span>{tierLabels[tier]}</span>}
        </span>
    );
};

// Convenience component for displaying tier with tooltip/info
export const TierBadgeWithInfo: React.FC<{ tier: CourierTier; size?: 'small' | 'medium' | 'large' }> = ({
    tier,
    size = 'medium'
}) => {
    const { t } = useI18n();
    
    const tierDescriptions: Record<CourierTier, string> = {
        junior: t('courier.tier.juniorDesc') || 'New courier starting their journey',
        mid: t('courier.tier.midDesc') || 'Experienced courier with 200+ deliveries',
        senior: t('courier.tier.seniorDesc') || 'Expert courier with 800+ deliveries and high rating',
        team_leader: t('courier.tier.teamLeaderDesc') || 'Senior courier leading a team of couriers'
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <TierBadge tier={tier} size={size} />
            {/* Tooltip could be added here with a library or custom implementation */}
        </div>
    );
};

export default TierBadge;