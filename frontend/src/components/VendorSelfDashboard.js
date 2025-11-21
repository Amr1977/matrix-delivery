import React, { useEffect, useState, useCallback, useMemo } from 'react';

export default function VendorSelfDashboard({ apiUrl, token }) {
  const [vendor, setVendor] = useState(null);
  const [form, setForm] = useState({ name: '', city: '', country: '', latitude: '', longitude: '' });
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const loadSelf = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/vendors/self`, { headers });
      if (res.status === 404) { setVendor(null); } else if (res.ok) { const d = await res.json(); setVendor(d.vendor || d); setForm({ name: d.vendor?.name || d.name || '', city: d.vendor?.city || d.city || '', country: d.vendor?.country || d.country || '', latitude: (d.vendor?.latitude ?? d.latitude ?? '') || '', longitude: (d.vendor?.longitude ?? d.longitude ?? '') || '' }); }
    } catch (e) { setError('Failed'); } finally { setLoading(false); }
  }, [apiUrl, headers]);

  const loadItems = useCallback(async () => {
    if (!vendor || !vendor.id) { setItems([]); return; }
    try {
      const res = await fetch(`${apiUrl}/vendors/${vendor.id}/items`, { headers });
      if (res.ok) { const d = await res.json(); setItems(Array.isArray(d.items) ? d.items : d); }
    } catch (e) {}
  }, [apiUrl, headers, vendor]);

  useEffect(() => { loadSelf(); }, [loadSelf]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const createSelf = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/vendors/self`, { method: 'POST', headers, body: JSON.stringify({ name: form.name, city: form.city, country: form.country, latitude: form.latitude ? parseFloat(form.latitude) : undefined, longitude: form.longitude ? parseFloat(form.longitude) : undefined }) });
      if (res.ok) { const d = await res.json(); setVendor(d.vendor || d); }
      else { setError('Create failed'); }
    } catch (e) { setError('Network error'); } finally { setLoading(false); }
  };

  const updateSelf = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/vendors/self`, { method: 'PUT', headers, body: JSON.stringify({ name: form.name, city: form.city, country: form.country, latitude: form.latitude ? parseFloat(form.latitude) : null, longitude: form.longitude ? parseFloat(form.longitude) : null }) });
      if (res.ok) { const d = await res.json(); setVendor(d.vendor || d); }
      else { setError('Update failed'); }
    } catch (e) { setError('Network error'); } finally { setLoading(false); }
  };

  const addItem = async () => {
    if (!vendor || !vendor.id) return;
    try {
      const res = await fetch(`${apiUrl}/vendors/${vendor.id}/items`, { method: 'POST', headers, body: JSON.stringify({ name: newItem.name, price: parseFloat(newItem.price) }) });
      if (res.ok) { await loadItems(); setNewItem({ name: '', price: '' }); }
    } catch (e) {}
  };

  const updateItemPrice = async (itemId, price) => {
    try {
      const res = await fetch(`${apiUrl}/vendors/${vendor.id}/items/${itemId}`, { method: 'PUT', headers, body: JSON.stringify({ price: parseFloat(price) }) });
      if (res.ok) { await loadItems(); }
    } catch (e) {}
  };

  const deactivateItem = async (itemId) => {
    try {
      const res = await fetch(`${apiUrl}/vendors/${vendor.id}/items/${itemId}/deactivate`, { method: 'POST', headers });
      if (res.ok) { await loadItems(); }
    } catch (e) {}
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '1rem', background: '#F9FAFB' }}>
      {error && <div style={{ color: '#DC2626' }}>{error}</div>}
      {loading && <div>Loading...</div>}
      {!vendor && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vendor name" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Lat" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Lng" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
          </div>
          <button onClick={createSelf} style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Create Vendor</button>
        </div>
      )}
      {vendor && (
        <div>
          <div style={{ marginBottom: '0.5rem', fontWeight: 700 }}>{vendor.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vendor name" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Lat" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Lng" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
          </div>
          <button onClick={updateSelf} style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Save</button>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Items</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Item name" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
              <input value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder="Price" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
              <button onClick={addItem} style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {items.map(it => (
                <div key={it.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600 }}>{it.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#374151' }}>{typeof it.price === 'number' ? it.price.toFixed(2) : it.price}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input defaultValue={it.price} onBlur={(e) => updateItemPrice(it.id, e.target.value)} style={{ padding: '0.25rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', width: '6rem' }} />
                    <button onClick={() => deactivateItem(it.id)} style={{ padding: '0.25rem 0.75rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Deactivate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
