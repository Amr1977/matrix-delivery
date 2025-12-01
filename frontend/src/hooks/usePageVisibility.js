import { useState, useEffect } from 'react';

/**
 * Custom hook to detect page visibility
 * Returns true when page is visible, false when hidden
 * 
 * Use this to pause expensive operations when tab is in background
 */
const usePageVisibility = () => {
    const [isVisible, setIsVisible] = useState(!document.hidden);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
            console.log(`🔍 Page visibility changed: ${document.hidden ? 'HIDDEN' : 'VISIBLE'}`);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return isVisible;
};

export default usePageVisibility;
