import { useState } from 'react';

//TODO I think this is no longer used and should be deleted.
// ============ CASCADING LOCATION DATA HOOK ============
export const useLocationData = (API_URL) => {
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
    const normalizedQuery = (query || '').trim().toLowerCase();
    const cacheKey = `${country}-${normalizedQuery}`;
    if (!country) return [];

    if (cities[cacheKey]) return cities[cacheKey];

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (normalizedQuery) {
        params.set('q', normalizedQuery);
      }
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities?${params.toString()}`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(c => ({ value: c, label: c }));
        if (options.length) {
          setCities(prev => ({ ...prev, [cacheKey]: options }));
          return options;
        }
      }
    } catch (_) { }

    if (FALLBACK_CITIES[country]) {
      const fallbackCities = FALLBACK_CITIES[country].filter(city => !normalizedQuery || city.value.toLowerCase().includes(normalizedQuery)
      );
      if (fallbackCities.length) {
        setCities(prev => ({ ...prev, [cacheKey]: fallbackCities }));
        return fallbackCities;
      }
    }

    try {
      const nominatimParams = new URLSearchParams({
        format: 'json',
        limit: '20',
        addressdetails: '1',
        dedupe: '1',
        extratags: '1'
      });
      if (normalizedQuery) {
        nominatimParams.set('q', `${normalizedQuery}, ${country}`);
      } else {
        nominatimParams.set('q', `city in ${country}`);
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${nominatimParams.toString()}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`Nominatim results for ${country}:`, data.length);

        if (data.length > 0) {
          const uniqueCities = [...new Set(data
            .map(item => {
              const city = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || item.display_name?.split(',')[0];
              return city ? city.trim() : null;
            })
            .filter(Boolean)
          )].slice(0, 25);

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

      console.log(`Trying Photon API for ${country}`);
      const countryCode = COUNTRY_CODES[country] || country.toLowerCase().substring(0, 2);
      const photonQuery = normalizedQuery ? `${normalizedQuery} ${countryCode}` : `city in ${countryCode}`;
      const photonResponse = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&lang=en&limit=20&layer=city&layer=town&layer=village&layer=suburb`
      );

      if (photonResponse.ok) {
        const photonData = await photonResponse.json();
        console.log(`Photon results for ${country}:`, photonData.features?.length);

        if (photonData.features && photonData.features.length > 0) {
          const uniqueCities = [...new Set(photonData.features
            .map(feature => feature.properties?.name)
            .filter(Boolean)
          )].slice(0, 25);

          const cityList = uniqueCities.map(city => ({
            value: city,
            label: city
          }));

          console.log(`Found ${cityList.length} cities via Photon for ${country}`);
          setCities(prev => ({ ...prev, [cacheKey]: cityList }));
          return cityList;
        }
      }

      console.warn(`All APIs failed for ${country}, using fallback`);
      return await getFallbackCities(country, cacheKey, normalizedQuery);

    } catch (error) {
      console.warn(`City search failed for ${country}:`, error);
      return await getFallbackCities(country, cacheKey, normalizedQuery);
    }
  };

  const getFallbackCities = (country, cacheKey, normalizedQuery) => {
    const baseFallback = FALLBACK_CITIES[country] || [
      { value: 'Capital City', label: 'Capital City' },
      { value: 'Main City', label: 'Main City' },
      { value: 'Central City', label: 'Central City' }
    ];

    const fallbackCities = normalizedQuery
      ? baseFallback.filter(city => city.value.toLowerCase().includes(normalizedQuery))
      : baseFallback;

    setCities(prev => ({ ...prev, [cacheKey]: fallbackCities }));
    return fallbackCities;
  };

  // Simplified fallback search for when APIs are definitely down
  // Function to search for areas by country and city
  const searchAreas = async (country, city, query = '') => {
    const normalizedQuery = (query || '').trim().toLowerCase();
    const baseKey = `${country}-${city}`;
    const key = `${baseKey}-${normalizedQuery}`;
    if (!country || !city) return [];

    if (areas[key]) return areas[key];

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (normalizedQuery) {
        params.set('q', normalizedQuery);
      }
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities/${encodeURIComponent(city)}/areas?${params.toString()}`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(a => ({ value: a, label: a }));
        if (options.length) {
          setAreas(prev => ({ ...prev, [key]: options }));
          return options;
        }
      }
    } catch (_) { }

    if (FALLBACK_AREAS[baseKey]) {
      const fallbackAreas = FALLBACK_AREAS[baseKey].filter(area => !normalizedQuery || area.value.toLowerCase().includes(normalizedQuery)
      );
      if (fallbackAreas.length) {
        setAreas(prev => ({ ...prev, [key]: fallbackAreas }));
        return fallbackAreas;
      }
    }

    try {
      const photonQuery = normalizedQuery ? `${normalizedQuery}, ${city}, ${country}` : `${city}, ${country}`;
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&lang=en&limit=20&layer=street&layer=locality`
      );

      if (!response.ok) {
        throw new Error(`Photon API failed for areas`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const areaOptions = data.features
          .map(feature => {
            const properties = feature.properties;

            const localityName = properties.locality;
            const districtName = properties.district;
            const suburbName = properties.suburb;

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

        const uniqueAreas = [];
        const seenNames = new Set();

        areaOptions.forEach(area => {
          if (!seenNames.has(area.value)) {
            uniqueAreas.push(area);
            seenNames.add(area.value);
          }
        });

        const finalAreas = uniqueAreas.slice(0, 20);
        if (finalAreas.length > 0) {
          setAreas(prev => ({ ...prev, [key]: finalAreas }));
          return finalAreas;
        }
      }

      return await fallbackSearchAreas(country, city, key, baseKey, normalizedQuery);

    } catch (error) {
      console.warn('Photon API failed for areas, falling back to Nominatim:', error);
      return await fallbackSearchAreas(country, city, key, baseKey, normalizedQuery);
    }
  };

  const fallbackSearchAreas = async (country, city, key, baseKey, normalizedQuery) => {
    try {
      const params = new URLSearchParams({
        country: country,
        city: city,
        format: 'json',
        limit: '20',
        addressdetails: '1',
        dedupe: '1'
      });
      if (normalizedQuery) {
        params.set('q', `${normalizedQuery}, ${city}, ${country}`);
      }
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      const uniqueAreas = [...new Set(data.map(item => item.address?.suburb || item.address?.neighbourhood || item.address?.district
      ).filter(Boolean))].slice(0, 20);

      const areaList = uniqueAreas.map(area => ({ value: area, label: area }));

      const fallbackAreas = areaList.length > 0 ? areaList : (FALLBACK_AREAS[baseKey] || []);
      setAreas(prev => ({ ...prev, [key]: fallbackAreas }));
      return fallbackAreas;

    } catch (error) {
      console.warn('Failed to fetch areas:', error);
      const fallbackAreas = (FALLBACK_AREAS[baseKey] || []).filter(area => !normalizedQuery || area.value.toLowerCase().includes(normalizedQuery)
      );
      if (fallbackAreas.length > 0) {
        setAreas(prev => ({ ...prev, [key]: fallbackAreas }));
        return fallbackAreas;
      }
      return [];
    }
  };

  // Function to search for streets by country, city, and area
  const searchStreets = async (country, city, area, query = '') => {
    const normalizedQuery = (query || '').trim().toLowerCase();
    const baseKey = `${country}-${city}-${area}`;
    const key = `${baseKey}-${normalizedQuery}`;
    if (!country || !city || !area) return [];

    if (streets[key]) return streets[key];

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (normalizedQuery) {
        params.set('q', normalizedQuery);
      }
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities/${encodeURIComponent(city)}/areas/${encodeURIComponent(area)}/streets?${params.toString()}`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(s => ({ value: s, label: s }));
        if (options.length) {
          setStreets(prev => ({ ...prev, [key]: options }));
          return options;
        }
      }
    } catch (_) { }

    try {
      const photonQuery = normalizedQuery ? `${normalizedQuery}, ${area}, ${city}, ${country}` : `${area}, ${city}, ${country}`;
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&lang=en&limit=20&layer=street&layer=locality`
      );

      if (!response.ok) {
        throw new Error(`Photon API failed for streets`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
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

        const uniqueStreets = [];
        const seenNames = new Set();

        streetOptions.forEach(street => {
          if (!seenNames.has(street.value)) {
            uniqueStreets.push(street);
            seenNames.add(street.value);
          }
        });

        const finalStreets = uniqueStreets.slice(0, 20);
        if (finalStreets.length > 0) {
          setStreets(prev => ({ ...prev, [key]: finalStreets }));
          return finalStreets;
        }
      }

      return await fallbackSearchStreets(country, city, area, key, baseKey, normalizedQuery);

    } catch (error) {
      console.warn('Photon API failed for streets, falling back to Nominatim:', error);
      return await fallbackSearchStreets(country, city, area, key, baseKey, normalizedQuery);
    }
  };

  const fallbackSearchStreets = async (country, city, area, key, baseKey, normalizedQuery) => {
    try {
      const params = new URLSearchParams({
        country: country,
        city: city,
        suburb: area,
        format: 'json',
        limit: '20',
        addressdetails: '1',
        dedupe: '1'
      });
      if (normalizedQuery) {
        params.set('q', `${normalizedQuery}, ${area}, ${city}, ${country}`);
      }
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      const uniqueStreets = [...new Set(data.map(item => item.address?.road || item.address?.street || item.address?.pedestrian
      ).filter(Boolean))].slice(0, 20);

      const streetList = uniqueStreets.map(street => ({ value: street, label: street }));

      const finalList = streetList.length > 0 ? streetList : [];
      setStreets(prev => ({ ...prev, [key]: finalList }));
      return finalList;

    } catch (error) {
      console.warn('Failed to fetch streets:', error);
      const cachedBase = streets[`${baseKey}-`] || [];
      return cachedBase.filter(street => !normalizedQuery || street.value.toLowerCase().includes(normalizedQuery)
      );
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
    getCities: (country) => cities[`${country}-`] || [],
    getAreas: (country, city) => areas[`${country}-${city}-`] || [],
    getStreets: (country, city, area) => streets[`${country}-${city}-${area}-`] || []
  };
};
