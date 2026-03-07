import { useCallback, useEffect, useState } from 'react';
import { getToken, getMessaging, isSupported } from 'firebase/messaging';
import { app } from '../firebase';
import api from '../api';

interface PushRegistrationResult {
    success: boolean;
    token?: string;
    error?: string;
}

export function usePushNotifications(): {
    registerForPush: () => Promise<PushRegistrationResult>;
    unregisterFromPush: () => Promise<void>;
    isSupported: boolean;
    permission: NotificationPermission;
} {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if notifications are supported
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    const registerForPush = useCallback(async (): Promise<PushRegistrationResult> => {
        try {
            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                return { success: false, error: 'Permission denied' };
            }

            // Get FCM token
            const messaging = getMessaging(app);
            const token = await getToken(messaging, {
                vapidKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
            });

            if (!token) {
                return { success: false, error: 'No token returned' };
            }

            // Send to backend
            await api.post('/push/register', { token });

            return { success: true, token };
        } catch (error: any) {
            console.error('Push registration error:', error);
            return { success: false, error: error.message };
        }
    }, []);

    const unregisterFromPush = useCallback(async (): Promise<void> => {
        try {
            const messaging = getMessaging(app);
            const token = await getToken(messaging, {
                vapidKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
            }).catch(() => null);

            if (token) {
                await api.post('/push/unregister', { token });
            }
        } catch (error) {
            console.error('Push unregistration error:', error);
        }
    }, []);

    return { registerForPush, unregisterFromPush, isSupported, permission };
}