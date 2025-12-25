import React, { useState } from 'react';
import './RoleSwitcher.css';

const RoleSwitcher = ({ currentRole, grantedRoles, onSwitch }) => {
    const [switching, setSwitching] = useState(false);
    const [error, setError] = useState('');

    // Don't show if user only has one primary_role
    if (!grantedRoles || grantedRoles.length <= 1) {
        return null;
    }

    const handleRoleChange = async (newRole) => {
        if (newRole === currentRole) return;

        setSwitching(true);
        setError('');

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/users/me/switch-primary_role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ newRole })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to switch role');
            }

            const data = await response.json();

            // Call parent callback with new user data
            if (onSwitch) {
                onSwitch(data.user);
            }

            // Reload page to refresh all data with new primary_role
            window.location.reload();
        } catch (err) {
            setError(err.message);
            setSwitching(false);
        }
    };

    const getRoleLabel = (primary_role) => {
        const labels = {
            customer: '👤 Customer',
            driver: '🚗 Driver',
            vendor: '🏪 Vendor',
            admin: '⚙️ Admin'
        };
        return labels[primary_role] || primary_role;
    };

    return (
        <div className="primary_role-switcher">
            <label className="primary_role-switcher-label">Active Role:</label>
            <select
                className="primary_role-switcher-select"
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={switching}
            >
                {grantedRoles.map(primary_role => (
                    <option key={primary_role} value={primary_role}>
                        {getRoleLabel(primary_role)}
                    </option>
                ))}
            </select>
            {switching && <span className="primary_role-switcher-loading">Switching...</span>}
            {error && <span className="primary_role-switcher-error">{error}</span>}
        </div>
    );
};

export default RoleSwitcher;
