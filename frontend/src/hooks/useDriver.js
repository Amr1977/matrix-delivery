import { useState, useEffect, useCallback } from 'react';
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

  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

  // Driver location functions
  const updateDriverLocation = useCallback(async () => {
    if (currentUser?.role !== 'driver') return false;

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            const response = await fetch(`${API_URL}/drivers/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ latitude, longitude })
            });

            if (!response.ok) throw new Error('Failed to update location');

            setDriverLocation({
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              lastUpdated: new Date()
            });
            setLocationPermission('granted');
            // Refresh orders after location update
            return true;
          },
          (error) => {
            console.error('Geolocation error:', error);
            setLocationPermission('denied');
            return false;
          }
        );
      } else {
        return false;
      }
    } catch (err) {
      console.error('Update location error:', err);
      return false;
    }
  }, [currentUser, token, API_URL]);

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

  // Driver location effect
  useEffect(() => {
    if (currentUser?.role === 'driver' && token) {
      getDriverLocation();
      // Update location every 5 minutes for drivers
      const locationInterval = setInterval(() => {
        updateDriverLocation();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(locationInterval);
    }
  }, [currentUser, token, getDriverLocation, updateDriverLocation]);

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
