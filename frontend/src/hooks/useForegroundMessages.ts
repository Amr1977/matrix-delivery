import { useEffect, useRef } from 'react';
import { onMessage, getMessaging, isSupported } from 'firebase/messaging';
import { app } from '../firebase';

interface ForegroundMessage {
    title?: string;
    body?: string;
    data?: Record<string, string>;
}

export function useForegroundMessages(onMessageCallback?: (message: ForegroundMessage) => void) {
    const onMessageCallbackRef = useRef(onMessageCallback);
    
    // Update ref when callback changes
    useEffect(() => {
        onMessageCallbackRef.current = onMessageCallback;
    }, [onMessageCallback]);

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;
        let messagingInstance: any = null;

        const initMessaging = async () => {
            try {
                const supported = await isSupported();
                if (!supported || typeof window === 'undefined') {
                    console.log('Firebase Messaging not supported in this browser');
                    return;
                }

                messagingInstance = getMessaging(app);
                
                unsubscribe = onMessage(messagingInstance, (payload) => {
                    const { title, body } = payload.notification || {};
                    const data = payload.data || {};

                    console.log('Foreground push received:', payload);

                    // Call the callback if provided
                    if (onMessageCallbackRef.current) {
                        onMessageCallbackRef.current({ title, body, data });
                    }

                    // Show browser notification if supported
                    if (title && Notification.permission === 'granted') {
                        new Notification(title, {
                            body: body || '',
                            icon: '/defaulticon.png'
                        });
                    }

                    // Handle specific message types
                    if (data.type === 'ORDER_ASSIGNED') {
                        window.dispatchEvent(new CustomEvent('order:assigned', { detail: data }));
                    }

                    if (data.type === 'NEW_MESSAGE') {
                        window.dispatchEvent(new CustomEvent('chat:message', { detail: data }));
                    }
                });
            } catch (error) {
                console.warn('Failed to initialize Firebase Messaging:', error);
            }
        };

        initMessaging();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);
}
