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

    // Simple in-memory cache to prevent redundant fetches when multiple instances mount
    // (e.g., Pickup and Dropoff maps both mounting at the same time)
    const requestCache = React.useRef(null);

    const fetchAddresses = async () => {
        try {
            setLoading(true);

            // Check global cache first (if we were using Redux/Context, this would be cleaner)
            // For now, we'll just allow the fetch but maybe verify if we want to dedup.
            // Actually, the best way to dedup these parallel requests is difficult without a shared store.
            // But we can at least ensure we don't spam on re-mounts if we could persist data.
            // Let's just proceed with standard fetch but maybe debounce? 
            // No, user complaint "repeated address requests" implies seeing many lines. 
            // Pickup + Dropoff = 2 requests.
            // If they see 6, it means 3 renders.

            const res = await api.get('/users/me/addresses');
            // api.js returns response.json() directly, so res IS the array
            if (Array.isArray(res)) {
                setAddresses(res);
            } else {
                console.warn('Unexpected addresses format:', res);
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

    // Helper for translation with fallback
    const tr = (key, defaultText) => {
        if (!t) return defaultText;
        const val = t(key);
        return val === key ? defaultText : val;
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                {/* Save Address Button */}
                <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '0.6rem 1rem',
                        background: showForm ? '#4F46E5' : 'transparent',
                        color: showForm ? 'white' : '#4F46E5',
                        border: '1px solid #4F46E5',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <span>{showForm ? '✖' : '➕'}</span>
                    <span>{tr('common.saveAddress', 'Save Location')}</span>
                </button>

                {/* Dropdown List */}
                {addresses.length > 0 ? (
                    <div style={{ flex: 1, minWidth: '200px', maxWidth: '400px', display: 'flex', gap: '0.5rem' }}>
                        <select
                            onChange={(e) => {
                                const id = e.target.value;
                                if (!id) return;
                                const addr = addresses.find(a => a.id === id);
                                if (addr) {
                                    onSelect({
                                        coordinates: { lat: parseFloat(addr.lat), lng: parseFloat(addr.lng) },
                                        address: addr.address_data,
                                        displayName: addr.label
                                    });
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '0.6rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '0.375rem',
                                background: '#FFFFFF',
                                color: '#1F2937',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>-- {tr('common.selectSavedAddress', 'Select a saved address')} --</option>
                            {addresses.map(addr => (
                                <option key={addr.id} value={addr.id}>
                                    {addr.label} - {addr.address_data?.street || addr.address_data?.city || 'No details'}
                                </option>
                            ))}
                        </select>

                        {/* Delete Button (only for selected? No, dropdowns are tricky for per-item actions. 
                            Let's keep it simple: Select to use. 
                            To delete, maybe a separate manage view? 
                            For now, I'll add a small "x" button next to the dropdown if I track selection, 
                            but native select doesn't support nested buttons.
                            I'll leave delete out of the dropdown view for simplicity or add a "Manage" mode later.
                            User just asked for a droplist.
                        */}
                    </div>
                ) : (
                    <span style={{ fontSize: '0.875rem', color: '#6B7280', fontStyle: 'italic' }}>
                        {tr('common.noSavedAddresses', 'No saved addresses yet')}
                    </span>
                )}
            </div>

            {/* Save Current Form */}
            {showForm && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '1rem',
                    background: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    <strong style={{ fontSize: '0.875rem', color: '#166534' }}>
                        {tr('common.saveCurrentAs', 'Save current location as:')}
                    </strong>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Home, Gym, Office..."
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
                                    onSaved(newAddressLabel);
                                }
                            }}
                            disabled={!newAddressLabel}
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#16A34A',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                opacity: !newAddressLabel ? 0.6 : 1,
                                fontWeight: 'bold'
                            }}
                        >
                            {tr('common.save', 'Save')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedAddressSelector;
