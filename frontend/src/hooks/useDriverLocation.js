import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import usePageVisibility from './usePageVisibility';

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

    const isPageVisible = usePageVisibility();

    // Minimum time between location updates (10 seconds)
    const MIN_UPDATE_INTERVAL_MS = 10000;

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

            await api.post('/api/drivers/location', {
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
            if (response.location) {
                setLocation({
                    latitude: response.location.latitude,
                    longitude: response.location.longitude,
                    heading: response.location.heading,
                    speed_kmh: response.location.speed_kmh,
                    accuracy_meters: response.location.accuracy_meters,
                    timestamp: response.location.timestamp
                });
                setIsLive(true);
                setError(null);
            } else {
                setLocation(null);
                setIsLive(false);
            }
        } catch (err) {
            console.error('Failed to fetch driver location:', err);
            setError(err.message || 'Failed to fetch location');
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
    /**
     * Start tracking own location
     */
    useEffect(() => {
        if (!isOwnLocation || !shouldTrack) return;

        // Stop tracking if page is hidden to save battery
        if (!isPageVisible) {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

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
                timeout: 30000, // Increased from 15s
                maximumAge: 30000 // Increased from 5s
            }
        );

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isOwnLocation, shouldTrack, handlePositionUpdate, handlePositionError, isPageVisible]);

    /**
     * Poll for other driver's location
     */
    /**
     * Poll for other driver's location
     */
    useEffect(() => {
        if (isOwnLocation || !shouldTrack || !driverId) return;

        // Initial fetch
        if (isPageVisible) {
            fetchDriverLocation();
        }

        // Adaptive polling: 30s when visible, 5m when hidden
        const interval = isPageVisible ? 30000 : 300000;
        pollingIntervalRef.current = setInterval(fetchDriverLocation, interval);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [isOwnLocation, shouldTrack, driverId, fetchDriverLocation, isPageVisible]);

    return {
        location,
        error,
        isLive,
        updateLocation
    };
};

export default useDriverLocation;
