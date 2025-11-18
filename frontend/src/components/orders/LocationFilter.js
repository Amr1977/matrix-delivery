import React from 'react';
import { useI18n } from '../../i18n/i18nContext';

const LocationFilter = ({
  countries,
  cities,
  areas,
  countryFilter,
  cityFilter,
  areaFilter,
  onCountryChange,
  onCityChange,
  onAreaChange,
  currentLocationAddress
}) => {
  const { t } = useI18n();

  const handleCountryChange = (e) => {
    const selected = e.target.value;
    onCountryChange(selected);
    onCityChange(''); // Reset city when country changes
    onAreaChange(''); // Reset area when country changes
  };

  const handleCityChange = (e) => {
    const selected = e.target.value;
    onCityChange(selected);
    onAreaChange(''); // Reset area when city changes
  };

  const handleAreaChange = (e) => {
    const selected = e.target.value;
    onAreaChange(selected);
  };

  return (
    <div style={{
      background: 'white',
      padding: '1rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1rem',
      border: '1px solid #E5E7EB'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#10247E'
      }}>
        <span>📍</span>
        <span>{t('filters.locationFilter')}</span>
        {currentLocationAddress && (
          <span style={{
            fontSize: '0.75rem',
            color: '#6B7280',
            marginLeft: '0.5rem'
          }}>
            ({t('filters.prefilledBasedOnLocation')})
          </span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Country Dropdown */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            🇸 {t('filters.country')}
          </label>
          <select
            value={countryFilter}
            onChange={handleCountryChange}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              background: 'white'
            }}
          >
            <option value="">{t('filters.allCountries')}</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        {/* City Dropdown */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            🏙️ {t('filters.city')}
          </label>
          <select
            value={cityFilter}
            onChange={handleCityChange}
            disabled={!countryFilter}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              background: 'white',
              opacity: !countryFilter ? 0.5 : 1
            }}
          >
            <option value="">{t('filters.allCities')}</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Area Dropdown */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            📍 {t('filters.area')}
          </label>
          <select
            value={areaFilter}
            onChange={handleAreaChange}
            disabled={!cityFilter}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              background: 'white',
              opacity: !cityFilter ? 0.5 : 1
            }}
          >
            <option value="">{t('filters.allAreas')}</option>
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(countryFilter || cityFilter || areaFilter) && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#F0F9FF',
          borderRadius: '0.375rem',
          border: '1px solid #DBEAFE'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#1E40AF',
            marginBottom: '0.25rem'
          }}>
            {t('filters.activeFilters')}:
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#374151'
          }}>
            {countryFilter && <span>🇸 {countryFilter}</span>}
            {countryFilter && cityFilter && <span> → </span>}
            {cityFilter && <span>🏙️ {cityFilter}</span>}
            {cityFilter && areaFilter && <span> → </span>}
            {areaFilter && <span>📍 {areaFilter}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationFilter;
