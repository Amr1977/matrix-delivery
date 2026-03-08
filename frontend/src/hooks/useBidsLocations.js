import { useState, useEffect, useRef } from 'react';
import api from '../api';
import usePageVisibility from './usePageVisibility';

/**
 * Hook to fetch and poll live locations of all drivers who bid on an order
 * @param {string} orderId - Order ID
 * @param {boolean} active - Whether to poll
 * @param {boolean} rapid - Whether to use rapid polling (map is visible)
 * @returns {Object} { locations, loading, error }
 */
const useBidsLocations = (orderId, active = false, rapid = false) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const pollIntervalRef = useRef(null);
    const isPageVisible = usePageVisibility();

    // Dynamic intervals: 5 seconds for rapid, 30 seconds for relaxed
    const RAPID_INTERVAL = 5000;
    const RELAXED_INTERVAL = 30000;

    const fetchLocations = async () => {
        if (!orderId || !isPageVisible) return;

        try {
            const data = await api.get(`/orders/${orderId}/bids/locations`);
            setLocations(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch bid locations:', err);
            setError(err.message || 'Failed to fetch locations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && orderId && isPageVisible) {
            fetchLocations();
            const interval = rapid ? RAPID_INTERVAL : RELAXED_INTERVAL;
            
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
            
            pollIntervalRef.current = setInterval(fetchLocations, interval);
            console.log(`📡 [Order ${orderId}] Polling ${rapid ? 'RAPID' : 'RELAXED'} (${interval}ms)`);
        } else {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [orderId, active, rapid, isPageVisible]);

    return { locations, loading, error, refresh: fetchLocations };
};

export default useBidsLocations;
