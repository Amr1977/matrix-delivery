import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/i18nContext';

export default function BrowseVendors({ apiUrl }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radiusKm, setRadiusKm] = useState('5');
  const [useNear, setUseNear] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (useNear) {
        const params = new URLSearchParams();
        params.append('lat', lat);
        params.append('lng', lng);
        params.append('radius_km', radiusKm);
        params.append('page', String(page));
        params.append('limit', String(limit));
        const res = await fetch(`${apiUrl}/browse/vendors-near?${params.toString()}`);
        if (res.status === 501) { setError('PostGIS not available'); setItems([]); } else if (res.ok) { const d = await res.json(); setItems(d.items || []); } else { setError('Failed'); }
      } else {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (city) params.append('city', city);
        if (sort) params.append('sort', sort);
        params.append('page', String(page));
        params.append('limit', String(limit));
        const res = await fetch(`${apiUrl}/browse/vendors?${params.toString()}`);
        if (res.ok) { const d = await res.json(); setItems(d.items || d || []); } else { setError('Failed'); }
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [useNear, lat, lng, radiusKm, page, limit, q, city, sort, apiUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '1rem', background: '#F9FAFB' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.keyword')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('orders.city')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
          <option value="recent">Recent</option>
          <option value="rating">Rating</option>
        </select>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => { setUseNear(false); fetchData(); }} style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem' }}>{t('common.search')}</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder={t('common.lat')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
        <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder={t('common.lng')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
        <input value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} placeholder={t('common.radius')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => { setUseNear(true); fetchData(); }} style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Near</button>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: '#DC2626' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
        {items.map(v => (
          <div key={v.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <div style={{ fontWeight: 600 }}>{v.name}</div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{v.city} • {v.country}</div>
            {typeof v.distance_m === 'number' && <div style={{ fontSize: '0.75rem', color: '#374151' }}>{Math.round(v.distance_m)} m</div>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button onClick={() => { setPage(p => Math.max(1, p - 1)); fetchData(); }} style={{ padding: '0.25rem 0.75rem', background: '#E5E7EB', border: 'none', borderRadius: '0.375rem' }}>Prev</button>
        <button onClick={() => { setPage(p => p + 1); fetchData(); }} style={{ padding: '0.25rem 0.75rem', background: '#E5E7EB', border: 'none', borderRadius: '0.375rem' }}>Next</button>
      </div>
    </div>
  );
}
