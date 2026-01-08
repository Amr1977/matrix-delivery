import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, Edit2, Check, X, Info } from 'lucide-react';

/**
 * CashBalanceCard Component
 * 
 * Allows drivers to view and update their available cash balance for upfront payments.
 * Uses Matrix Design System standards (Glassmorphism, Neon Green, Dark Mode).
 * 
 * @param {Object} props - Component props
 * @param {string} props.token - Authentication token
 * @param {string} props.API_URL - Base API URL
 * @param {Object} props.currentUser - Current logged-in user
 * @param {Function} props.setError - Error handler function
 * @param {Function} props.t - Translation function
 */
const CashBalanceCard = ({ token, API_URL, currentUser, setError, t }) => {
    const [cashBalance, setCashBalance] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [newBalance, setNewBalance] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    // Only show for drivers
    const isDriver = currentUser?.primary_role === 'driver' ||
        (currentUser?.granted_roles && currentUser.granted_roles.includes('driver'));

    // Fetch cash balance on mount
    useEffect(() => {
        if (isDriver) {
            fetchCashBalance();
        }
    }, [isDriver]);

    const fetchCashBalance = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/users/me/cash-balance`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setCashBalance(data.availableCash || 0);
            } else {
                throw new Error('Failed to fetch cash balance');
            }
        } catch (error) {
            console.error('Error fetching cash balance:', error);
            setError && setError('Failed to load cash balance');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setNewBalance(cashBalance.toString());
        setIsEditing(true);
    };

    const handleCancel = () => {
        setNewBalance('');
        setIsEditing(false);
    };

    const handleSave = async () => {
        const amount = parseFloat(newBalance);

        // Validation
        if (isNaN(amount) || amount < 0) {
            setError && setError('Please enter a valid positive number');
            return;
        }

        setSaveLoading(true);
        try {
            const response = await fetch(`${API_URL}/users/me/cash-balance`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ availableCash: amount })
            });

            if (response.ok) {
                const data = await response.json();
                setCashBalance(data.availableCash);
                setIsEditing(false);
                setNewBalance('');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update cash balance');
            }
        } catch (error) {
            console.error('Error updating cash balance:', error);
            setError && setError(error.message || 'Failed to update cash balance');
        } finally {
            setSaveLoading(false);
        }
    };

    // Don't render if user is not a driver
    if (!isDriver) {
        return null;
    }

    return (
        <div style={{
            background: 'rgba(10, 14, 39, 0.6)', // Matrix Dark Glass
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 65, 0.2)', // Matrix Green Border
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 0 20px rgba(0, 255, 65, 0.05)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        padding: '0.5rem',
                        background: 'rgba(0, 255, 65, 0.1)',
                        borderRadius: '0.5rem',
                        color: 'var(--matrix-bright-green, #00ff41)'
                    }}>
                        <Wallet size={24} />
                    </div>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        margin: 0,
                        background: 'linear-gradient(135deg, var(--matrix-bright-green, #00ff41), #00ffff)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {t ? t('profile.availableCash') : 'Available Cash'}
                    </h3>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleEdit}
                        style={{
                            background: 'rgba(0, 255, 65, 0.1)',
                            border: '1px solid rgba(0, 255, 65, 0.3)',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 1rem',
                            color: 'var(--matrix-bright-green, #00ff41)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(0, 255, 65, 0.2)';
                            e.target.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(0, 255, 65, 0.1)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        <Edit2 size={16} />
                        Edit
                    </button>
                )}
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', opacity: 0.7, lineHeight: 1.5 }}>
                {t ? t('profile.availableCashDesc') : 'Set your available cash for orders requiring upfront payments'}
            </p>

            {/* Balance Display / Edit Form */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }} className="skeleton">
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Loading balance...</span>
                </div>
            ) : isEditing ? (
                <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: 'rgba(255,255,255,0.6)'
                        }}>
                            New Amount (EGP)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newBalance}
                            onChange={(e) => setNewBalance(e.target.value)}
                            placeholder="0.00"
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(0, 255, 65, 0.3)',
                                background: 'rgba(0, 0, 0, 0.3)',
                                color: 'white',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                outline: 'none',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--matrix-bright-green, #00ff41)';
                                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(0, 255, 65, 0.3)';
                                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.5)';
                            }}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={handleSave}
                            disabled={saveLoading}
                            style={{
                                flex: 1,
                                padding: '0.875rem',
                                background: 'linear-gradient(135deg, var(--matrix-bright-green, #00ff41), #00cc33)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: 'black',
                                fontSize: '0.875rem',
                                fontWeight: 'bold',
                                cursor: saveLoading ? 'not-allowed' : 'pointer',
                                opacity: saveLoading ? 0.7 : 1,
                                transition: 'all 0.2s',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 15px rgba(0, 255, 65, 0.3)'
                            }}
                            onMouseEnter={(e) => !saveLoading && (e.target.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => !saveLoading && (e.target.style.transform = 'translateY(0)')}
                        >
                            <Check size={18} />
                            {saveLoading ? 'Saving...' : 'Save Balance'}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={saveLoading}
                            style={{
                                flex: 1,
                                padding: '0.875rem',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '0.5rem',
                                color: 'white',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: saveLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => !saveLoading && (e.target.style.background = 'rgba(255, 255, 255, 0.05)')}
                            onMouseLeave={(e) => !saveLoading && (e.target.style.background = 'transparent')}
                        >
                            <X size={18} />
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    textAlign: 'center',
                    border: '1px solid rgba(0, 255, 65, 0.1)',
                    position: 'relative'
                }}>
                    <div style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        opacity: 0.6,
                        marginBottom: '0.5rem'
                    }}>
                        Current Capacity
                    </div>
                    <div style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        marginBottom: '0.25rem',
                        color: 'white',
                        textShadow: '0 0 20px rgba(0, 255, 65, 0.4)'
                    }}>
                        {formatCurrency(cashBalance, 'EGP')}
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(0, 255, 255, 0.05)',
                borderRadius: '0.5rem',
                borderLeft: '2px solid var(--matrix-cyan, #00ffff)',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                gap: '0.75rem',
                lineHeight: 1.4
            }}>
                <Info size={16} style={{ minWidth: '16px', color: 'var(--matrix-cyan, #00ffff)' }} />
                <span>
                    <strong>Note:</strong> Orders with <code>upfront_payment</code> higher than your capacity will be hidden. Zero-payment orders are always visible.
                </span>
            </div>
        </div>
    );
};

export default CashBalanceCard;
