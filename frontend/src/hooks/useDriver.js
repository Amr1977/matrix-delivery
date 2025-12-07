import { useState, useEffect, useCallback, useRef } from 'react';
import { extractCityFromAddress, getAvailableCities, filterDriverOrders, getStatusLabel, extractLocationParts } from '../utils/formatters';

const useDriver = (token, currentUser) => {
  const [viewType, setViewType] = useState('active');
  const [driverLocation, setDriverLocation] = useState({ latitude: null, longitude: null, lastUpdated: null });
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [orders, setOrders] = useState([]);
  const [currentLocationAddress, setCurrentLocationAddress] = useState(null);
  const [driverOnline, setDriverOnline] = useState(false); // Driver online/offline status

  // Debouncing refs
  const lastLocationUpdate = useRef(0);
  const LOCATION_UPDATE_DEBOUNCE_MS = 5000; // 5 seconds minimum between updates

  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

  // Helper to get position as a promise
  const getPosition = (options) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  // Driver location functions
  const updateDriverLocation = useCallback(async () => {
    if (currentUser?.role !== 'driver') return false;

    // Debounce location updates to prevent excessive API calls and re-renders
    const now = Date.now();
    if (now - lastLocationUpdate.current < LOCATION_UPDATE_DEBOUNCE_MS) {
      console.log('⏳ Skipping location update - too soon since last update');
      return false;
    }

    try {
      // Check for fake location first (for testing/development)
      const fakeLocationStr = localStorage.getItem('fakeDriverLocation');
      if (fakeLocationStr) {
        try {
          const fakeLoc = JSON.parse(fakeLocationStr);
          if (fakeLoc.lat && fakeLoc.lng) {
            console.log('🔧 Using fake location for update:', fakeLoc);

            const response = await fetch(`${API_URL}/drivers/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({ latitude: fakeLoc.lat, longitude: fakeLoc.lng })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error || `HTTP ${response.status}`;
              console.error('❌ Failed to update fake location:', errorMessage, errorData);
              // Don't throw, just return false to avoid crashing app
              return false;
            }

            setDriverLocation({
              latitude: parseFloat(fakeLoc.lat),
              longitude: parseFloat(fakeLoc.lng),
              lastUpdated: new Date()
            });
            return true;
          }
        } catch (e) {
          console.warn('Invalid fake location data:', e);
        }
      }

      if (navigator.geolocation) {
        try {
          const position = await getPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // Accept cached location up to 5 minutes old
          });

          const { latitude, longitude } = position.coords;

          // Check if location has actually changed significantly
          const currentLocation = driverLocation;
          const hasSignificantChange = !currentLocation?.latitude ||
            Math.abs(currentLocation.latitude - latitude) > 0.0001 ||
            Math.abs(currentLocation.longitude - longitude) > 0.0001;

          if (!hasSignificantChange) {
            console.log('📍 Location unchanged, skipping update');
            return false;
          }

          lastLocationUpdate.current = Date.now();

          const response = await fetch(`${API_URL}/drivers/location`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ latitude, longitude })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `HTTP ${response.status}`;
            console.error('❌ Failed to update location:', {
              status: response.status,
              statusText: response.statusText,
              errorMessage,
              errorData,
              url: `${API_URL}/drivers/location`
            });
            // Don't throw, just return false
            return false;
          }

          setDriverLocation({
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            lastUpdated: new Date()
          });
          setLocationPermission('granted');
          console.log('📍 Driver location updated:', { latitude, longitude });
          return true;

        } catch (error) {
          // Handle geolocation errors or fetch errors here
          if (error.code) {
            // Geolocation error
            console.error('Geolocation error:', error);
            if (error.code === error.PERMISSION_DENIED) {
              console.warn('Location permission denied.');
              setLocationPermission('denied');
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              console.warn('Location information unavailable.');
              setLocationPermission('unavailable');
            } else if (error.code === error.TIMEOUT) {
              console.warn('Location request timed out.');
              setLocationPermission('timeout');
            } else {
              setLocationPermission('denied');
            }
          } else {
            // Fetch or other error
            console.error('Update location error:', error);
          }
          return false;
        }
      } else {
        return false;
      }
    } catch (err) {
      console.error('Update location error (unexpected):', err);
      return false;
    }
  }, [currentUser, token, API_URL, driverLocation]);

  const getDriverLocation = useCallback(async () => {
    // Only call if user is authenticated driver
    if (!token || currentUser?.role !== 'driver') {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/drivers/location`, {
        credentials: 'include'
      });

      // Handle 401 gracefully - user might not be authenticated yet
      if (response.status === 401) {
        return null;
      }

      if (!response.ok) {
        console.warn('Failed to get driver location:', response.status);
        return null;
      }

      const data = await response.json();
      setDriverLocation(data.location || { latitude: null, longitude: null, lastUpdated: null });
      return data.location;
    } catch (err) {
      // Don't log errors for authentication issues
      if (err.message !== 'Failed to get location') {
        console.warn('Get location error:', err.message);
      }
      return null;
    }
  }, [token, currentUser, API_URL]);

  // Filter orders based on driver view type and city filter
  const getFilteredDriverOrders = useCallback(() => {
    if (currentUser?.role !== 'driver') return orders;

    let filteredOrders;

    switch (viewType) {
      case 'active':
        filteredOrders = orders.filter(order =>
          order.assignedDriver?.userId === currentUser.id &&
          ['accepted', 'picked_up', 'in_transit'].includes(order.status)
        );
        break;
      case 'bidding':
        filteredOrders = orders.filter(order =>
          order.status === 'pending_bids' &&
          !order.assignedDriver
        );
        // Apply location filters for bidding orders (now only pickup location)
        filteredOrders = filteredOrders.filter(order => {
          const pickupParts = extractLocationParts(order.pickupAddress);

          return (!countryFilter || pickupParts.country === countryFilter) &&
            (!cityFilter || pickupParts.city === cityFilter) &&
            (!areaFilter || pickupParts.area === areaFilter);
        });
        break;
      case 'history':
        filteredOrders = orders.filter(order =>
          order.status === 'delivered' ||
          (order.assignedDriver?.userId === currentUser.id && order.status === 'cancelled')
        );
        break;
      default:
        filteredOrders = orders;
    }

    return filteredOrders;
  }, [orders, viewType, cityFilter, countryFilter, areaFilter, currentUser]);

  // Get title for driver view
  const getDriverViewTitle = useCallback(() => {
    switch (viewType) {
      case 'active': return 'Active Orders';
      case 'bidding': return 'Available Bids';
      case 'history': return 'My History';
      default: return 'Available Bids';
    }
  }, [viewType]);

  // Get available location options from bidding orders
  const getCountriesFromOrders = useCallback(() => {
    const countries = new Set();
    orders.forEach(order => {
      if (order.status === 'pending_bids') {
        const pickupParts = extractLocationParts(order.pickupAddress);
        const deliveryParts = extractLocationParts(order.deliveryAddress);
        if (pickupParts.country) countries.add(pickupParts.country);
        if (deliveryParts.country) countries.add(deliveryParts.country);
      }
    });
    return Array.from(countries).sort();
  }, [orders]);

  const getCitiesFromOrders = useCallback((country = '') => {
    const cities = new Set();
    orders.forEach(order => {
      if (order.status === 'pending_bids') {
        const pickupParts = extractLocationParts(order.pickupAddress);
        const deliveryParts = extractLocationParts(order.deliveryAddress);

        if (!country || pickupParts.country === country) {
          if (pickupParts.city) cities.add(pickupParts.city);
        }
        if (!country || deliveryParts.country === country) {
          if (deliveryParts.city) cities.add(deliveryParts.city);
        }
      }
    });
    return Array.from(cities).sort();
  }, [orders]);

  const getAreasFromOrders = useCallback((country = '', city = '') => {
    const areas = new Set();
    orders.forEach(order => {
      if (order.status === 'pending_bids') {
        const pickupParts = extractLocationParts(order.pickupAddress);
        const deliveryParts = extractLocationParts(order.deliveryAddress);

        if ((!country || pickupParts.country === country) &&
          (!city || pickupParts.city === city)) {
          if (pickupParts.area) areas.add(pickupParts.area);
        }
        if ((!country || deliveryParts.country === country) &&
          (!city || deliveryParts.city === city)) {
          if (deliveryParts.area) areas.add(deliveryParts.area);
        }
      }
    });
    return Array.from(areas).sort();
  }, [orders]);

  // Reverse geocode current location to prefill filters
  const reverseGeocodeCurrentLocation = useCallback(async () => {
    if (!driverLocation?.latitude || !driverLocation?.longitude) return;

    try {
      const response = await fetch(`${API_URL}/locations/reverse-geocode?lat=${driverLocation.latitude}&lng=${driverLocation.longitude}`);
      if (!response.ok) throw new Error('Failed to reverse geocode');

      const data = await response.json();
      setCurrentLocationAddress(data.address);

      // Prefill filters if not already selected
      if (!countryFilter && data.address?.country) {
        setCountryFilter(data.address.country);
      }
      if (!cityFilter && data.address?.city) {
        setCityFilter(data.address.city);
      }
      if (!areaFilter && data.address?.area) {
        setAreaFilter(data.address.area);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }, [driverLocation, countryFilter, cityFilter, areaFilter, API_URL]);

  // Driver location effect - only get initial location, no automatic updates
  // Location updates are now handled by App.js based on online status
  useEffect(() => {
    if (currentUser?.role === 'driver' && token) {
      getDriverLocation();
    }
  }, [currentUser, token, getDriverLocation]);

  // Effect to reverse geocode current location when it's updated
  useEffect(() => {
    if (currentUser?.role === 'driver' && driverLocation?.latitude && driverLocation?.longitude) {
      reverseGeocodeCurrentLocation();
    }
  }, [currentUser, driverLocation, reverseGeocodeCurrentLocation]);

  // Driver online/offline functionality
  const updateDriverStatus = useCallback(async (isOnline) => {
    try {
      const response = await fetch(`${API_URL}/drivers/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isOnline })
      });

      if (!response.ok) throw new Error('Failed to update driver status');

      setDriverOnline(isOnline);
      return true;
    } catch (error) {
      console.error('Driver status update error:', error);
      return false;
    }
  }, [token, API_URL]);

  // Helper functions for online/offline status
  const hasActiveOrders = () => {
    if (!isDriver) return false;
    return orders.some(order =>
      order.assignedDriver?.userId === currentUser.id &&
      ['accepted', 'picked_up', 'in_transit'].includes(order.status)
    );
  };

  const isDriver = currentUser?.role === 'driver';

  return {
    viewType,
    setViewType,
    driverLocation,
    countryFilter,
    setCountryFilter,
    cityFilter,
    setCityFilter,
    areaFilter,
    setAreaFilter,
    locationPermission,
    currentLocationAddress,
    updateDriverLocation,
    getDriverLocation,
    getFilteredDriverOrders,
    getDriverViewTitle,
    getCountriesFromOrders,
    getCitiesFromOrders,
    getAreasFromOrders,
    reverseGeocodeCurrentLocation,
    driverOnline,
    updateDriverStatus,
    hasActiveOrders,
    isDriver
  };
};

export default useDriver;
