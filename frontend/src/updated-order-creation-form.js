// ============ UPDATED OrderCreationForm.jsx WITH MAP INTEGRATION ============
// Replace the existing OrderCreationForm component with this

import React, { useState, useEffect, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import logger from './logger';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ============ AUTOCOMPLETE INPUT COMPONENT ============
const AutocompleteInput = ({
  value,
  onChange,
  placeholder,
  options = [],
  disabled = false,
  loading = false,
  required = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = React.useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    if (value && options.length > 0) {
      // Find matching option and extract its label
      const matchingOption = options.find(option => option.value === value);
      if (matchingOption) {
        setInputValue(matchingOption.label);
      }
    }
  }, [value, options]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Always filter options when typing
    const filtered = options.filter(option =>
      option.label.toLowerCase().includes(newValue.toLowerCase()) ||
      option.value.toLowerCase().includes(newValue.toLowerCase())
    );
    setFilteredOptions(filtered);
    setShowSuggestions(filtered.length > 0 || (newValue.trim() && options.length > 0));

    // Clear the selection if input doesn't match any option
    const matchingOption = options.find(option =>
      option.label.toLowerCase() === newValue.toLowerCase() ||
      option.value.toLowerCase() === newValue.toLowerCase()
    );
    onChange(matchingOption ? matchingOption.value : '');
  };

  const handleOptionSelect = (option) => {
    setInputValue(option.label);
    onChange(option.value);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleFocus = () => {
    // Show dropdown when focused, regardless of current value
    if (options.length > 0) {
      setFilteredOptions(options);
      setShowSuggestions(true);
    }
  };

  const displayValue = inputValue || value || '';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={loading ? 'Loading...' : placeholder}
        disabled={disabled}
        required={required}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: '1px solid #D1D5DB',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          background: disabled ? '#F3F4F6' : 'white',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredOptions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          background: 'white',
          border: '1px solid #D1D5DB',
          borderTop: 'none',
          borderRadius: '0 0 0.375rem 0.375rem',
          zIndex: 1000,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          {filteredOptions.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              onClick={() => handleOptionSelect(option)}
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                borderBottom: index < filteredOptions.length - 1 ? '1px solid #E5E7EB' : 'none',
                background: 'white',
                fontSize: '0.875rem'
              }}
              onMouseOver={(e) => e.target.style.background = '#F3F4F6'}
              onMouseOut={(e) => e.target.style.background = 'white'}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      {/* Dropdown arrow indicator */}
      {options.length > 0 && (
        <div style={{
          position: 'absolute',
          right: loading ? '30px' : '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#6B7280',
          fontSize: '0.75rem',
          pointerEvents: 'none'
        }}>
          ▼
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '0.75rem',
          color: '#6B7280'
        }}>
          ...
        </div>
      )}
    </div>
  );
};

// ============ COMBOBOX INPUT COMPONENT (Dropdown + Free Text Entry) ============
const ComboboxInput = ({
  value,
  onChange,
  placeholder,
  options = [],
  disabled = false,
  loading = false,
  required = false,
  error = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [inputValue, setInputValue] = useState(value || '');
  const [selectedValue, setSelectedValue] = useState(value || '');
  const inputRef = React.useRef(null);

  useEffect(() => {
    setInputValue(value || '');
    setSelectedValue(value || '');
  }, [value]);

  // Update input value when options change and we have a matching option
  useEffect(() => {
    if (selectedValue && options.length > 0) {
      const matchingOption = options.find(option => option.value === selectedValue);
      if (matchingOption && matchingOption.label !== inputValue) {
        setInputValue(matchingOption.label);
      }
    }
  }, [options, selectedValue, inputValue]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Filter options based on what user is typing
    const filtered = options.filter(option =>
      option.label.toLowerCase().includes(newValue.toLowerCase()) ||
      option.value.toLowerCase().includes(newValue.toLowerCase())
    );
    setFilteredOptions(filtered);

    // Show suggestions if there are matches or if user is typing
    setShowSuggestions(filtered.length > 0 || (newValue.trim() && options.length > 0));

    // Update the selected value - use the typed value directly if it's not empty
    if (newValue.trim()) {
      setSelectedValue(newValue);
      onChange(newValue);
    } else {
      setSelectedValue('');
      onChange('');
    }
  };

  const handleOptionSelect = (option) => {
    setInputValue(option.label);
    setSelectedValue(option.value);
    onChange(option.value);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setShowSuggestions(false);
      // On blur, if input doesn't match any option, treat it as custom text
      if (inputValue.trim() && !options.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase() || opt.value === inputValue)) {
        onChange(inputValue);
      }
    }, 150);
  };

  const handleFocus = () => {
    // Show dropdown when focused, regardless of current value
    if (options.length > 0) {
      const filtered = inputValue ? options.filter(option =>
        option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        option.value.toLowerCase().includes(inputValue.toLowerCase())
      ) : options;
      setFilteredOptions(filtered);
      setShowSuggestions(true);
    }
  };

  const handleKeyDown = (e) => {
    // Allow selection with Enter or Tab
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (showSuggestions && filteredOptions.length > 0) {
        // Select first matching option or closest match
        const exactMatch = filteredOptions.find(opt =>
          opt.label.toLowerCase() === inputValue.toLowerCase() ||
          opt.value.toLowerCase() === inputValue.toLowerCase()
        );
        if (exactMatch) {
          handleOptionSelect(exactMatch);
          e.preventDefault();
        }
      }
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      background: 'rgba(0, 17, 0, 0.8)',
      border: error ? '2px solid #EF4444' : '2px solid #00AA00',
      borderRadius: '0.375rem'
    }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={loading ? 'Loading...' : placeholder}
        disabled={disabled}
        required={required}
        style={{
          width: '100%',
          padding: '0.5rem',
          paddingRight: options.length > 0 && !loading ? '2.5rem' : loading ? '2.5rem' : '0.5rem',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontFamily: 'Consolas, Monaco, Courier New, monospace',
          color: '#30FF30',
          background: 'transparent',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredOptions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          background: 'rgba(0, 17, 0, 0.95)',
          border: '2px solid #00AA00',
          borderTop: 'none',
          borderRadius: '0 0 0.375rem 0.375rem',
          zIndex: 1000,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
        }}>
          {filteredOptions.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              onClick={() => handleOptionSelect(option)}
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                borderBottom: index < filteredOptions.length - 1 ? '1px solid rgba(0, 255, 0, 0.2)' : 'none',
                background: 'rgba(0, 17, 0, 0.9)',
                color: '#30FF30',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(0, 255, 0, 0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(0, 17, 0, 0.9)';
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      {/* Dropdown arrow indicator */}
      {options.length > 0 && (
        <div style={{
          position: 'absolute',
          right: loading ? '30px' : '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#00AA00',
          fontSize: '0.75rem',
          pointerEvents: 'none'
        }}>
          ▼
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '0.75rem',
          color: '#00AA00'
        }}>
          ...
        </div>
      )}
    </div>
  );
};


// ============ MODAL COMPONENT FOR SUCCESS/ERROR MESSAGES ============
const MessageModal = ({ isOpen, onClose, title, message, type }) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #000000 0%, #001100 100%)',
        border: `2px solid ${isSuccess ? '#00AA00' : '#DC2626'}`,
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: `0 10px 30px rgba(${isSuccess ? '0, 170, 0' : '220, 38, 38'}, 0.5)`
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem'
        }}>
          {isSuccess ? '🎉' : '⚠️'}
        </div>

        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#30FF30',
          marginBottom: '1rem',
          textShadow: '0 0 10px #30FF30'
        }}>
          {title}
        </h2>

        <p style={{
          color: '#E5E7EB',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #00AA00 0%, #30FF30 50%, #00AA00 100%)',
            color: '#30FF30',
            border: '2px solid #00AA00',
            borderRadius: '0.375rem',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: 'Consolas, Monaco, Courier New, monospace'
          }}
          onMouseOver={(e) => {
            e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.boxShadow = 'none';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          {isSuccess ? '🎯 Got it!' : '❌ Try Again'}
        </button>
      </div>
    </div>
  );
};

const OrderCreationForm = ({ onSubmit, countries, t }) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  // Form state
  const [orderData, setOrderData] = useState({
    title: '',
    description: '',
    price: '',
    package_description: '',
    package_weight: '',
    estimated_value: '',
    special_instructions: '',
    estimated_delivery_date: ''
  });
  
  // Location state
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Address fields state for manual entry
  const [pickupAddress, setPickupAddress] = useState({
    country: '',
    city: '',
    area: '',
    street: '',
    building: '',
    floor: '',
    apartment: '',
    personName: ''
  });
  const [dropoffAddress, setDropoffAddress] = useState({
    country: '',
    city: '',
    area: '',
    street: '',
    building: '',
    floor: '',
    apartment: '',
    personName: ''
  });
  
  // UI state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: '', // 'success' or 'error'
    title: '',
    message: ''
  });
  const [pickupErrors, setPickupErrors] = useState({});
  const [dropoffErrors, setDropoffErrors] = useState({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setUserLocation({ lat: 30.0444, lng: 31.2357 }); // Default to Cairo
        }
      );
    } else {
      setUserLocation({ lat: 30.0444, lng: 31.2357 });
    }
  }, []);
  
  // Calculate route when both locations are set
  const calculateRoute = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/locations/calculate-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: pickupLocation.coordinates,
          delivery: dropoffLocation.coordinates
        })
      });
      
      if (!response.ok) throw new Error('Failed to calculate route');
      const data = await response.json();
      setRouteInfo(data);
    } catch (err) {
      setModalState({ isOpen: true, type: 'error', title: 'Route Error', message: err.message || 'Failed to calculate route' });
    } finally {
      setLoading(false);
    }
  }, [API_URL, pickupLocation?.coordinates, dropoffLocation?.coordinates]);

  useEffect(() => {
    if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
      calculateRoute();
    }
  }, [pickupLocation?.coordinates, dropoffLocation?.coordinates, calculateRoute]);
  
  
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    

    logger.user('Order creation form submitted', {
      hasTitle: !!orderData.title?.trim(),
      hasDescription: !!orderData.description?.trim(),
      price: parseFloat(orderData.price) || 0,
      hasPackageDescription: !!orderData.package_description?.trim(),
      packageWeight: orderData.package_weight,
      estimatedValue: orderData.estimated_value,
      hasSpecialInstructions: !!orderData.special_instructions?.trim(),
      estimatedDeliveryDate: orderData.estimated_delivery_date,
      timestamp: new Date().toISOString()
    });

    logger.info('[LOCATION_STATE] Current location state:', {
      pickupLocation: pickupLocation ? {
        coordinates: pickupLocation.coordinates,
        displayName: pickupLocation.displayName,
        hasAddress: !!pickupLocation.address,
        addressKeys: pickupLocation.address ? Object.keys(pickupLocation.address) : []
      } : null,
      dropoffLocation: dropoffLocation ? {
        coordinates: dropoffLocation.coordinates,
        displayName: dropoffLocation.displayName,
        hasAddress: !!dropoffLocation.address,
        addressKeys: dropoffLocation.address ? Object.keys(dropoffLocation.address) : []
      } : null,
      routeInfo: routeInfo ? {
        distance_km: routeInfo.distance_km,
        estimatesCount: routeInfo.estimates ? Object.keys(routeInfo.estimates).length : 0,
        hasPolyline: !!routeInfo.polyline,
        routeFound: !!routeInfo.polyline
      } : null
    });

    logger.info('[ADDRESS_DATA] Address data validation state:', {
      pickupAddress: {
        country: pickupAddress.country,
        city: pickupAddress.city,
        area: pickupAddress.area,
        street: pickupAddress.street,
        building: pickupAddress.building,
        personName: pickupAddress.personName,
        hasRequiredFields: !!(pickupAddress.country?.trim() && pickupAddress.city?.trim() && pickupAddress.personName?.trim())
      },
      dropoffAddress: {
        country: dropoffAddress.country,
        city: dropoffAddress.city,
        area: dropoffAddress.area,
        street: dropoffAddress.street,
        building: dropoffAddress.building,
        personName: dropoffAddress.personName,
        hasRequiredFields: !!(dropoffAddress.country?.trim() && dropoffAddress.city?.trim() && dropoffAddress.personName?.trim())
      }
    });

    // Validate address fields for pickup and dropoff
    const requiredFields = ['country','city','area','street','building','personName','personPhone'];
    const computeErrors = (addr) => {
      const errs = {};
      requiredFields.forEach(f => {
        if (!addr?.[f] || String(addr[f]).trim() === '') {
          errs[f] = true;
        }
      });
      return errs;
    };

    const pErrs = computeErrors(pickupAddress);
    const dErrs = computeErrors(dropoffAddress);
    setPickupErrors(pErrs);
    setDropoffErrors(dErrs);

    if (Object.keys(pErrs).length > 0 || Object.keys(dErrs).length > 0) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Missing Address Fields',
        message: 'Please fill all required address fields (Country, City, Area, Street, Building, Contact Name, Phone).'
      });
      return;
    }

    // Validate that coordinates are set (either from map click OR address geocoding)
    const pickupCoordinates = pickupLocation?.coordinates;
    const dropoffCoordinates = dropoffLocation?.coordinates;

    logger.info('[VALIDATION] Coordinate validation:', {
      hasPickupCoords: !!pickupCoordinates,
      hasDropoffCoords: !!dropoffCoordinates,
      pickupCoords: pickupCoordinates,
      dropoffCoords: dropoffCoordinates
    });

    if (!pickupCoordinates || !dropoffCoordinates) {
      const errorParts = [];
      if (!pickupCoordinates) {
        errorParts.push('Pickup location coordinates not set - click on map or fill address fields (country/city required)');
      }
      if (!dropoffCoordinates) {
        errorParts.push('Delivery location coordinates not set - click on map or fill address fields (country/city required)');
      }

      logger.warn('[VALIDATION_FAILED] Showing error modal for missing coordinates:', {
        hasPickupCoords: !!pickupCoordinates,
        hasDropoffCoords: !!dropoffCoordinates,
        errorMessage: errorParts.join('. '),
        timestamp: new Date().toISOString()
      });

      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Location Coordinates Required',
        message: errorParts.join('. ') + ' Use the interactive map or fill address fields (at least country and city) to set coordinates.'
      });
      return;
    }

    // Prepare complete order data - always include coordinates
    const completeOrderData = {
      ...orderData,
      pickupLocation,
      dropoffLocation,
      pickupAddress,
      dropoffAddress
    };

    logger.info('[COMPLETE_ORDER_DATA] Final order data structure analysis:', {
      orderDataKeys: Object.keys(orderData),
      hasPickupAddress: !!completeOrderData.pickupAddress,
      hasDropoffAddress: !!completeOrderData.dropoffAddress,
      hasPickupLocation: !!completeOrderData.pickupLocation,
      hasDropoffLocation: !!completeOrderData.dropoffLocation,
      hasRouteInfo: !!completeOrderData.routeInfo,
      maskedOrderDetails: {
        ...completeOrderData,
        pickupLocation: completeOrderData.pickupLocation ? {
          coordinates: completeOrderData.pickupLocation.coordinates,
          displayName: completeOrderData.pickupLocation.displayName,
          hasAddress: !!completeOrderData.pickupLocation.address,
          personNameMasked: completeOrderData.pickupLocation.address?.personName ?
            `[${completeOrderData.pickupLocation.address.personName.length} chars]` : false
        } : undefined,
        dropoffLocation: completeOrderData.dropoffLocation ? {
          coordinates: completeOrderData.dropoffLocation.coordinates,
          displayName: completeOrderData.dropoffLocation.displayName,
          hasAddress: !!completeOrderData.dropoffLocation.address,
          personNameMasked: completeOrderData.dropoffLocation.address?.personName ?
            `[${completeOrderData.dropoffLocation.address.personName.length} chars]` : false
        } : undefined,
        pickupAddress: completeOrderData.pickupAddress ? {
          ...completeOrderData.pickupAddress,
          personName: completeOrderData.pickupAddress.personName ?
            `[${completeOrderData.pickupAddress.personName.length} chars]` : undefined
        } : undefined,
        dropoffAddress: completeOrderData.dropoffAddress ? {
          ...completeOrderData.dropoffAddress,
          personName: completeOrderData.dropoffAddress.personName ?
            `[${completeOrderData.dropoffAddress.personName.length} chars]` : undefined
        } : undefined
      }
    });

    logger.user('Order submission about to be sent to API', {
      title: completeOrderData.title,
      price: parseFloat(completeOrderData.price),
      hasPackageDescription: !!completeOrderData.package_description,
      packageWeight: completeOrderData.package_weight,
      timestamp: new Date().toISOString()
    });

    try {
      // Show loading state
      setLoading(true);

      // Attempt to submit the order
      await onSubmit(completeOrderData);

      // Show success modal on successful submission
      setModalState({
        isOpen: true,
        type: 'success',
        title: '🚀 Order Published Successfully!',
        message: `Your order "${orderData.title}" has been published and is now available for heroes to accept. Track its progress from the Orders page.`
      });

      // Clear loading state
      setLoading(false);

    } catch (error) {
      // Show error modal on failure
      setLoading(false);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Failed to Publish Order',
        message: `❌ ${error.message || 'An unexpected error occurred while publishing your order. Please try again.'}`
      });
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: '',
      title: '',
      message: ''
    });
  };
  
  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, #000000 0%, #001100 100%)',
      border: '2px solid #00AA00',
      borderRadius: '0.75rem',
      padding: isMobile ? '1rem' : '2rem',
      maxHeight: '85vh',
      overflowY: 'auto'
    }}>
      <h2 style={{
        fontSize: isMobile ? '1.25rem' : '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1.5rem',
        color: '#30FF30',
        textShadow: '0 0 10px #30FF30',
        fontFamily: 'Consolas, Monaco, Courier New, monospace'
      }}>
        📦 {t('orders.createNewOrder')}
      </h2>
      
      <form onSubmit={handleSubmit}>
        {/* Basic Order Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#30FF30',
            textShadow: '0 0 10px #30FF30'
          }}>
            📋 {t('orders.orderDetails')}
          </h3>
          <div style={{
            background: 'rgba(0, 17, 0, 0.8)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '2px solid #00AA00'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📝 {t('orders.title')} *
                </label>
                <input
                  type="text"
                  value={orderData.title}
                  onChange={(e) => setOrderData({...orderData, title: e.target.value})}
                  placeholder="e.g., Deliver package to office"
                  required
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  💰 {t('orders.price')} (USD) *
                </label>
                <input
                  type="number"
                  value={orderData.price}
                  onChange={(e) => setOrderData({...orderData, price: e.target.value})}
                  placeholder="e.g., 50"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📄 {t('orders.description')}
                </label>
                <textarea
                  value={orderData.description}
                  onChange={(e) => setOrderData({...orderData, description: e.target.value})}
                  placeholder="Brief description of the delivery..."
                  rows="2"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Location Selection - Combined Map + Manual Entry */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1rem'
          }}>
            {/* Pickup Location - Map + Manual Combined */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#16A34A' }}>
                📤 {t('orders.pickupLocation')} *
              </h3>
              <LocationEntryCombined
                mapLocation={pickupLocation}
                onMapLocationChange={setPickupLocation}
                addressData={pickupAddress}
                onAddressChange={setPickupAddress}
                userLocation={userLocation}
                markerColor="green"
                API_URL={API_URL}
                locationType="pickup"
                compact={true}
                countries={countries}
                t={t}
                validationErrors={pickupErrors}
              />
            </div>

            {/* Dropoff Location - Map + Manual Combined */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#DC2626' }}>
                📥 {t('orders.deliveryLocation')} *
              </h3>
              <LocationEntryCombined
                mapLocation={dropoffLocation}
                onMapLocationChange={setDropoffLocation}
                addressData={dropoffAddress}
                onAddressChange={setDropoffAddress}
                userLocation={pickupLocation?.coordinates || userLocation}
                markerColor="red"
                API_URL={API_URL}
                locationType="delivery"
                compact={true}
                countries={countries}
                t={t}
                validationErrors={dropoffErrors}
              />
            </div>
          </div>
        </div>
        
        {/* Route Preview removed to keep only two maps in the form */}
        
        {/* Package Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#30FF30',
            textShadow: '0 0 10px #30FF30'
          }}>
            📦 {t('orders.packageDetails')}
          </h3>
          <div style={{
            background: 'rgba(0, 17, 0, 0.8)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '2px solid #00AA00'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '0.75rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📝 {t('orders.packageDescription')}
                </label>
                <input
                  type="text"
                  value={orderData.package_description}
                  onChange={(e) => setOrderData({...orderData, package_description: e.target.value})}
                  placeholder="e.g., Documents, Electronics"
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  ⚖️ {t('orders.weight')} (kg)
                </label>
                <input
                  type="number"
                  value={orderData.package_weight}
                  onChange={(e) => setOrderData({...orderData, package_weight: e.target.value})}
                  placeholder="e.g., 2.5"
                  min="0"
                  step="0.1"
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  💰 {t('orders.estimatedValue')} (USD)
                </label>
                <input
                  type="number"
                  value={orderData.estimated_value}
                  onChange={(e) => setOrderData({...orderData, estimated_value: e.target.value})}
                  placeholder="e.g., 100"
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📅 {t('orders.estimatedDeliveryDate')}
                </label>
                <input
                  type="datetime-local"
                  value={orderData.estimated_delivery_date}
                  onChange={(e) => setOrderData({...orderData, estimated_delivery_date: e.target.value})}
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📋 {t('orders.specialInstructions')}
                </label>
                <textarea
                  value={orderData.special_instructions}
                  onChange={(e) => setOrderData({...orderData, special_instructions: e.target.value})}
                  placeholder="Any special handling instructions..."
                  rows="2"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div style={{
          display: 'flex',
          gap: isMobile ? '0.75rem' : '1rem',
          justifyContent: 'flex-end',
          position: isMobile ? 'sticky' : 'relative',
          bottom: isMobile ? '0' : 'auto',
          background: isMobile ? '#000000' : 'transparent',
          padding: isMobile ? '1rem' : '0',
          margin: isMobile ? '0 -1rem -1rem -1rem' : '0',
          borderTop: isMobile ? '2px solid #00AA00' : 'none'
        }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: isMobile ? '0.625rem 1.25rem' : '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #001100 0%, #000000 100%)',
              color: '#30FF30',
              border: '2px solid #00AA00',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)'
            }}
            onMouseOver={(e) => {
              e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.4)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.2)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            ❎ {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !pickupLocation?.coordinates || !dropoffLocation?.coordinates}
            style={{
              padding: isMobile ? '0.625rem 1.25rem' : '0.75rem 1.5rem',
              background: (pickupLocation?.coordinates && dropoffLocation?.coordinates) ?
                  'linear-gradient(135deg, #00AA00 0%, #30FF30 50%, #00AA00 100%)' : '#333333',
              color: '#30FF30',
              border: '2px solid #00AA00',
              borderRadius: '0.375rem',
              cursor: (pickupLocation?.coordinates && dropoffLocation?.coordinates) ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              opacity: (pickupLocation?.coordinates && dropoffLocation?.coordinates) ? 1 : 0.5,
              boxShadow: (pickupLocation?.coordinates && dropoffLocation?.coordinates) ?
                  '0 0 20px rgba(0, 255, 0, 0.6)' : 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
                e.target.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.8)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseOut={(e) => {
              if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
                e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? '⏳ ' + t('orders.creating') : '🚀 ' + t('orders.publishOrder')}
          </button>
        </div>
      </form>

      {/* Success/Error Modal */}
      <MessageModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
};

// ============ MAP LOCATION PICKER COMPONENT ============
const MapLocationPicker = ({ location, onChange, onAddressFill, userLocation, markerColor, API_URL, locationType, compact = false, t }) => {
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const handleMapClick = async (coords) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${API_URL}/locations/reverse?lat=${coords.lat}&lng=${coords.lng}`
      );
      
      if (!response.ok) throw new Error('Failed to geocode location');
      const data = await response.json();
      const loc = {
        coordinates: { lat: data.lat, lng: data.lng },
        displayName: data.displayName,
        address: {
          country: data.address?.country || '',
          city: data.address?.city || '',
          area: data.address?.area || '',
          street: data.address?.street || '',
          building: data.address?.buildingNumber || '',
          floor: '',
          apartment: data.address?.apartmentNumber || ''
        }
      };
      onChange(loc);
      if (onAddressFill && data && data.address) {
        onAddressFill({
          country: data.address.country || '',
          city: data.address.city || '',
          area: data.address.area || '',
          street: data.address.street || '',
          building: data.address.buildingNumber || '',
          floor: data.address.floor || '',
          apartment: data.address.apartmentNumber || '',
          personName: data.address.personName || ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUrlPaste = async () => {
    if (!mapUrl.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/locations/parse-maps-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mapUrl })
      });
      
      if (!response.ok) throw new Error('Invalid Google Maps URL');
      const data = await response.json();
      onChange(data);
      setMapUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{
      background: '#F9FAFB',
      padding: compact ? '0.75rem' : '1rem',
      borderRadius: '0.5rem',
      border: '1px solid #E5E7EB'
    }}>
      {/* Google Maps URL Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: compact ? '0.625rem' : '0.75rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#6B7280'
        }}>
          📍 {t('orders.googleMapsLink')} ({t('common.optional')})
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder={t('orders.pasteGoogleMapsLink')}
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            style={{
              flex: 1,
              padding: compact ? '0.375rem 0.5rem' : '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              fontSize: compact ? '0.75rem' : '0.875rem'
            }}
          />
          <button
            type="button"
            onClick={handleUrlPaste}
            disabled={loading || !mapUrl.trim()}
            style={{
              padding: compact ? '0.375rem 1rem' : '0.5rem 1rem',
              background: '#4F46E5',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: loading || !mapUrl.trim() ? 'not-allowed' : 'pointer',
              fontSize: compact ? '0.75rem' : '0.875rem',
              fontWeight: '600',
              opacity: loading || !mapUrl.trim() ? 0.5 : 1
            }}
          >
            {loading ? '...' : t('common.parse')}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#FEE2E2',
          color: '#991B1B',
          padding: compact ? '0.5rem' : '0.75rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          fontSize: compact ? '0.75rem' : '0.875rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {compact && (
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#6B7280',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: '600',
            marginBottom: '1rem'
          }}
        >
          {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
        </button>
      )}

      {/* Map (click to fullscreen) */}
      {(!compact || showMap) && !isFullscreen && (
        <div onClick={() => setIsFullscreen(true)} style={{
          height: compact ? '300px' : '400px',
          width: '100%',
          marginBottom: '1rem',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          position: 'relative',
          minWidth: '100%',
          cursor: 'zoom-in'
        }}>
        {userLocation ? (
          <MapContainer
            center={location?.coordinates ? [location.coordinates.lat, location.coordinates.lng] : [userLocation.lat, userLocation.lng]}
            zoom={15}
            style={{
              height: '100%',
              width: '100%',
              zIndex: 1,
              position: 'relative'
            }}
            whenReady={(map) => {
              // Ensure map resizes properly and tiles load completely
              setTimeout(() => {
                try {
                  if (map && typeof map.invalidateSize === 'function') {
                    map.invalidateSize();
                    window.dispatchEvent(new Event('resize'));
                  }
                } catch (error) {
                  console.warn('Map invalidateSize failed:', error);
                }
              }, 100);
            }}
            whenCreated={(map) => {
              // Force tile loading when map is created
              setTimeout(() => {
                try {
                  if (map && typeof map.invalidateSize === 'function') {
                    map.invalidateSize();
                  }
                } catch (error) {
                  console.warn('Map invalidateSize failed:', error);
                }
              }, 200);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              minZoom={1}
              subdomains={['a', 'b', 'c']}
              tileSize={256}
              updateWhenZooming={true}
              updateWhenIdle={false}
              keepBuffer={4}
              tms={false}
              zoomReverse={false}
              detectRetina={false}
              maxNativeZoom={18}
              minNativeZoom={0}
              zoomOffset={0}
              errorTileUrl="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2IiBzdHJva2U9IiNiMmIyYjIiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TWlzc2luZyBUaWxlPC90ZXh0Pjwvc3ZnPg=="
              crossOrigin={null}
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {location?.coordinates && (
              <DraggableMarker
                key={`${location.coordinates.lat}-${location.coordinates.lng}`}
                position={[location.coordinates.lat, location.coordinates.lng]}
                icon={L.icon({
                  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${markerColor}.png`
                })}
                onDragEnd={async (newPos) => await handleMapClick(newPos)}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              >
                <Popup>
                  <strong>{locationType === 'pickup' ? t('orders.pickup') : t('orders.delivery')}</strong><br />
                  {location.displayName}
                </Popup>
              </DraggableMarker>
            )}
            <MapUpdater center={location?.coordinates || userLocation} />
          </MapContainer>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            background: '#F3F4F6',
            color: '#6B7280',
            fontSize: '1rem'
          }}>
            🔄 Loading map...
          </div>
        )}
      </div>
      )}

      {isFullscreen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              style={{
                background: 'white', color: '#111827', border: 'none',
                borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 600
              }}
            >
              {t('common.close')}
            </button>
          </div>
          <div style={{ width: '100%', maxWidth: 900, height: '80vh', background: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <MapContainer
              center={location?.coordinates ? [location.coordinates.lat, location.coordinates.lng] : [userLocation.lat, userLocation.lng]}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              whenReady={(map) => {
                setTimeout(() => { try { map.invalidateSize(); } catch(_){} }, 150);
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                minZoom={1}
                subdomains={['a', 'b', 'c']}
                tileSize={256}
                updateWhenZooming={true}
                updateWhenIdle={false}
                keepBuffer={4}
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {location?.coordinates && (
                <DraggableMarker
                  key={`fs-${location.coordinates.lat}-${location.coordinates.lng}`}
                  position={[location.coordinates.lat, location.coordinates.lng]}
                  icon={L.icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                  })}
                  onDragEnd={(e) => handleMapClick({ lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng })}
                >
                  <Popup>
                    <strong>{locationType === 'pickup' ? t('orders.pickup') : t('orders.delivery')}</strong><br />
                    {location.displayName || 'Drag to set location'}
                  </Popup>
                </DraggableMarker>
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => handleMapClick(userLocation)}
          disabled={loading || !userLocation}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: '#10B981',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: loading || !userLocation ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            opacity: loading || !userLocation ? 0.5 : 1
          }}
        >
          📍 {t('orders.useCurrentLocation')}
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={!location}
          style={{
            padding: '0.5rem 1rem',
            background: '#EF4444',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: !location ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            opacity: !location ? 0.5 : 1
          }}
        >
          {t('common.clear')}
        </button>
      </div>
      
      {/* Address Display */}
      {location && (
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                {t('orders.country')}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.country || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                {t('orders.city')}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.city || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                {t('orders.area')}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.area || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                {t('orders.street')}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.street || 'N/A'}</p>
            </div>
          </div>
          
          {location.isRemote && (
            <div style={{ background: '#FEF3C7', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #FCD34D' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400E' }}>
                ⚠️ {t('orders.remoteAreaWarning')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ ROUTE PREVIEW MAP COMPONENT ============
  

// ============ DRAGGABLE MARKER COMPONENT ============
const DraggableMarker = ({ position, icon, onDragEnd, children, isDragging, setIsDragging }) => {
  const [markerPosition, setMarkerPosition] = useState(position);

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  const eventHandlers = {
    dragstart: () => {
      setIsDragging(true);
    },
    dragend: (e) => {
      const newPos = e.target.getLatLng();
      const coords = { lat: newPos.lat, lng: newPos.lng };
      setMarkerPosition(newPos);

      // Update the location immediately when drag ends
      if (onDragEnd) {
        onDragEnd(coords);
      }

      setIsDragging(false);
    }
  };

  return (
    <Marker
      position={markerPosition}
      icon={icon}
      draggable={true}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
};

// ============ HELPER COMPONENTS ============
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
};

const MapUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
      map.invalidateSize();
    }
  }, [center, map]);

  return null;
};

// ============ CASCADING LOCATION DATA HOOK ============
const useLocationData = (API_URL) => {
  const [cities, setCities] = useState({});
  const [areas, setAreas] = useState({});
  const [streets, setStreets] = useState({});

  // Major cities and areas for common countries as fallback
  const FALLBACK_CITIES = {
    'Egypt': [
      { value: 'Cairo', label: 'Cairo' },
      { value: 'Alexandria', label: 'Alexandria' },
      { value: 'Giza', label: 'Giza' },
      { value: 'Shubra El-Kheima', label: 'Shubra El-Kheima' },
      { value: 'Port Said', label: 'Port Said' },
      { value: 'Suez', label: 'Suez' },
      { value: 'Luxor', label: 'Luxor' },
      { value: 'Mansoura', label: 'Mansoura' },
      { value: 'Tanta', label: 'Tanta' },
      { value: 'Asyut', label: 'Asyut' },
      { value: 'Ismailia', label: 'Ismailia' },
      { value: 'Zagazig', label: 'Zagazig' },
      { value: 'Damanhur', label: 'Damanhur' },
      { value: 'Beni Suef', label: 'Beni Suef' },
      { value: 'Aswan', label: 'Aswan' }
    ],
    'Saudi Arabia': [
      { value: 'Riyadh', label: 'Riyadh' },
      { value: 'Jeddah', label: 'Jeddah' },
      { value: 'Mecca', label: 'Mecca' },
      { value: 'Medina', label: 'Medina' },
      { value: 'Dammam', label: 'Dammam' },
      { value: 'Khobar', label: 'Khobar' },
      { value: 'Taif', label: 'Taif' },
      { value: 'Tabuk', label: 'Tabuk' },
      { value: 'Buraydah', label: 'Buraydah' },
      { value: 'Khamis Mushait', label: 'Khamis Mushait' }
    ],
    'United Arab Emirates': [
      { value: 'Dubai', label: 'Dubai' },
      { value: 'Abu Dhabi', label: 'Abu Dhabi' },
      { value: 'Sharjah', label: 'Sharjah' },
      { value: 'Ajman', label: 'Ajman' },
      { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah' },
      { value: 'Fujairah', label: 'Fujairah' },
      { value: 'Umm Al Quwain', label: 'Umm Al Quwain' }
    ],
    'Jordan': [
      { value: 'Amman', label: 'Amman' },
      { value: 'Zarqa', label: 'Zarqa' },
      { value: 'Irbid', label: 'Irbid' },
      { value: 'Russeifa', label: 'Russeifa' },
      { value: 'Wadi Al Seer', label: 'Wadi Al Seer' },
      { value: 'Al-Quwaysimah', label: 'Al-Quwaysimah' },
      { value: 'Aqaba', label: 'Aqaba' }
    ],
    'Lebanon': [
      { value: 'Beirut', label: 'Beirut' },
      { value: 'Tripoli', label: 'Tripoli' },
      { value: 'Sidon', label: 'Sidon' },
      { value: 'Tyre', label: 'Tyre' },
      { value: 'Byblos', label: 'Byblos' },
      { value: 'Jounieh', label: 'Jounieh' },
      { value: 'Zahle', label: 'Zahle' }
    ],
    'Kuwait': [
      { value: 'Kuwait City', label: 'Kuwait City' },
      { value: 'Al Ahmadi', label: 'Al Ahmadi' },
      { value: 'Hawalli', label: 'Hawalli' },
      { value: 'Al Jahra', label: 'Al Jahra' },
      { value: 'Al Farwaniyah', label: 'Al Farwaniyah' },
      { value: 'Al Asimah', label: 'Al Asimah' }
    ],
    'Qatar': [
      { value: 'Doha', label: 'Doha' },
      { value: 'Al Rayyan', label: 'Al Rayyan' },
      { value: 'Al Wakrah', label: 'Al Wakrah' },
      { value: 'Al Khor', label: 'Al Khor' },
      { value: 'Umm Salal', label: 'Umm Salal' }
    ],
    'Bahrain': [
      { value: 'Manama', label: 'Manama' },
      { value: 'Riffa', label: 'Riffa' },
      { value: 'Muharraq', label: 'Muharraq' },
      { value: 'Hamad Town', label: 'Hamad Town' }
    ],
    'Oman': [
      { value: 'Muscat', label: 'Muscat' },
      { value: 'Seeb', label: 'Seeb' },
      { value: 'Salalah', label: 'Salalah' },
      { value: 'Nizwa', label: 'Nizwa' },
      { value: 'Al Sohar', label: 'Al Sohar' }
    ]
  };

  // Areas/Regions for major cities
  const FALLBACK_AREAS = {
    'Egypt-Cairo': [
      { value: 'Downtown Cairo', label: 'Downtown Cairo' },
      { value: 'Zamalek', label: 'Zamalek' },
      { value: 'Heliopolis', label: 'Heliopolis' },
      { value: 'Nasr City', label: 'Nasr City' },
      { value: 'Maadi', label: 'Maadi' },
      { value: 'Mohandessin', label: 'Mohandessin' },
      { value: 'Dokki', label: 'Dokki' },
      { value: 'Garden City', label: 'Garden City' },
      { value: 'Abdeen', label: 'Abdeen' },
      { value: 'Manshiyat Naser', label: 'Manshiyat Naser' },
      { value: 'Islamic Cairo', label: 'Islamic Cairo' },
      { value: 'Coptic Cairo', label: 'Coptic Cairo' },
      { value: 'Tahrir Square', label: 'Tahrir Square' },
      { value: 'Roda Island', label: 'Roda Island' },
      { value: 'Zamalek', label: 'Zamalek' }
    ],
    'Egypt-Alexandria': [
      { value: 'Downtown Alexandria', label: 'Downtown Alexandria' },
      { value: 'Montaza', label: 'Montaza' },
      { value: 'Laurent', label: 'Laurent' },
      { value: 'Fleming', label: 'Fleming' },
      { value: 'Raml Station', label: 'Raml Station' },
      { value: 'Sidi Gaber', label: 'Sidi Gaber' },
      { value: 'Roushdy', label: 'Roushdy' },
      { value: 'Miami', label: 'Miami' },
      { value: 'San Stefano', label: 'San Stefano' },
      { value: 'Smouha', label: 'Smouha' },
      { value: 'Bacchus', label: 'Bacchus' },
      { value: 'Al Hadara', label: 'Al Hadara' },
      { value: 'Loran', label: 'Loran' },
      { value: 'Saba Pasha', label: 'Saba Pasha' },
      { value: 'Abou Qir', label: 'Abou Qir' }
    ],
    'Saudi Arabia': [
      { value: 'Riyadh', label: 'Riyadh' },
      { value: 'Jeddah', label: 'Jeddah' },
      { value: 'Mecca', label: 'Mecca' },
      { value: 'Medina', label: 'Medina' },
      { value: 'Dammam', label: 'Dammam' },
      { value: 'Khobar', label: 'Khobar' },
      { value: 'Taif', label: 'Taif' },
      { value: 'Tabuk', label: 'Tabuk' },
      { value: 'Buraydah', label: 'Buraydah' },
      { value: 'Khamis Mushait', label: 'Khamis Mushait' }
    ],
    'UAE': [
      { value: 'Dubai', label: 'Dubai' },
      { value: 'Abu Dhabi', label: 'Abu Dhabi' },
      { value: 'Sharjah', label: 'Sharjah' },
      { value: 'Ajman', label: 'Ajman' },
      { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah' },
      { value: 'Fujairah', label: 'Fujairah' },
      { value: 'Umm Al Quwain', label: 'Umm Al Quwain' }
    ],
    'Jordan': [
      { value: 'Amman', label: 'Amman' },
      { value: 'Zarqa', label: 'Zarqa' },
      { value: 'Irbid', label: 'Irbid' },
      { value: 'Russeifa', label: 'Russeifa' },
      { value: 'Wadi Al Seer', label: 'Wadi Al Seer' },
      { value: 'Al-Quwaysimah', label: 'Al-Quwaysimah' },
      { value: 'Aqaba', label: 'Aqaba' }
    ],
    'Lebanon': [
      { value: 'Beirut', label: 'Beirut' },
      { value: 'Tripoli', label: 'Tripoli' },
      { value: 'Sidon', label: 'Sidon' },
      { value: 'Tyre', label: 'Tyre' },
      { value: 'Byblos', label: 'Byblos' },
      { value: 'Jounieh', label: 'Jounieh' },
      { value: 'Zahle', label: 'Zahle' }
    ],
    'Kuwait': [
      { value: 'Kuwait City', label: 'Kuwait City' },
      { value: 'Al Ahmadi', label: 'Al Ahmadi' },
      { value: 'Hawalli', label: 'Hawalli' },
      { value: 'Al Jahra', label: 'Al Jahra' },
      { value: 'Al Farwaniyah', label: 'Al Farwaniyah' },
      { value: 'Al Asimah', label: 'Al Asimah' }
    ],
    'Qatar': [
      { value: 'Doha', label: 'Doha' },
      { value: 'Al Rayyan', label: 'Al Rayyan' },
      { value: 'Al Wakrah', label: 'Al Wakrah' },
      { value: 'Al Khor', label: 'Al Khor' },
      { value: 'Umm Salal', label: 'Umm Salal' }
    ],
    'Bahrain': [
      { value: 'Manama', label: 'Manama' },
      { value: 'Riffa', label: 'Riffa' },
      { value: 'Muharraq', label: 'Muharraq' },
      { value: 'Hamad Town', label: 'Hamad Town' }
    ],
    'Oman': [
      { value: 'Muscat', label: 'Muscat' },
      { value: 'Seeb', label: 'Seeb' },
      { value: 'Salalah', label: 'Salalah' },
      { value: 'Nizwa', label: 'Nizwa' },
      { value: 'Al Sohar', label: 'Al Sohar' }
    ]
  };

  // Country name to ISO code mapping for better API queries
  const COUNTRY_CODES = {
    'Egypt': 'eg',
    'Saudi Arabia': 'sa',
    'United Arab Emirates': 'ae',
    'Jordan': 'jo',
    'Lebanon': 'lb',
    'Kuwait': 'kw',
    'Qatar': 'qa',
    'Bahrain': 'bh',
    'Oman': 'om',
    'Morocco': 'ma',
    'Tunisia': 'tn',
    'Algeria': 'dz',
    'Libya': 'ly',
    'Sudan': 'sd',
    'Yemen': 'ye',
    'Iraq': 'iq',
    'Syria': 'sy',
    'Palestine': 'ps'
  };

  // Function to search for cities by country
  const searchCities = async (country, query = '') => {
    const cacheKey = `${country}-${query}`;
    if (!country) return [];

    // Return cached results if available
    if (cities[cacheKey]) return cities[cacheKey];

    // Try backend API first
    try {
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(c => ({ value: c, label: c }));
        if (options.length) {
          setCities(prev => ({ ...prev, [cacheKey]: options }));
          return options;
        }
      }
    } catch (_) {}

    // First check if we have hardcoded fallback cities for this country
    if (FALLBACK_CITIES[country]) {
      const fallbackCities = FALLBACK_CITIES[country];
      setCities(prev => ({ ...prev, [cacheKey]: fallbackCities }));
      return fallbackCities;
    }

    try {
      // Try Nominatim first - it's more reliable than Photon for geographic queries
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(country)}&format=json&limit=20&addressdetails=1&dedupe=1&bounded=1&extratags=1`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`Nominatim results for ${country}:`, data.length);

        if (data.length > 0) {
          // Extract unique cities from the response
          const uniqueCities = [...new Set(data
            .map(item => {
              // Try multiple possible city fields
              const city = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || item.display_name?.split(',')[0];
              return city ? { name: city.trim(), item: item } : null;
            })
            .filter(Boolean)
            .map(({ name }) => name)
          )].slice(0, 15);

          if (uniqueCities.length > 0) {
            const cityList = uniqueCities.map(city => ({
              value: city,
              label: city
            }));

            console.log(`Found ${cityList.length} cities for ${country}:`, cityList.slice(0, 3));
            setCities(prev => ({ ...prev, [cacheKey]: cityList }));
            return cityList;
          }
        }
      }

      // If Nominatim doesn't work, try Photon API with country code
      console.log(`Trying Photon API for ${country}`);
      const countryCode = COUNTRY_CODES[country] || country.toLowerCase();
      const photonResponse = await fetch(
        `https://photon.komoot.io/api/?q=city+in+${encodeURIComponent(countryCode)}&lang=en&limit=20&layer=city&layer=town&layer=village&layer=suburb`
      );

      if (photonResponse.ok) {
        const photonData = await photonResponse.json();
        console.log(`Photon results for ${country}:`, photonData.features?.length);

        if (photonData.features && photonData.features.length > 0) {
          const uniqueCities = [...new Set(photonData.features
            .map(feature => feature.properties?.name)
            .filter(Boolean)
          )].slice(0, 15);

          const cityList = uniqueCities.map(city => ({
            value: city,
            label: city
          }));

          console.log(`Found ${cityList.length} cities via Photon for ${country}`);
          setCities(prev => ({ ...prev, [cacheKey]: cityList }));
          return cityList;
        }
      }

      // If both APIs fail, use fallback cities
      console.warn(`All APIs failed for ${country}, using fallback`);
      return await getFallbackCities(country, cacheKey);

    } catch (error) {
      console.warn(`City search failed for ${country}:`, error);
      return await getFallbackCities(country, cacheKey);
    }
  };

  // Get fallback cities for a country
  const getFallbackCities = (country, cacheKey) => {
    const fallbackCities = FALLBACK_CITIES[country] || [
      { value: 'Capital City', label: 'Capital City' },
      { value: 'Main City', label: 'Main City' },
      { value: 'Central City', label: 'Central City' }
    ];

    setCities(prev => ({ ...prev, [cacheKey]: fallbackCities }));
    return fallbackCities;
  };

  // Simplified fallback search for when APIs are definitely down
  

  // Function to search for areas by country and city
  const searchAreas = async (country, city) => {
    const key = `${country}-${city}`;
    if (!country || !city || areas[key]) return areas[key] || [];

    // Try backend API first
    try {
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities/${encodeURIComponent(city)}/areas`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(a => ({ value: a, label: a }));
        if (options.length) {
          setAreas(prev => ({ ...prev, [key]: options }));
          return options;
        }
      }
    } catch (_) {}

    // First check if we have fallback areas for this city/country combination
    if (FALLBACK_AREAS[key]) {
      const fallbackAreas = FALLBACK_AREAS[key];
      setAreas(prev => ({ ...prev, [key]: fallbackAreas }));
      return fallbackAreas;
    }

    try {
      // Use Photon API for areas (districts, neighborhoods, suburbs in the city)
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(city)}, ${encodeURIComponent(country)}&lang=en&limit=20&layer=street&layer=locality`
      );

      if (!response.ok) {
        throw new Error(`Photon API failed for areas`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Extract unique district/neighborhood names
        const areaOptions = data.features
          .map(feature => {
            const properties = feature.properties;
      
            const localityName = properties.locality;
            const districtName = properties.district;
            const suburbName = properties.suburb;

            // Use district, suburb, or locality names as areas
            const areaName = districtName || suburbName || localityName || properties.name;

            if (areaName && areaName !== city) {
              return {
                value: areaName,
                label: areaName,
                properties: properties
              };
            }
            return null;
          })
          .filter(Boolean);

        // Remove duplicates based on area name
        const uniqueAreas = [];
        const seenNames = new Set();

        areaOptions.forEach(area => {
          if (!seenNames.has(area.value)) {
            uniqueAreas.push(area);
            seenNames.add(area.value);
          }
        });

        const finalAreas = uniqueAreas.slice(0, 15);
        if (finalAreas.length > 0) {
          setAreas(prev => ({ ...prev, [key]: finalAreas }));
          return finalAreas;
        }
      }

      // If Photon doesn't return results, try Nominatim as backup
      return await fallbackSearchAreas(country, city, key);

    } catch (error) {
      console.warn('Photon API failed for areas, falling back to Nominatim:', error);
      return await fallbackSearchAreas(country, city, key);
    }
  };

  // Fallback search using Nominatim when Photon fails
  const fallbackSearchAreas = async (country, city, key) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}&format=json&limit=20&addressdetails=1&dedupe=1`
      );

      if (!response.ok) return [];

      const data = await response.json();
      // Extract unique areas/suburbs
      const uniqueAreas = [...new Set(data.map(item =>
        item.address?.suburb || item.address?.neighbourhood || item.address?.district
      ).filter(Boolean))].slice(0, 15);

      const areaList = uniqueAreas.map(area => ({ value: area, label: area }));

      // If no areas found via API, use fallback for known cities
      const finalAreas = areaList.length > 0 ? areaList : (FALLBACK_AREAS[key] || []);
      setAreas(prev => ({ ...prev, [key]: finalAreas }));
      return finalAreas;

    } catch (error) {
      console.warn('Failed to fetch areas:', error);
      // Fallback to hardcoded areas if API fails
      const fallbackAreas = FALLBACK_AREAS[key] || [];
      if (fallbackAreas.length > 0) {
        setAreas(prev => ({ ...prev, [key]: fallbackAreas }));
        return fallbackAreas;
      }
      return [];
    }
  };

  // Function to search for streets by country, city, and area
  const searchStreets = async (country, city, area) => {
    const key = `${country}-${city}-${area}`;
    if (!country || !city || !area || streets[key]) return streets[key] || [];

    // Try backend API first
    try {
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities/${encodeURIComponent(city)}/areas/${encodeURIComponent(area)}/streets`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(s => ({ value: s, label: s }));
        if (options.length) {
          setStreets(prev => ({ ...prev, [key]: options }));
          return options;
        }
      }
    } catch (_) {}

    try {
      // Try Photon API first for streets in the area
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(area)}, ${encodeURIComponent(city)}, ${encodeURIComponent(country)}&lang=en&limit=20&layer=street&layer=locality`
      );

      if (!response.ok) {
        throw new Error(`Photon API failed for streets`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Extract unique street names
        const streetOptions = data.features
          .map(feature => {
            const properties = feature.properties;
            
            const streetName = properties.street || properties.name;

            if (streetName) {
              return {
                value: streetName,
                label: streetName,
                properties: properties
              };
            }
            return null;
          })
          .filter(Boolean);

        // Remove duplicates based on street name
        const uniqueStreets = [];
        const seenNames = new Set();

        streetOptions.forEach(street => {
          if (!seenNames.has(street.value)) {
            uniqueStreets.push(street);
            seenNames.add(street.value);
          }
        });

        const finalStreets = uniqueStreets.slice(0, 15);
        if (finalStreets.length > 0) {
          setStreets(prev => ({ ...prev, [key]: finalStreets }));
          return finalStreets;
        }
      }

      // If Photon doesn't return results, try Nominatim as backup
      return await fallbackSearchStreets(country, city, area, key);

    } catch (error) {
      console.warn('Photon API failed for streets, falling back to Nominatim:', error);
      return await fallbackSearchStreets(country, city, area, key);
    }
  };

  // Fallback search using Nominatim when Photon fails
  const fallbackSearchStreets = async (country, city, area, key) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}&suburb=${encodeURIComponent(area)}&format=json&limit=20&addressdetails=1&dedupe=1`
      );

      if (!response.ok) return [];

      const data = await response.json();
      // Extract unique streets
      const uniqueStreets = [...new Set(data.map(item =>
        item.address?.road || item.address?.street || item.address?.pedestrian
      ).filter(Boolean))].slice(0, 15);

      const streetList = uniqueStreets.map(street => ({ value: street, label: street }));

      setStreets(prev => ({ ...prev, [key]: streetList }));
      return streetList;

    } catch (error) {
      console.warn('Failed to fetch streets:', error);
      return [];
    }
  };

  // Function to geocode an address and update map
  const geocodeAddress = async (addressData, onLocationChange) => {
    try {
      if (!addressData.country || !addressData.city) {
        return;
      }

      const qParts = [
        addressData.street,
        addressData.building,
        addressData.area,
        addressData.city,
        addressData.country
      ].filter(Boolean);
      const q = qParts.join(', ');

      const response = await fetch(`${API_URL}/locations/search?q=${encodeURIComponent(q)}`);

      if (!response.ok) {
        console.warn('Address geocoding failed:', response.statusText);
        return;
      }

      const data = await response.json();

      if (data && data.coordinates) {
        // Create location object similar to reverse geocoding
        const location = {
          coordinates: data.coordinates,
          locationLink: data.locationLink,
          address: {
            ...data.address,
            personName: addressData.personName,
            personPhone: addressData.personPhone,
            floor: addressData.floor,
            apartment: addressData.apartment
          },
          displayName: data.displayName,
          isRemote: false // Will be determined later if needed
        };

        onLocationChange(location);
      }
    } catch (error) {
      console.warn('Address geocoding error:', error);
    }
  };

  return {
    searchCities,
    searchAreas,
    searchStreets,
    geocodeAddress,
    getCities: (country) => cities[country] || [],
    getAreas: (country, city) => areas[`${country}-${city}`] || [],
    getStreets: (country, city, area) => streets[`${country}-${city}-${area}`] || []
  };
};

// ============ COMBINED LOCATION ENTRY (Map + Address Fields Together - MATRIX STYLE) ============
const LocationEntryCombined = ({
  mapLocation,
  onMapLocationChange,
  addressData,
  onAddressChange,
  userLocation,
  markerColor,
  API_URL,
  locationType,
  compact = false,
  countries = [],
  t,
  validationErrors = {}
}) => {
  const locationData = useLocationData(API_URL);
  

  // State for cascaded dropdowns
  const [availableCities, setAvailableCities] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [availableStreets, setAvailableStreets] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);

  

  // Handle country change - load cities
  const handleCountryChange = async (country) => {
    const newAddress = { ...addressData, country, city: '', area: '', street: '' };
    onAddressChange(newAddress);

    if (country) {
      setLoadingCities(true);
      const cities = await locationData.searchCities(country);
      setAvailableCities(cities);
      setLoadingCities(false);
      setAvailableAreas([]);
      setAvailableStreets([]);
    } else {
      setAvailableCities([]);
      setAvailableAreas([]);
      setAvailableStreets([]);
    }
  };

  // Handle city change - load areas
  const handleCityChange = async (city) => {
    const newAddress = { ...addressData, city, area: '', street: '' };
    onAddressChange(newAddress);

    if (addressData.country && city) {
      setLoadingAreas(true);
      const areas = await locationData.searchAreas(addressData.country, city);
      setAvailableAreas(areas);
      setLoadingAreas(false);
      setAvailableStreets([]);
    } else {
      setAvailableAreas([]);
      setAvailableStreets([]);
    }

    // Geocode when city changes (with enough info)
    setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 100);
  };

  // Handle area change - load streets
  const handleAreaChange = async (area) => {
    const newAddress = { ...addressData, area, street: '' };
    onAddressChange(newAddress);

    if (addressData.country && addressData.city && area) {
      setLoadingStreets(true);
      const streets = await locationData.searchStreets(addressData.country, addressData.city, area);
      setAvailableStreets(streets);
      setLoadingStreets(false);
    } else {
      setAvailableStreets([]);
    }

    // Geocode when area changes
    setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 100);
  };

  // Handle other field changes - geocode for street, building, floor, apartment
  const handleFieldChange = (field, value) => {
    const newAddress = { ...addressData, [field]: value };
    onAddressChange(newAddress);

    if (['street', 'building', 'floor', 'apartment'].includes(field)) {
      setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 300);
    }
  };

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, #000000 0%, #001100 100%)',
      border: '2px solid #00AA00',
      borderRadius: '0.75rem',
      overflow: 'hidden'
    }}>
      {/* Address Fields Section */}
      <div style={{ padding: '1rem', borderBottom: '2px solid #00AA00' }}>
        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#30FF30',
          marginBottom: '0.75rem',
          textShadow: '0 0 10px #30FF30'
        }}>
              📝 {locationType === 'pickup' ? t('orders.pickupLocation') : t('orders.deliveryLocation')} Details
        </h4>

        <div className="address-fields-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🌍 {t('orders.country')} *
            </label>
            <ComboboxInput
              value={addressData.country || ''}
              onChange={(value) => {
                // Update both the address state and trigger country change
                onAddressChange({...addressData, country: value});
                handleCountryChange(value);
              }}
              placeholder={t('orders.selectCountry')}
              options={countries.map(country => ({ value: country, label: country }))}
              required={true}
              error={validationErrors?.country}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🏙️ {t('orders.city')} *
            </label>
            <ComboboxInput
              value={addressData.city || ''}
              onChange={(value) => {
                // Update the address state and trigger any validation/geocoding
                onAddressChange({...addressData, city: value});
                handleCityChange(value);
              }}
              placeholder={loadingCities ? 'Loading cities...' : addressData.country ? 'Type or select city' : 'Select country first'}
              options={availableCities}
              disabled={!addressData.country}
              loading={loadingCities}
              required={true}
              error={validationErrors?.city}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🏘️ {t('orders.area')}
            </label>
            <ComboboxInput
              value={addressData.area || ''}
              onChange={(value) => {
                onAddressChange({...addressData, area: value});
                handleAreaChange(value);
              }}
              placeholder={loadingAreas ? 'Loading areas...' : addressData.city ? 'Type or select area' : 'Select city first'}
              options={availableAreas}
              disabled={!addressData.city}
              loading={loadingAreas}
              required={true}
              error={validationErrors?.area}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🛣️ {t('orders.street')}
            </label>
            <ComboboxInput
              value={addressData.street || ''}
              onChange={(value) => {
                onAddressChange({...addressData, street: value});
                handleFieldChange('street', value);
              }}
              placeholder={loadingStreets ? 'Loading streets...' : addressData.area ? 'Type or select street' : 'Select area first'}
              options={availableStreets}
              disabled={!addressData.area}
              loading={loadingStreets}
              required={true}
              error={validationErrors?.street}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🏢 {t('orders.building')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
              <input
                type="text"
                value={addressData.building || ''}
                onChange={(e) => onAddressChange({...addressData, building: e.target.value})}
                placeholder={t('orders.buildingNumber')}
                style={{
                  width: '100%',
                  height: '44px',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: '#30FF30',
                  border: validationErrors?.building ? '2px solid #EF4444' : '2px solid #00AA00',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  padding: '0.5rem',
                  outline: 'none'
                }}
                required
              />
              <input
                type="text"
                value={addressData.floor || ''}
                onChange={(e) => onAddressChange({...addressData, floor: e.target.value})}
                placeholder={t('orders.floor')}
                style={{
                  width: '100%',
                  height: '44px',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: '#30FF30',
                  border: '2px solid #00AA00',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  padding: '0.5rem',
                  outline: 'none'
                }}
              />
              <input
                type="text"
                value={addressData.apartment || ''}
                onChange={(e) => onAddressChange({...addressData, apartment: e.target.value})}
                placeholder={t('orders.aptNumber')}
                style={{
                  width: '100%',
                  height: '44px',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: '#30FF30',
                  border: '2px solid #00AA00',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  padding: '0.5rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              👤 {t('orders.contactName')} *
            </label>
            <input
              type="text"
              value={addressData.personName || ''}
              onChange={(e) => onAddressChange({...addressData, personName: e.target.value})}
              placeholder={t('orders.contactPerson')}
              required
              style={{
                width: '100%',
                height: '44px',
                background: 'rgba(0, 17, 0, 0.8)',
                color: '#30FF30',
                border: validationErrors?.personName ? '2px solid #EF4444' : '2px solid #00AA00',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                padding: '0.5rem',
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              ☎️ {t('orders.contactPhone')} *
            </label>
            <input
              type="tel"
              value={addressData.personPhone || ''}
              onChange={(e) => onAddressChange({...addressData, personPhone: e.target.value})}
              placeholder={t('orders.phoneNumber')}
              required
              style={{
                width: '100%',
                height: '44px',
                background: 'rgba(0, 17, 0, 0.8)',
                color: '#30FF30',
                border: validationErrors?.personPhone ? '2px solid #EF4444' : '2px solid #00AA00',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                padding: '0.5rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Map Section - Full Width */}
      <div style={{ padding: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem'
        }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#30FF30',
            textShadow: '0 0 10px #30FF30'
          }}>
            🗺️ Interactive Map
          </h4>
        </div>

        <MapLocationPicker
          location={mapLocation}
          onChange={(loc) => {
            onMapLocationChange(loc);
          }}
          onAddressFill={(addr) => {
            onAddressChange({
              ...addressData,
              ...addr
            });
          }}
          userLocation={userLocation}
          markerColor={markerColor}
          API_URL={API_URL}
          locationType={locationType}
          compact={true}
          t={t}
        />
      </div>

      {/* Fullscreen handled inside MapLocationPicker */}
    </div>
  );
};

// ============ LOCATION ENTRY COMPONENT (Address Fields + Map) ============
export const LocationEntry = ({
  showManualEntry,
  mapLocation,
  onMapLocationChange,
  addressData,
  onAddressChange,
  userLocation,
  markerColor,
  API_URL,
  locationType,
  compact = false,
  countries = [],
  t
}) => {
  const locationData = useLocationData(API_URL);

  // State for cascaded dropdowns
  const [availableCities, setAvailableCities] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [availableStreets, setAvailableStreets] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);

  // Handle country change - load cities
  const handleCountryChange = async (country) => {
    const newAddress = { ...addressData, country, city: '', area: '', street: '' };
    onAddressChange(newAddress);

    if (country) {
      setLoadingCities(true);
      const cities = await locationData.searchCities(country);
      setAvailableCities(cities);
      setLoadingCities(false);
      setAvailableAreas([]);
      setAvailableStreets([]);
    } else {
      setAvailableCities([]);
      setAvailableAreas([]);
      setAvailableStreets([]);
    }
  };

  // Handle city change - load areas
  const handleCityChange = async (city) => {
    const newAddress = { ...addressData, city, area: '', street: '' };
    onAddressChange(newAddress);

    if (addressData.country && city) {
      setLoadingAreas(true);
      const areas = await locationData.searchAreas(addressData.country, city);
      setAvailableAreas(areas);
      setLoadingAreas(false);
      setAvailableStreets([]);
    } else {
      setAvailableAreas([]);
      setAvailableStreets([]);
    }

    // Geocode when city changes (with enough info)
    setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 100);
  };

  // Handle area change - load streets
  const handleAreaChange = async (area) => {
    const newAddress = { ...addressData, area, street: '' };
    onAddressChange(newAddress);

    if (addressData.country && addressData.city && area) {
      setLoadingStreets(true);
      const streets = await locationData.searchStreets(addressData.country, addressData.city, area);
      setAvailableStreets(streets);
      setLoadingStreets(false);
    } else {
      setAvailableStreets([]);
    }

    // Geocode when area changes
    setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 100);
  };

  // Handle street and other field changes - geocode
  const handleFieldChange = (field, value) => {
    const newAddress = { ...addressData, [field]: value };
    onAddressChange(newAddress);

    // Geocode for street, building, floor, apartment changes
    if (['street', 'building', 'floor', 'apartment'].includes(field)) {
      setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 300);
    }
  };

  if (showManualEntry) {
    // Manual Address Entry Mode
    return (
      <div style={{
        background: '#F9FAFB',
        padding: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid #E5E7EB'
      }}>
        <div className="address-fields-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              {t('orders.country')} *
            </label>
            <select
              value={addressData.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                background: 'white'
              }}
            >
              <option value="">{t('orders.selectCountry')}</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              {t('orders.city')} *
            </label>
            <AutocompleteInput
              value={addressData.city}
              onChange={(value) => handleCityChange(value)}
              placeholder={loadingCities ? 'Loading cities...' : addressData.country ? 'Type or select city' : 'Select country first'}
              options={availableCities}
              disabled={!addressData.country}
              loading={loadingCities}
              required={true}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              {t('orders.area')}
            </label>
            <AutocompleteInput
              value={addressData.area}
              onChange={(value) => handleAreaChange(value)}
              placeholder={loadingAreas ? 'Loading areas...' : addressData.city ? 'Type or select area' : 'Select city first'}
              options={availableAreas}
              disabled={!addressData.city}
              loading={loadingAreas}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              {t('orders.street')}
            </label>
            <AutocompleteInput
              value={addressData.street}
              onChange={(value) => handleFieldChange('street', value)}
              placeholder={loadingStreets ? 'Loading streets...' : addressData.area ? 'Type or select street' : 'Select area first'}
              options={availableStreets}
              disabled={!addressData.area}
              loading={loadingStreets}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              {t('orders.building')}
            </label>
            <input
              type="text"
              value={addressData.building}
              onChange={(e) => onAddressChange({...addressData, building: e.target.value})}
              placeholder={t('orders.buildingNumber')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              {t('orders.floor')}
            </label>
            <input
              type="text"
              value={addressData.floor}
              onChange={(e) => onAddressChange({...addressData, floor: e.target.value})}
              placeholder={t('orders.floor')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              {t('orders.apartment')}
            </label>
            <input
              type="text"
              value={addressData.apartment}
              onChange={(e) => onAddressChange({...addressData, apartment: e.target.value})}
              placeholder={t('orders.aptNumber')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              {t('orders.contactName')} *
            </label>
            <input
              type="text"
              value={addressData.personName}
              onChange={(e) => onAddressChange({...addressData, personName: e.target.value})}
              placeholder={t('orders.contactPerson')}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>
    );
  } else {
    // Map Location Picker Mode
    return (
            <MapLocationPicker
              location={mapLocation}
              onChange={onMapLocationChange}
              onAddressFill={(addr) => {
                onAddressChange({
                  ...addressData,
                  ...addr
                });
              }}
              userLocation={userLocation}
              markerColor={markerColor}
              API_URL={API_URL}
              locationType={locationType}
              compact={compact}
              t={t}
            />
    );
  }
};

export default OrderCreationForm;
