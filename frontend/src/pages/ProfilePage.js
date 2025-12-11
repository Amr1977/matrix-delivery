import React, { useEffect, useState } from 'react';
import RoleSwitcher from '../components/RoleSwitcher';

const ProfilePage = ({
    profileData,
    API_URL,
    token,
    setProfileData,
    setCurrentUser,
    currentUser,
    optimizeAndUploadProfilePicture,
    setError,
    preferencesData,
    setPreferencesData,
    activityData,
    paymentMethods,
    setPaymentMethods,
    favorites,
    setFavorites,
    onNavigate
}) => {
    // Local state for role switcher
    const [switching, setSwitching] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    // Debug Log for Role Switcher
    useEffect(() => {
        console.log('ProfilePage: profileData:', profileData);
        console.log('ProfilePage: granted_roles:', profileData?.granted_roles);
        console.log('ProfilePage: roles:', profileData?.roles);
    }, [profileData]);

    // Initialize edit form data when entering edit mode
    useEffect(() => {
        if (isEditing) {
            setEditFormData({ ...profileData });
        }
    }, [isEditing, profileData]);

    const handleSave = async () => {
        await updateProfile(editFormData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditFormData({});
    };

    const handleChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateProfile = async (patch) => {
        if (!token) return;
        try {
            // Remove read-only or derived fields if present to avoid backend errors
            const { id, email, created_at, updated_at, role, primary_role, granted_roles, ...updatableFields } = patch;

            const res = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatableFields) // Send only updatable fields
            });
            if (!res.ok) throw new Error('Failed to update profile');
            const d = await res.json();
            setProfileData((prev) => ({ ...prev, ...d.user }));
            if (setCurrentUser) setCurrentUser(d.user);
        } catch (err) {
            if (setError) setError(err.message || String(err));
        }
    };

    const removePaymentMethod = async (id) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/users/me/payment-methods/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setPaymentMethods(prev => prev.filter(p => p.id !== id));
        } catch (err) { if (setError) setError(err.message || String(err)); }
    };

    const handleRoleSwitch = (updatedUser) => {
        // Update local state and parent state
        setProfileData(prev => ({ ...prev, ...updatedUser }));
        if (setCurrentUser) setCurrentUser(updatedUser);
        // Reload page to ensure all app state (sockets, orders, etc.) refreshes with new role
        window.location.reload();
    };

    return (
        <div className="profile-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--matrix-bright-green, #10B981)', background: '#1F2937' }}>
                            {profileData.profile_picture_url ? (
                                <img src={profileData.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <img
                                    src={profileData.gender === 'female'
                                        ? '/assets/avatars/female_avatar_matrix.png'
                                        : '/assets/avatars/male_avatar_matrix.png'
                                    }
                                    alt="Default Avatar"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            )}
                        </div>
                        <label
                            style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                background: '#10B981',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }}
                            title="Upload Photo"
                        >
                            <span style={{ fontSize: '18px', marginTop: '-2px' }}>📷</span>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files && optimizeAndUploadProfilePicture && optimizeAndUploadProfilePicture(e.target.files[0])} />
                        </label>
                    </div>
                    <div>
                        <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', fontWeight: 'bold' }}>{profileData.name}</h1>
                        <div style={{ color: '#9CA3AF', fontSize: '16px' }}>{profileData.email || profileData.phone || '—'}</div>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: profileData.is_verified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                color: profileData.is_verified ? '#10B981' : '#9CA3AF',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                {profileData.is_verified ? '✓ Verified' : 'Unverified'}
                            </span>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#60A5FA',
                                fontSize: '14px',
                                fontWeight: '500',
                                textTransform: 'capitalize'
                            }}>
                                {profileData.primary_role || profileData.role || 'User'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Role Switcher Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    {/* Only show RoleSwitcher if user has multiple roles */}
                    {(profileData.granted_roles?.length > 1 || profileData.roles?.length > 1) && (
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Switch Role</h3>
                            <RoleSwitcher
                                currentRole={profileData.primary_role || profileData.role}
                                grantedRoles={profileData.granted_roles || profileData.roles}
                                onSwitch={handleRoleSwitch}
                            />
                        </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div style={{ marginTop: '10px' }}>
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{
                                    padding: '8px 20px',
                                    background: '#3B82F6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                ✏️ Edit Profile
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleCancel}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    style={{
                                        padding: '8px 20px',
                                        background: '#10B981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    💾 Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>

                {/* Quick Stats */}
                <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ marginTop: 0, color: '#A7F3D0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>📊 Activity Stats</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                        <div style={{ padding: '15px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{profileData.completed_deliveries || profileData.completedDeliveries || 0}</div>
                            <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '5px' }}>Completed Deliveries</div>
                        </div>
                        <div style={{ padding: '15px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FBBF24' }}>{profileData.rating ? Number(profileData.rating).toFixed(1) : '5.0'}</div>
                            <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '5px' }}>Average Rating</div>
                        </div>
                        {(profileData.primary_role === 'driver' || profileData.role === 'driver') && (
                            <div style={{ gridColumn: '1 / -1', padding: '15px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', textAlign: 'center', cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('earnings')}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#60A5FA' }}>View Earnings ➔</div>
                                <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '5px' }}>Go to Dashboard</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Details Form */}
                <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ marginTop: 0, color: '#A7F3D0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>📝 Personal Info</h3>

                    <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
                        <div>
                            <label style={{ display: 'block', color: '#9CA3AF', marginBottom: '5px', fontSize: '14px' }}>Full Name</label>
                            {isEditing ? (
                                <input
                                    value={editFormData.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                />
                            ) : (
                                <div style={{ padding: '10px', fontSize: '16px' }}>{profileData.name}</div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#9CA3AF', marginBottom: '5px', fontSize: '14px' }}>Phone Number</label>
                            {isEditing ? (
                                <input
                                    value={editFormData.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                />
                            ) : (
                                <div style={{ padding: '10px', fontSize: '16px' }}>{profileData.phone || '—'}</div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#9CA3AF', marginBottom: '5px', fontSize: '14px' }}>Language</label>
                                {isEditing ? (
                                    <select
                                        value={editFormData.language || ''}
                                        onChange={(e) => handleChange('language', e.target.value)}
                                        style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                    >
                                        <option value="">Default</option>
                                        <option value="en">English</option>
                                        <option value="ar">Arabic</option>
                                        <option value="tr">Turkish</option>
                                    </select>
                                ) : (
                                    <div style={{ padding: '10px', fontSize: '16px', textTransform: 'capitalize' }}>{profileData.language === 'en' ? 'English' : profileData.language === 'ar' ? 'Arabic' : profileData.language === 'tr' ? 'Turkish' : 'Default'}</div>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#9CA3AF', marginBottom: '5px', fontSize: '14px' }}>Theme</label>
                                {isEditing ? (
                                    <select
                                        value={editFormData.theme || ''}
                                        onChange={(e) => handleChange('theme', e.target.value)}
                                        style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                    >
                                        <option value="">System</option>
                                        <option value="dark">Dark</option>
                                        <option value="light">Light</option>
                                        <option value="matrix">Matrix</option>
                                    </select>
                                ) : (
                                    <div style={{ padding: '10px', fontSize: '16px', textTransform: 'capitalize' }}>{profileData.theme || 'System'}</div>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#9CA3AF', marginBottom: '5px', fontSize: '14px' }}>Gender</label>
                                {isEditing ? (
                                    <select
                                        value={editFormData.gender || 'male'}
                                        onChange={(e) => handleChange('gender', e.target.value)}
                                        style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                ) : (
                                    <div style={{ padding: '10px', fontSize: '16px', textTransform: 'capitalize' }}>{profileData.gender || 'Male'}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Driver Specifics */}
                {(profileData.primary_role === 'driver' || profileData.role === 'driver' || (profileData.roles && profileData.roles.includes('driver')) || (profileData.granted_roles && profileData.granted_roles.includes('driver'))) && (
                    <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ marginTop: 0, color: '#A7F3D0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>🚗 Driver Settings</h3>

                        <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#9CA3AF', marginBottom: '5px', fontSize: '14px' }}>Vehicle Type</label>
                                    {isEditing ? (
                                        <select
                                            value={editFormData.vehicle_type || ''}
                                            onChange={(e) => handleChange('vehicle_type', e.target.value)}
                                            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                        >
                                            <option value="">Select</option>
                                            <option value="bike">Bike</option>
                                            <option value="car">Car</option>
                                            <option value="van">Van</option>
                                            <option value="truck">Truck</option>
                                        </select>
                                    ) : (
                                        <div style={{ padding: '10px', fontSize: '16px', textTransform: 'capitalize' }}>{profileData.vehicle_type || '—'}</div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#9CA3AF', marginBottom: '5px', fontSize: '14px' }}>License</label>
                                    {isEditing ? (
                                        <input
                                            value={editFormData.license_number || ''}
                                            onChange={(e) => handleChange('license_number', e.target.value)}
                                            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                        />
                                    ) : (
                                        <div style={{ padding: '10px', fontSize: '16px' }}>{profileData.license_number || '—'}</div>
                                    )}
                                </div>
                            </div>

                            <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="checkbox"
                                    id="availability"
                                    checked={!!profileData.is_available}
                                    onChange={async (e) => {
                                        try {
                                            const res = await fetch(`${API_URL}/users/me/availability`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_available: !!e.target.checked }) });
                                            if (res.ok) {
                                                const d = await res.json();
                                                setProfileData((prev) => ({ ...prev, is_available: d.isAvailable }));
                                            }
                                        } catch (err) { if (setError) setError(err.message || String(err)); }
                                    }}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                <label htmlFor="availability" style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ fontWeight: 'bold' }}>Available for Orders</div>
                                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Status: {profileData.is_available ? 'ONLINE' : 'OFFLINE'}</div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Methods */}
                <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ marginTop: 0, color: '#A7F3D0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>💳 Payment Methods</h3>

                    <div style={{ marginTop: '15px' }}>
                        {paymentMethods.length === 0 ? (
                            <div style={{ color: '#9CA3AF', fontStyle: 'italic', padding: '10px' }}>No payment methods added.</div>
                        ) : (
                            paymentMethods.map(pm => (
                                <div key={pm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', marginBottom: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{pm.payment_method_type} • {pm.masked_details}</div>
                                        {pm.is_default && <div style={{ fontSize: '12px', color: '#10B981' }}>Default Method</div>}
                                    </div>
                                    <button onClick={() => removePaymentMethod(pm.id)} style={{ background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Remove</button>
                                </div>
                            ))
                        )}
                        {/* Add method button could go here */}
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div style={{ marginTop: '30px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                <p>User ID: {profileData.id}</p>
                <p>Matrix Delivery v1.0.0</p>
            </div>

        </div>
    );
};

export default ProfilePage;
