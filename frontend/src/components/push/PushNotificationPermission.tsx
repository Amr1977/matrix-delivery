import React from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useI18n } from '../../i18n/i18nContext';

interface Props {
    onComplete?: () => void;
}

export const PushNotificationPermission: React.FC<Props> = ({ onComplete }) => {
    const { t } = useI18n();
    const { registerForPush, unregisterFromPush, isSupported, permission } = usePushNotifications();

    const handleEnable = async () => {
        const result = await registerForPush();
        if (result.success) {
            onComplete?.();
        }
    };

    const handleDisable = async () => {
        await unregisterFromPush();
    };

    if (!isSupported) {
        return null; // Push not supported
    }

    if (permission === 'granted') {
        return (
            <button 
                data-testid="push-notification-enabled"
                onClick={handleDisable}
                className="btn-secondary"
            >
                {t('pushNotifications.enabled')}
            </button>
        );
    }

    return (
        <button 
            data-testid="push-notification-enable-button"
            onClick={handleEnable}
            className="btn-primary"
        >
            {t('pushNotifications.enable')}
        </button>
    );
};

export default PushNotificationPermission;