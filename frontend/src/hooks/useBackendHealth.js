import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to monitor backend health
 * @param {string} apiUrl - Base API URL
 * @returns {Object} Health status and check function
 */
export const useBackendHealth = (apiUrl) => {
    const [isHealthy, setIsHealthy] = useState(true);
    const [isChecking, setIsChecking] = useState(false);
    const [lastCheck, setLastCheck] = useState(null);
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);
    const checkIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    const checkHealth = useCallback(async () => {
        if (!isMountedRef.current) return;

        setIsChecking(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(`${apiUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'healthy' || data.status === 'ok') {
                    if (!isHealthy) {
                        console.log('✅ Backend is back online!');
                    }
                    setIsHealthy(true);
                    setConsecutiveFailures(0);
                    setLastCheck(new Date());
                } else {
                    throw new Error('Backend returned non-healthy status');
                }
            } else {
                throw new Error(`Backend returned ${response.status}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⏱️ Backend health check timed out');
            } else {
                console.warn('❌ Backend health check failed:', error.message);
            }

            setConsecutiveFailures(prev => prev + 1);

            // Only mark as unhealthy after 5 consecutive failures to avoid false positives
            if (consecutiveFailures >= 4) {
                if (isHealthy) {
                    console.error('🚨 Backend is DOWN - showing maintenance page');
                }
                setIsHealthy(false);
            }

            setLastCheck(new Date());
        } finally {
            if (isMountedRef.current) {
                setIsChecking(false);
            }
        }
    }, [apiUrl, isHealthy, consecutiveFailures]);

    useEffect(() => {
        isMountedRef.current = true;

        // Initial health check
        checkHealth();

        // Set up periodic health checks
        const interval = isHealthy ? 60000 : 10000; // 60s when healthy, 10s when down

        checkIntervalRef.current = setInterval(checkHealth, interval);

        return () => {
            isMountedRef.current = false;
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [checkHealth, isHealthy]);

    return {
        isHealthy,
        isChecking,
        lastCheck,
        checkHealth,
        consecutiveFailures
    };
};
