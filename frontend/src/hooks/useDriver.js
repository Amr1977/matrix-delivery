import { useState, useEffect, useRef } from 'react';

/**
 * Hook for managing driver location tracking
 * This provides app-wide location tracking for drivers
 */
const useDriver = (token, currentUser) => {
    const [driverLocation, setDriverLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const watchIdRef = useRef(null);
    const lastUpdateRef = useRef(0);

    const MIN_UPDATE_INTERVAL = 10000; // 10 seconds between updates

    /**
     * Get current driver location
     */
    const getDriverLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    timestamp: new Date().toISOString()
                };
                setDriverLocation(location);
                setLocationError(null);
            },
            (error) => {
                console.error('Geolocation error:', error);
                setLocationError(error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    };

    /**
     * Update driver location to backend
     */
    const updateDriverLocation = async () => {
        if (!token || !currentUser || currentUser.role !== 'driver') {
            return;
        }

        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const now = Date.now();

                // Throttle updates
                if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
                    return;
                }

                try {
                    const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';
                    const response = await fetch(`${API_URL}/drivers/location`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            heading: position.coords.heading,
                            speed: position.coords.speed,
                            accuracy: position.coords.accuracy
                        })
                    });

                    if (response.ok) {
                        lastUpdateRef.current = now;
                        const location = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            heading: position.coords.heading,
                            speed: position.coords.speed,
                            timestamp: new Date().toISOString()
                        };
                        setDriverLocation(location);
                        setLocationError(null);
                    }
                } catch (error) {
                    console.error('Failed to update driver location:', error);
                    setLocationError(error.message);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                setLocationError(error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    };

    /**
     * Start continuous location tracking for drivers
     */
    useEffect(() => {
        if (!token || !currentUser || currentUser.role !== 'driver') {
            // Clean up if not a driver
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            return;
        }

        // Get initial location
        getDriverLocation();

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    timestamp: new Date().toISOString()
                };
                setDriverLocation(location);
                setLocationError(null);
            },
            (error) => {
                console.error('Geolocation watch error:', error);
                setLocationError(error.message);
            },
            {
                enableHighAccuracy: false, // Battery-friendly
                timeout: 30000,
                maximumAge: 30000
            }
        );

        // Cleanup on unmount
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [token, currentUser]);

    return {
        driverLocation,
        locationError,
        getDriverLocation,
        updateDriverLocation
    };
};

export default useDriver;
