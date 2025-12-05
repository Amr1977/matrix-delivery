import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/i18nContext';

const LocationSelector = ({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  style = {}
}) => {
  const { t } = useI18n();
  const API_URL = process.env.REACT_APP_API_URL;

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState({
    countries: false,
    cities: false,
    areas: false
  });

  const [searchTerms, setSearchTerms] = useState({
    country: '',
    city: '',
    area: ''
  });

  // Load countries on mount
  useEffect(() => {
    loadCountries();
  }, []);

  // Load cities when country changes
  useEffect(() => {
    if (value.country) {
      loadCities(value.country);
    } else {
      setCities([]);
    }
  }, [value.country]);

  // Load areas when city changes
  useEffect(() => {
    if (value.country && value.city) {
      loadAreas(value.country, value.city);
    } else {
      setAreas([]);
    }
  }, [value.country, value.city]);

  const loadCountries = async () => {
    try {
      setLoading(prev => ({ ...prev, countries: true }));
      const response = await fetch(`${API_URL}/locations/countries?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setCountries(data);
        }
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
      // Fallback countries
      const fallback = ['Egypt', 'Saudi Arabia', 'UAE', 'Jordan', 'Lebanon', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Morocco', 'Tunisia', 'Algeria', 'Libya', 'Sudan', 'Yemen', 'Iraq', 'Syria', 'Palestine'];
      setCountries(fallback);
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const loadCities = async (country) => {
    if (!country) return;

    try {
      setLoading(prev => ({ ...prev, cities: true }));
      const response = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setCities(data);
        }
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
      setCities([]);
    } finally {
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  const loadAreas = async (country, city) => {
    if (!country || !city) return;

    try {
      setLoading(prev => ({ ...prev, areas: true }));
      const response = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities/${encodeURIComponent(city)}/areas`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setAreas(data);
        }
      }
    } catch (error) {
      console.error('Failed to load areas:', error);
      setAreas([]);
    } finally {
      setLoading(prev => ({ ...prev, areas: false }));
    }
  };

  const handleCountryChange = (newCountry) => {
    onChange({
      ...value,
      country: newCountry,
      city: '',
      area: ''
    });
    setSearchTerms(prev => ({ ...prev, country: '', city: '', area: '' }));
  };

  const handleCityChange = (newCity) => {
    onChange({
      ...value,
      city: newCity,
      area: ''
    });
    setSearchTerms(prev => ({ ...prev, city: '', area: '' }));
  };

  const handleAreaChange = (newArea) => {
    onChange({
      ...value,
      area: newArea
    });
    setSearchTerms(prev => ({ ...prev, area: '' }));
  };

  const handleManualInput = (field, inputValue) => {
    onChange({
      ...value,
      [field]: inputValue
    });
  };

  const Combobox = ({ field, placeholder, value, options, loading, onChange, onManualInput, searchTerm, onSearchChange }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localOptions, setLocalOptions] = useState([]);

    useEffect(() => {
      // Update local options when options prop changes
      setLocalOptions(options);
    }, [options]);

    useEffect(() => {
      // Filter local options based on search term
      if (searchTerm && searchTerm.trim()) {
        setLocalOptions(options.filter(option =>
          option.toLowerCase().includes(searchTerm.toLowerCase())
        ));
      } else {
        setLocalOptions(options);
      }
    }, [searchTerm, options]);

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => {
            const inputValue = e.target.value;
            onSearchChange(inputValue);
            // Don't call onManualInput on every keystroke - only when user finishes typing
          }}
          onFocus={() => {
            setIsFocused(true);
          }}
          onBlur={() => {
            // Update the actual value when user finishes typing
            const currentValue = value || '';
            const searchValue = searchTerm || '';
            if (searchValue !== currentValue) {
              onManualInput(searchValue);
            }
            // Delay hiding to allow click on options
            setTimeout(() => {
              setIsFocused(false);
            }, 200);
          }}
          disabled={disabled}
          required={required}
          style={{
            width: '100%',
            padding: '0.5rem 1rem',
            border: '1px solid #D1D5DB',
            borderRadius: '0.5rem',
            outline: 'none',
            ...style
          }}
          className={className}
        />
        {loading && (
          <div style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{ width: '1rem', height: '1rem', border: '2px solid #D1D5DB', borderTop: '2px solid #4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        )}
        {isFocused && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #D1D5DB',
            borderRadius: '0.5rem',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            {loading ? (
              <div style={{
                padding: '0.5rem 1rem',
                color: '#6B7280',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                Loading...
              </div>
            ) : localOptions.length > 0 ? (
              localOptions.slice(0, 50).map((option, index) => (
                <div
                  key={index}
                  onClick={() => {
                    onChange(option);
                    setIsFocused(false);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    borderBottom: index < localOptions.length - 1 ? '1px solid #E5E7EB' : 'none',
                    background: 'white',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  {option}
                </div>
              ))
            ) : (
              <div style={{
                padding: '0.5rem 1rem',
                color: '#6B7280',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                {searchTerm ? 'No matching options' : 'Type to search or enter custom value'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      <Combobox
        field="countries"
        placeholder={t('orders.selectCountry')}
        value={value.country}
        options={countries}
        loading={loading.countries}
        onChange={handleCountryChange}
        onManualInput={(val) => handleManualInput('country', val)}
        searchTerm={searchTerms.country}
        onSearchChange={(val) => setSearchTerms(prev => ({ ...prev, country: val }))}
      />

      <Combobox
        field="cities"
        placeholder={t('orders.city')}
        value={value.city}
        options={cities}
        loading={loading.cities}
        onChange={handleCityChange}
        onManualInput={(val) => handleManualInput('city', val)}
        searchTerm={searchTerms.city}
        onSearchChange={(val) => setSearchTerms(prev => ({ ...prev, city: val }))}
        disabled={!value.country}
      />

      <div style={{ gridColumn: '1 / -1' }}>
        <Combobox
          field="areas"
          placeholder={t('orders.area')}
          value={value.area}
          options={areas}
          loading={loading.areas}
          onChange={handleAreaChange}
          onManualInput={(val) => handleManualInput('area', val)}
          searchTerm={searchTerms.area}
          onSearchChange={(val) => setSearchTerms(prev => ({ ...prev, area: val }))}
          disabled={!value.country || !value.city}
        />
      </div>
    </div>
  );
};

export default LocationSelector;
