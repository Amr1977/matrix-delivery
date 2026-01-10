import { useEffect, useRef } from 'react';
import usePageVisibility from './usePageVisibility';
import api from '../api';

/**
 * Custom hook to send periodic heartbeat to backend
 * Tracks user activity for online status
 * 
 * @param token - Authentication token
 * @param apiUrl - Base API URL
 */
export const useHeartbeat = (token: string | null, apiUrl: string) => {
    const isPageVisible = usePageVisibility();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const HEARTBEAT_INTERVAL_MS = 7 * 60 * 1000; // 7 minutes

    useEffect(() => {
        // Only run heartbeat if user is logged in
        if (!token) {
            return;
        }

        const sendHeartbeat = async () => {
            // Don't send heartbeat if page is hidden (battery optimization)
            if (!isPageVisible) {
                return;
            }

            try {
                await api.post('/heartbeat');
                console.log('💓 Heartbeat sent successfully');
            } catch (error: any) {
                // Silent failure - heartbeat is not critical
                console.warn('💓 Heartbeat failed:', error.message);
            }
        };

        // Send initial heartbeat immediately
        sendHeartbeat();

        // Then send heartbeat every 7 minutes
        intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

        // Cleanup on unmount or token change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [token, apiUrl, isPageVisible]);

    // No return value needed - this is a side-effect only hook
};
