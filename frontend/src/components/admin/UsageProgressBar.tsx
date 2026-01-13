/**
 * UsageProgressBar Component
 * Displays usage progress with color-coded thresholds
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import React from 'react';

export interface UsageProgressBarProps {
    used: number;
    limit: number;
    label: string;
    showPercentage?: boolean;
}

// Color thresholds
const getProgressColor = (percentage: number): string => {
    if (percentage >= 95) return '#EF4444'; // red - danger
    if (percentage >= 80) return '#F59E0B'; // yellow - warning
    return '#10B981'; // green - normal
};

const getProgressBgColor = (percentage: number): string => {
    if (percentage >= 95) return '#FEE2E2'; // red background
    if (percentage >= 80) return '#FEF3C7'; // yellow background
    return '#D1FAE5'; // green background
};

export const UsageProgressBar: React.FC<UsageProgressBarProps> = ({
    used,
    limit,
    label,
    showPercentage = true
}) => {
    // Calculate percentage (handle division by zero)
    const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    
    // Get colors based on threshold
    const progressColor = getProgressColor(percentage);
    const progressBgColor = getProgressBgColor(percentage);

    // Format numbers for display
    const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    };

    return (
        <div className="usage-progress-bar" data-testid="usage-progress-bar">
            {/* Label and Values */}
            <div className="progress-header" data-testid="progress-header">
                <span className="progress-label" data-testid="progress-label">
                    {label}
                </span>
                <span className="progress-values" data-testid="progress-values">
                    {formatNumber(used)} / {formatNumber(limit)}
                    {showPercentage && (
                        <span 
                            className="progress-percentage"
                            data-testid="progress-percentage"
                            style={{ color: progressColor }}
                        >
                            ({percentage.toFixed(1)}%)
                        </span>
                    )}
                </span>
            </div>

            {/* Progress Bar */}
            <div 
                className="progress-track"
                data-testid="progress-track"
                style={{ backgroundColor: progressBgColor }}
            >
                <div
                    className="progress-fill"
                    data-testid="progress-fill"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: progressColor
                    }}
                />
            </div>

            <style>{`
                .usage-progress-bar {
                    width: 100%;
                }

                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                }

                .progress-label {
                    font-weight: 500;
                    color: var(--matrix-bright-green);
                }

                .progress-values {
                    color: var(--matrix-secondary);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .progress-percentage {
                    font-weight: 600;
                    font-size: 0.75rem;
                }

                .progress-track {
                    width: 100%;
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.3s ease, background-color 0.3s ease;
                    min-width: 2px; /* Ensure visibility even at 0% */
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .progress-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.25rem;
                    }

                    .progress-values {
                        font-size: 0.75rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default UsageProgressBar;