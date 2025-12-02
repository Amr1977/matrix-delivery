import React, { useEffect } from 'react';

interface PaymentMethod {
  id: string | number;
  payment_method_type: string;
  masked_details: string;
  is_default?: boolean;
}

interface OrderActivity {
  id: string | number;
  order_number?: string;
  title?: string;
  status?: string;
}

interface ProfileOverlayProps {
  profileData: any;
  onClose: () => void;
  API_URL: string;
  token: string | null;
  setProfileData: (updater: any) => void;
  setCurrentUser?: (u: any) => void;
  optimizeAndUploadProfilePicture?: (file: File) => void;
  setError?: (msg: string) => void;
  preferencesData?: any;
  setPreferencesData?: (p: any) => void;
  activityData?: { recentOrders?: OrderActivity[] };
  paymentMethods: PaymentMethod[];
  setPaymentMethods: (updater: (prev: PaymentMethod[]) => PaymentMethod[]) => void;
  favorites?: any[];
  setFavorites?: (f: any[]) => void;
}

const ProfileOverlay: React.FC<ProfileOverlayProps> = ({
  profileData,
  onClose,
  API_URL,
  token,
  setProfileData,
  setCurrentUser,
  optimizeAndUploadProfilePicture,
  setError,
  preferencesData,
  setPreferencesData,
  activityData,
  paymentMethods,
  setPaymentMethods,
  favorites,
  setFavorites
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updateProfile = async (patch: Record<string, any>) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users/me/profile`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const d = await res.json();
      setProfileData((prev: any) => ({ ...prev, ...d.user }));
      setCurrentUser && setCurrentUser(d.user);
    } catch (err: any) {
      setError && setError(err.message || String(err));
    }
  };

  const removePaymentMethod = async (id: string | number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users/me/payment-methods/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setPaymentMethods(prev => prev.filter(p => p.id !== id));
    } catch (err: any) { setError && setError(err.message || String(err)); }
  };

  return (
    <div role="dialog" aria-modal className="modal-overlay" onClick={onClose}>

      <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(1000px, 96%)', maxHeight: '92vh', overflowY: 'auto', padding: 20, border: '1px solid rgba(36,190,121,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(36,190,121,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profileData.profile_picture_url ? <img src={profileData.profile_picture_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 28 }}>👤</div>}
            </div>
            <div style={{ color: '#D1FAE5' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{profileData.name}</div>
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>{profileData.email || profileData.phone || '—'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#9CA3AF', padding: '8px 12px', borderRadius: 8 }}>Close</button>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'linear-gradient(90deg,#24be79,#10b981)', border: 'none', color: '#041014', padding: '9px 14px', borderRadius: 8, fontWeight: 700 }}>Save</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12 }}>
          <aside style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Upload</label>
              <input type="file" accept="image/*" onChange={(e) => e.target.files && optimizeAndUploadProfilePicture && optimizeAndUploadProfilePicture(e.target.files[0])} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Status</label>
              <div style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.02)', color: '#9CA3AF' }}>{profileData.is_verified ? 'Verified' : 'Unverified'}</div>
            </div>

            <div>
              <h4 style={{ margin: 0, color: '#A7F3D0', fontSize: 13 }}>Quick Stats</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#D1FAE5' }}>{profileData.completed_deliveries || profileData.completedDeliveries || 0}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>Deliveries</div>
                </div>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#D1FAE5' }}>{profileData.rating ? Number(profileData.rating).toFixed(1) : '0.0'}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>Rating</div>
                </div>
              </div>
            </div>
          </aside>

          <section style={{ padding: 12, borderRadius: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Full name</label>
                <input value={profileData.name || ''} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} onBlur={() => updateProfile({ name: profileData.name })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', color: '#D1FAE5' }} />
              </div>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Contact</label>
                <input value={profileData.phone || ''} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} onBlur={() => updateProfile({ phone: profileData.phone })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', color: '#D1FAE5' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Language</label>
                <select value={profileData.language || ''} onChange={(e) => updateProfile({ language: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', color: '#D1FAE5' }}>
                  <option value="">Default</option>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                  <option value="tr">Turkish</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Theme</label>
                <select value={profileData.theme || ''} onChange={(e) => updateProfile({ theme: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', color: '#D1FAE5' }}>
                  <option value="">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="matrix">Matrix</option>
                </select>
              </div>
            </div>

            {Array.isArray(profileData.roles) && profileData.roles.includes('driver') && (
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ margin: 0, color: '#A7F3D0' }}>Delivery Agent</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div>
                    <label style={{ color: '#9CA3AF', fontSize: 12 }}>Vehicle type</label>
                    <select value={profileData.vehicle_type || ''} onChange={(e) => updateProfile({ vehicle_type: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', color: '#D1FAE5' }}>
                      <option value="">Select</option>
                      <option value="bike">Bike</option>
                      <option value="car">Car</option>
                      <option value="van">Van</option>
                      <option value="truck">Truck</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#9CA3AF', fontSize: 12 }}>License</label>
                    <input value={profileData.license_number || ''} onChange={(e) => setProfileData({ ...profileData, license_number: e.target.value })} onBlur={() => updateProfile({ license_number: profileData.license_number })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', color: '#D1FAE5' }} />
                  </div>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input id="availability" type="checkbox" checked={!!profileData.is_available} onChange={async (e) => { try { const res = await fetch(`${API_URL}/users/me/availability`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_available: !!e.target.checked }) }); if (res.ok) { const d = await res.json(); setProfileData((prev: any) => ({ ...prev, is_available: d.isAvailable })); } } catch (err: any) { setError && setError(err.message || String(err)); } }} />
                  <label htmlFor="availability" style={{ color: '#9CA3AF' }}>Available</label>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ margin: 0, color: '#A7F3D0' }}>Payment methods</h4>
                <div style={{ marginTop: 8 }}>
                  {paymentMethods.map(pm => (
                    <div key={pm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginTop: 8, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ color: '#D1FAE5' }}>{pm.payment_method_type} • {pm.masked_details} {pm.is_default ? '• Default' : ''}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => removePaymentMethod(pm.id)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', color: '#FCA5A5', padding: '6px 10px', borderRadius: 8 }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ margin: 0, color: '#A7F3D0' }}>Activity</h4>
                <div style={{ marginTop: 8, color: '#9CA3AF' }}>
                  {(activityData?.recentOrders || []).slice(0, 6).map(o => (
                    <div key={o.id} style={{ padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.02)' }}>
                      <div style={{ color: '#D1FAE5' }}>{o.order_number} • {o.title}</div>
                      <div style={{ fontSize: 12 }}>{o.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverlay;
