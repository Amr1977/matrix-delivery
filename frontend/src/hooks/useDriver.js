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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ latitude: fakeLoc.lat, longitude: fakeLoc.lng })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error || `HTTP ${response.status}`;
              console.error('❌ Failed to update fake location:', errorMessage, errorData);
              throw new Error(`Failed to update location: ${errorMessage}`);
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
        navigator.geolocation.getCurrentPosition(
          async (position) => {
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ latitude, longitude })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error || `HTTP ${response.status}`;
              console.error('❌ Failed to update location:', errorMessage, errorData);
              throw new Error(`Failed to update location: ${errorMessage}`);
            }

            setDriverLocation({
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              lastUpdated: new Date()
            });
            setLocationPermission('granted');
            console.log('📍 Driver location updated:', { latitude, longitude });
            // Refresh orders after location update
            return true;
          },
          (error) => {
            console.error('Geolocation error:', error);
            console.error('Error code:', error.code, 'Message:', error.message);

            // Set permission status based on error type
            if (error.code === error.PERMISSION_DENIED) {
              console.warn('Location permission denied. This is expected on mobile over HTTP.');
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
            return false;
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // Accept cached location up to 5 minutes old
          }
        );
      } else {
        return false;
      }
    } catch (err) {
      console.error('Update location error:', err);
      return false;
    }
  }, [currentUser, token, API_URL, driverLocation]);

  const getDriverLocation = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/drivers/location`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to get location');
      const data = await response.json();
      setDriverLocation(data.location || { latitude: null, longitude: null, lastUpdated: null });
      return data.location;
    } catch (err) {
      console.error('Get location error:', err);
      return null;
    }
  }, [token, API_URL]);

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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
