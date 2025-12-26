import React, { useState, useEffect } from 'react';
import api from '../api'; // Ensure this points to your configured axios instance

const SavedAddressSelector = ({ onSelect, onSaved, t, currentAddress, currentCoordinates }) => {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newAddressLabel, setNewAddressLabel] = useState('');

    // Fetch addresses on mount
    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users/me/addresses');
            if (Array.isArray(res.data)) {
                setAddresses(res.data);
            } else {
                console.warn('Unexpected addresses format:', res.data);
                setAddresses([]);
            }
        } catch (error) {
            console.error('Failed to load addresses:', error);
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCurrent = async (currentLocationData, label) => {
        console.log('Attempting to save address:', { currentLocationData, label }); // DEBUG

        if (!currentLocationData || !label) {
            console.warn('Cannot save: Missing data', { currentLocationData, label });
            alert('Please enter an address and a label to save.');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                label,
                address_data: currentLocationData.address,
                lat: currentLocationData.coordinates?.lat,
                lng: currentLocationData.coordinates?.lng,
                is_default: false
            };
            console.log('Sending payload:', payload); // DEBUG

            await api.post('/users/me/addresses', payload);
            await fetchAddresses(); // Refresh list
            setShowForm(false);
            setNewAddressLabel('');
            if (onSaved) onSaved();
            alert('Address saved!');
        } catch (error) {
            console.error('Failed to save address full error:', error);
            console.error('Error Response:', error.response?.data);
            alert(`Failed to save address: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm(t ? t('common.confirmDelete') : 'Are you sure?')) return;
        try {
            await api.delete(`/users/me/addresses/${id}`);
            setAddresses(addresses.filter(a => a.id !== id));
        } catch (error) {
            console.error('Failed to delete address:', error);
        }
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{
                display: 'flex',
                overflowX: 'auto',
                gap: '0.75rem',
                paddingBottom: '0.5rem',
                scrollbarWidth: 'thin'
            }}>
                {/* Add New Button */}
                <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        minWidth: '120px',
                        padding: '0.75rem',
                        background: 'transparent',
                        border: '2px dashed #4F46E5',
                        color: '#4F46E5',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <span>➕ {t ? t('common.saveAddress') : 'Save Address'}</span>
                </button>

                {/* Address Cards */}
                {(addresses || []).map(addr => (
                    <div
                        key={addr.id}
                        onClick={() => onSelect({
                            coordinates: { lat: parseFloat(addr.lat), lng: parseFloat(addr.lng) },
                            address: addr.address_data,
                            displayName: addr.label
                        })}
                        style={{
                            minWidth: '200px',
                            padding: '0.75rem',
                            background: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            position: 'relative',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 'bold', color: '#1F2937', fontSize: '0.875rem' }}>{addr.label}</span>
                            <button
                                type="button"
                                onClick={(e) => handleDelete(addr.id, e)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    padding: '0 0.25rem',
                                    fontSize: '0.75rem'
                                }}
                            >
                                🗑️
                            </button>
                        </div>
                        <p style={{
                            fontSize: '0.75rem',
                            color: '#6B7280',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {addr.address_data?.street || 'No street info'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
                            {addr.address_data?.city}
                        </p>
                    </div>
                ))}
            </div>

            {/* Save Current Form */}
            {showForm && (
                <div style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    background: '#F3F4F6',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    gap: '0.5rem'
                }}>
                    <input
                        type="text"
                        placeholder="Label (e.g. Home, Office)"
                        value={newAddressLabel}
                        onChange={(e) => setNewAddressLabel(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.375rem'
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (currentAddress && currentCoordinates) {
                                handleSaveCurrent({
                                    address: currentAddress,
                                    coordinates: currentCoordinates
                                }, newAddressLabel);
                            } else if (onSaved) {
                                // Fallback or if parent wants to handle it
                                onSaved(newAddressLabel);
                            }
                            // setNewAddressLabel(''); // Moved to handleSaveCurrent
                            // setShowForm(false); // Moved to handleSaveCurrent
                        }}
                        disabled={!newAddressLabel}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#4F46E5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            opacity: !newAddressLabel ? 0.5 : 1
                        }}
                    >
                        Save
                    </button>
                </div>
            )}
        </div>
    );
};

export default SavedAddressSelector;
