import React, { useState, useEffect } from 'react';

const GeolocationStatus = () => {
  const [status, setStatus] = useState('checking'); // 'checking', 'granted', 'denied', 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Geolocation not supported');
      return;
    }

    // Check permission status
    navigator.permissions.query({ name: 'geolocation' })
      .then(permissionStatus => {
        updateStatus(permissionStatus.state);
        
        // Listen for changes
        permissionStatus.onchange = () => {
          updateStatus(permissionStatus.state);
        };
      })
      .catch(err => {
        console.error('Permission check error:', err);
        setStatus('error');
        setError('Failed to check permission status');
      });

    // Also try to get current position to trigger permission prompt if needed
    navigator.geolocation.getCurrentPosition(
      () => setStatus('granted'),
      (err) => {
        console.warn('Geolocation error:', err);
        setStatus('denied');
        setError('Location access is required for full functionality');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, []);

  const updateStatus = (permissionState) => {
    switch (permissionState) {
      case 'granted':
        setStatus('granted');
        setError('');
        break;
      case 'denied':
        setStatus('denied');
        setError('Location access denied');
        break;
      case 'prompt':
        setStatus('prompt');
        setError('Location access not yet granted');
        break;
      default:
        setStatus('error');
        setError('Unknown permission state');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'granted':
        return (
          <span className="geolocation-status-icon granted" title="Location access granted">
            📍
          </span>
        );
      case 'denied':
        return (
          <span className="geolocation-status-icon denied" title="Location access denied">
            ❌
          </span>
        );
      case 'prompt':
        return (
          <span className="geolocation-status-icon prompt" title="Location access not yet granted">
            ❓
          </span>
        );
      case 'error':
      default:
        return (
          <span className="geolocation-status-icon error" title="Location error">
            ⚠️
          </span>
        );
    }
  };

  return (
    <div className="geolocation-status">
      {getStatusIcon()}
      {error && <span className="geolocation-status-error">{error}</span>}
    </div>
  );
};

export default GeolocationStatus;
