import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

/**
 * Custom hook for managing driver location tracking
 * @param {string} driverId - Driver's user ID (null for own location)
 * @param {boolean} shouldTrack - Whether to actively track location
 * @param {boolean} isOwnLocation - Whether this is the driver's own location
 * @returns {Object} { location, error, isLive, updateLocation }
 */
const useDriverLocation = (driverId = null, shouldTrack = false, isOwnLocation = false) => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const watchIdRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const lastUpdateTimeRef = useRef(0);

    // Minimum time between location updates (5 seconds)
    const MIN_UPDATE_INTERVAL_MS = 5000;

    /**
     * Update driver's location to backend
     */
    const updateLocation = useCallback(async (latitude, longitude, heading = null, speed = null, accuracy = null) => {
        try {
            const now = Date.now();

            // Throttle updates
            if (now - lastUpdateTimeRef.current < MIN_UPDATE_INTERVAL_MS) {
                return;
            }

            await api.post('/drivers/location/bidding', {
                latitude,
                longitude,
                heading,
                speed,
                accuracy
            });

            lastUpdateTimeRef.current = now;

            setLocation({
                latitude,
                longitude,
                heading,
                speed_kmh: speed,
                accuracy_meters: accuracy,
                timestamp: new Date().toISOString()
            });

            setIsLive(true);
            setError(null);
        } catch (err) {
            console.error('Failed to update location:', err);
            setError(err.message || 'Failed to update location');
        }
    }, []);

    /**
     * Fetch driver location from backend
     */
    const fetchDriverLocation = useCallback(async () => {
        if (!driverId) return;

        try {
            const response = await api.get(`/drivers/location/bidding/${driverId}`);

            if (response.data.success && response.data.location) {
                setLocation(response.data.location);
                setIsLive(true);
                setError(null);
            }
        } catch (err) {
            // 404 is expected if driver hasn't updated location recently
            if (err.response?.status !== 404) {
                console.error('Failed to fetch driver location:', err);
                setError(err.message || 'Failed to fetch location');
            }
            setLocation(null);
            setIsLive(false);
        }
    }, [driverId]);

    /**
     * Handle geolocation position update
     */
    const handlePositionUpdate = useCallback((position) => {
        const { latitude, longitude, heading, speed, accuracy } = position.coords;

        updateLocation(
            latitude,
            longitude,
            heading,
            speed ? speed * 3.6 : null, // Convert m/s to km/h
            accuracy
        );
    }, [updateLocation]);

    /**
     * Handle geolocation error
     */
    const handlePositionError = useCallback((err) => {
        console.error('Geolocation error:', err);
        setError(`Geolocation error: ${err.message}`);
        setIsLive(false);
    }, []);

    /**
     * Start tracking own location
     */
    useEffect(() => {
        if (!isOwnLocation || !shouldTrack) return;

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            handlePositionError,
            {
                enableHighAccuracy: false, // Battery-friendly
                timeout: 15000,
                maximumAge: 5000
            }
        );

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isOwnLocation, shouldTrack, handlePositionUpdate, handlePositionError]);

    /**
     * Poll for other driver's location
     */
    useEffect(() => {
        if (isOwnLocation || !shouldTrack || !driverId) return;

        // Initial fetch
        fetchDriverLocation();

        // Poll every 15 seconds
        pollingIntervalRef.current = setInterval(fetchDriverLocation, 15000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [isOwnLocation, shouldTrack, driverId, fetchDriverLocation]);

    return {
        location,
        error,
        isLive,
        updateLocation
    };
};

export default useDriverLocation;
