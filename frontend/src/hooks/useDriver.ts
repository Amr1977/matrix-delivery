import { useState, useEffect, useCallback, useRef } from 'react';
import { DriversApi, Order, User } from '../services/api';
import { extractCityFromAddress, getAvailableCities, filterDriverOrders, getStatusLabel, extractLocationParts } from '../utils/formatters';

interface DriverLocation {
    latitude: number | null;
    longitude: number | null;
    lastUpdated: Date | null;
}

interface Address {
    country?: string;
    city?: string;
    area?: string;
}

const useDriver = (token: string | null, currentUser: User | null) => {
    const [viewType, setViewType] = useState<'active' | 'bidding' | 'history'>('active');
    const [driverLocation, setDriverLocation] = useState<DriverLocation>({ latitude: null, longitude: null, lastUpdated: null });
    const [cityFilter, setCityFilter] = useState('');
    const [countryFilter, setCountryFilter] = useState('');
    const [areaFilter, setAreaFilter] = useState('');
    const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied' | 'unavailable' | 'timeout'>('unknown');
    const [orders, setOrders] = useState<Order[]>([]);
    const [currentLocationAddress, setCurrentLocationAddress] = useState<Address | null>(null);
    const [driverOnline, setDriverOnline] = useState(false);

    // Debouncing refs
    const lastLocationUpdate = useRef(0);
    const LOCATION_UPDATE_DEBOUNCE_MS = 5000; // 5 seconds minimum between updates

    const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

    // Helper to get position as a promise
    const getPosition = (options?: PositionOptions): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    };

    // Driver location functions
    const updateDriverLocation = useCallback(async (): Promise<boolean> => {
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

                        await DriversApi.updateLocation({
                            latitude: fakeLoc.lat,
                            longitude: fakeLoc.lng
                        });

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
                    const hasSignificantChange = !currentLocation?.latitude || !currentLocation?.longitude ||
                        Math.abs(currentLocation.latitude - latitude) > 0.0001 ||
                        Math.abs(currentLocation.longitude - longitude) > 0.0001;

                    if (!hasSignificantChange) {
                        console.log('📍 Location unchanged, skipping update');
                        return false;
                    }

                    lastLocationUpdate.current = Date.now();

                    await DriversApi.updateLocation({ latitude, longitude });

                    setDriverLocation({
                        latitude: parseFloat(latitude.toString()),
                        longitude: parseFloat(longitude.toString()),
                        lastUpdated: new Date()
                    });
                    setLocationPermission('granted');
                    console.log('📍 Driver location updated:', { latitude, longitude });
                    return true;

                } catch (error: any) {
                    // Handle geolocation errors
                    if (error.code) {
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
    }, [currentUser, driverLocation]);

    const getDriverLocation = useCallback(async () => {
        // Only call if user is authenticated driver
        if (!token || currentUser?.role !== 'driver') {
            return null;
        }

        try {
            const response = await DriversApi.getLocation();
            const location = response.location;

            if (location.latitude && location.longitude) {
                setDriverLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    lastUpdated: location.timestamp ? new Date(location.timestamp) : null
                });
            }
            return location;
        } catch (err: any) {
            // Don't log errors for authentication issues
            if (err.statusCode !== 401) {
                console.warn('Get location error:', err.error || err.message);
            }
            return null;
        }
    }, [token, currentUser]);

    // Filter orders based on driver view type and city filter
    const getFilteredDriverOrders = useCallback((): Order[] => {
        if (currentUser?.role !== 'driver') return orders;

        let filteredOrders: Order[];

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
    const getDriverViewTitle = useCallback((): string => {
        switch (viewType) {
            case 'active': return 'Active Orders';
            case 'bidding': return 'Available Bids';
            case 'history': return 'My History';
            default: return 'Available Bids';
        }
    }, [viewType]);

    // Get available location options from bidding orders
    const getCountriesFromOrders = useCallback((): string[] => {
        const countries = new Set<string>();
        orders.forEach(order => {
            if (order.status === 'pending_bids') {
                const pickupParts = extractLocationParts(order.pickupAddress);
                const deliveryParts = extractLocationParts(order.dropoffAddress);
                if (pickupParts.country) countries.add(pickupParts.country);
                if (deliveryParts.country) countries.add(deliveryParts.country);
            }
        });
        return Array.from(countries).sort();
    }, [orders]);

    const getCitiesFromOrders = useCallback((country: string = ''): string[] => {
        const cities = new Set<string>();
        orders.forEach(order => {
            if (order.status === 'pending_bids') {
                const pickupParts = extractLocationParts(order.pickupAddress);
                const deliveryParts = extractLocationParts(order.dropoffAddress);

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

    const getAreasFromOrders = useCallback((country: string = '', city: string = ''): string[] => {
        const areas = new Set<string>();
        orders.forEach(order => {
            if (order.status === 'pending_bids') {
                const pickupParts = extractLocationParts(order.pickupAddress);
                const deliveryParts = extractLocationParts(order.dropoffAddress);

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
    const updateDriverStatus = useCallback(async (isOnline: boolean): Promise<boolean> => {
        try {
            await DriversApi.updateStatus({ isOnline });
            setDriverOnline(isOnline);
            return true;
        } catch (error) {
            console.error('Driver status update error:', error);
            return false;
        }
    }, []);

    // Helper functions for online/offline status
    const hasActiveOrders = (): boolean => {
        if (!isDriver) return false;
        return orders.some(order =>
            order.assignedDriver?.userId === currentUser?.id &&
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
