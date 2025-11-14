import { useState, useEffect, useCallback } from 'react';
import { extractCityFromAddress, getAvailableCities, filterDriverOrders, getStatusLabel } from '../utils/formatters';

const useDriver = (token, currentUser) => {
  const [viewType, setViewType] = useState('active');
  const [driverLocation, setDriverLocation] = useState({ latitude: null, longitude: null, lastUpdated: null });
  const [cityFilter, setCityFilter] = useState('');
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [orders, setOrders] = useState([]);

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
        // Apply city filter for bidding orders
        if (cityFilter) {
          filteredOrders = filteredOrders.filter(order => {
            const pickupCity = extractCityFromAddress(order.pickupAddress);
            const deliveryCity = extractCityFromAddress(order.deliveryAddress);
            return pickupCity === cityFilter || deliveryCity === cityFilter;
          });
        }
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
  }, [orders, viewType, cityFilter, currentUser]);

  // Get title for driver view
  const getDriverViewTitle = useCallback(() => {
    switch (viewType) {
      case 'active': return 'Active Orders';
      case 'bidding': return 'Available Bids';
      case 'history': return 'My History';
      default: return 'Available Bids';
    }
  }, [viewType]);

  // Get available cities from bidding orders
  const getCitiesFromOrders = useCallback(() => {
    return getAvailableCities(orders).sort();
  }, [orders]);

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

  const isDriver = currentUser?.role === 'driver';

  return {
    viewType,
    setViewType,
    driverLocation,
    cityFilter,
    setCityFilter,
    locationPermission,
    updateDriverLocation,
    getDriverLocation,
    getFilteredDriverOrders,
    getDriverViewTitle,
    getCitiesFromOrders,
    isDriver
  };
};

export default useDriver;
