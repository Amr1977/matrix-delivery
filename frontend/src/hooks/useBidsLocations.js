import { useState, useEffect, useRef } from 'react';
import api from '../api';

/**
 * Hook to fetch and poll live locations of all drivers who bid on an order
 * @param {string} orderId - Order ID
 * @param {boolean} active - Whether to poll
 * @returns {Object} { locations, loading, error }
 */
const useBidsLocations = (orderId, active = false) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const pollIntervalRef = useRef(null);

    const fetchLocations = async () => {
        if (!orderId) return;

        try {
            const response = await api.get(`/api/orders/${orderId}/bids/locations`);
            setLocations(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch bid locations:', err);
            setError(err.message || 'Failed to fetch locations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && orderId) {
            fetchLocations();
            pollIntervalRef.current = setInterval(fetchLocations, 15000); // Poll every 15 seconds
        } else {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [orderId, active]);

    return { locations, loading, error, refresh: fetchLocations };
};

export default useBidsLocations;
