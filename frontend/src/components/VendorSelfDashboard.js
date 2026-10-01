import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/i18nContext';
import api from '../api';
import { v4 as uuidv4 } from 'uuid';

export default function VendorSelfDashboard({ apiUrl, token }) {
  const { t, locale } = useI18n();
  const [vendor, setVendor] = useState(null);
  const [form, setForm] = useState({ name: '', city: '', country: '', latitude: '', longitude: '' });
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Branding state
  const [branding, setBranding] = useState({
    logo_url: vendor?.logo_url || '',
    logo_public_id: vendor?.logo_public_id || '',
    cover_image_url: vendor?.cover_image_url || '',
    cover_public_id: vendor?.cover_public_id || ''
  });
  const [uploadingBranding, setUploadingBranding] = useState(false);
  const [uploadingImageType, setUploadingImageType] = useState('logo'); // 'logo' or 'cover'

  // Gallery state
  const [storeGallery, setStoreGallery] = useState([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deleteGalleryImageId, setDeleteGalleryImageId] = useState(null);

  // Per-item image state
  const [itemImageUploads, setItemImageUploads] = useState({}); // itemId -> { files, progress }
  const [uploadingItemImage, setUploadingItemImage] = useState(null); // itemId
  const [itemImageDeletions, setItemImageDeletions] = useState({}); // itemId -> [imageIds]

  const loadSelf = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get('/vendors/self');
      setVendor(d.vendor || d);
      
      // Initialize branding from vendor data
      setBranding({
        logo_url: d.vendor?.logo_url || '',
        logo_public_id: d.vendor?.logo_public_id || '',
        cover_image_url: d.vendor?.cover_image_url || '',
        cover_public_id: d.vendor?.cover_public_id || ''
      });
      
      // Load store gallery
      await loadStoreGallery();
      
      // Load items with their images
      await loadItemsWithImages();
    } catch (e) {
      if (e.message.includes('404')) {
        setVendor(null);
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItemsWithImages = useCallback(async () => {
    if (!vendor || !vendor.id) { setItems([]); return; }
    try {
      const d = await api.get(`/vendors/${vendor.id}/items`);
      setItems(Array.isArray(d.items) ? d.items : d);
    } catch (e) { }
  }, [vendor]);

  const loadStoreGallery = useCallback(async () => {
    if (!vendor || !vendor.id) return;
    try {
      const images = await api.get(`/marketplace/stores/${vendor.id}/gallery`);
      setStoreGallery(images.images || []);
    } catch (e) { }
  }, [vendor]);

  // Vendor creation/update
  const createSelf = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.post('/vendors/self', {
        name: form.name,
        city: form.city,
        country: form.country,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined
      });
      setVendor(d.vendor || d);
    } catch (e) {
      setError('Create failed');
    } finally {
      setLoading(false);
    }
  };

  const updateSelf = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.put('/vendors/self', {
        name: form.name,
        city: form.city,
        country: form.country,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null
      });
      setVendor(d.vendor || d);
    } catch (e) {
      setError('Update failed');
    } finally {
      setLoading(false);
    }
  };

  // Item management
  const addItem = async () => {
    if (!vendor || !vendor.id) return;
    try {
      setLoading(true);
      await api.post(`/vendors/${vendor.id}/items`, {
        name: newItem.name,
        price: parseFloat(newItem.price)
      });
      await loadItemsWithImages();
      setNewItem({ name: '', price: '' });
      setLoading(false);
    } catch (e) {
      setError(e.error || t('common.error'));
      setLoading(false);
    }
  };

  const deactivateItem = async (itemId) => {
    try {
      await api.post(`/vendors/${vendor.id}/items/${itemId}/deactivate`);
      await loadItemsWithImages();
    } catch (e) { }
  };

  useEffect(() => { loadSelf(); }, [loadSelf]);
  useEffect(() => { loadItemsWithImages(); }, [loadItemsWithImages]);
  useEffect(() => { loadStoreGallery(); }, [loadStoreGallery]);

  // Branding methods
  const updateBranding = async () => {
    setUploadingBranding(true);
    setError('');
    try {
      const brandingData = {
        logo_url: branding.logo_url,
        logo_public_id: branding.logo_public_id,
        cover_image_url: branding.cover_image_url,
        cover_public_id: branding.cover_public_id
      };
      const updated = await api.put(`/marketplace/stores/${vendor.id}/branding`, brandingData);
      setBranding(prev => ({ ...prev, ...brandingData }));
      setError(t('common.success'));
    } catch (e) {
      setError(e.error || t('common.error'));
    } finally {
      setUploadingBranding(false);
    }
  };

  const handleBrandingImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImageType(type);
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(jpe?g|png|webp)$/)) {
      setError(t('common.invalidFileType'));
      return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('common.fileTooLarge', { maxMB: 10 }));
      return;
    }
    
    // Store file and upload immediately
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload directly via API - we'll use the store's addGalleryImage endpoint
    // But first, let's preview it locally
    const reader = new FileReader();
    reader.onload = (e) => {
      // We'll upload via the API endpoint
      uploadGalleryImage(file, type);
    };
    reader.readAsDataURL(file);
  };

  const uploadGalleryImage = async (file, type) => {
    setUploadingGallery(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Use the API to upload - this will go through our backend which uses Cloudinary
      const response = await api.addStoreGalleryImage(vendor.id, formData);
      setStoreGallery(prev => [...prev, response]);
      setError(t('common.success'));
    } catch (e) {
      setError(e.error || t('common.error'));
    } finally {
      setUploadingGallery(false);
    }
  };

  const deleteGalleryImage = async (imageId) => {
    setDeleteGalleryImageId(imageId);
    setError('');
    
    try {
      await api.deleteStoreGalleryImage(vendor.id, imageId);
      setStoreGallery(prev => prev.filter(img => img.id !== imageId));
      setError(t('common.success'));
    } catch (e) {
      setError(e.error || t('common.error'));
    } finally {
      setDeleteGalleryImageId(null);
    }
  };

  const reorderGalleryImages = async (imageOrders) => {
    setError('');
    try {
      await api.reorderStoreGalleryImages(vendor.id, { imageOrders });
      setStoreGallery(prev => [...prev]); // Refresh will happen via effect
      setError(t('common.success'));
    } catch (e) {
      setError(e.error || t('common.error'));
    }
  };

  const setPrimaryGalleryImage = async (imageId) => {
    setError('');
    try {
      await api.setStoreGalleryPrimary(vendor.id, imageId);
      setStoreGallery(prev => prev.map(img => 
        img.id === imageId ? { ...img, is_primary: true } : { ...img, is_primary: false }
      ));
      setError(t('common.success'));
    } catch (e) {
      setError(e.error || t('common.error'));
    }
  };

  // Item image upload methods
  const handleItemImageChange = (e, itemId) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setItemImageUploads(prev => ({
      ...prev,
      [itemId]: { files, progress: 0 }
    }));
    
    // Upload each file
    Array.from(files).forEach((file, index) => {
      uploadItemImage(itemId, file, index);
    });
  };

  const uploadItemImage = async (itemId, file, index) => {
    if (itemImageUploads[itemId] && itemImageUploads[itemId].progress > 0) return;
    
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.uploadItemImage(itemId, formData);
      setItemImageUploads(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], progress: 100, uploadedImage: response.image }
      }));
      
      // Refresh items to show new image
      await loadItemsWithImages();
      setError(t('common.success'));
    } catch (e) {
      setItemImageUploads(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], error: e.error || t('common.error') }
      }));
      setError(e.error || t('common.error'));
    }
  };

  const deleteItemImage = async (itemId, imageId) => {
    setError('');
    try {
      await api.deleteItemImage(itemId, imageId);
      setItemImageUploads(prev => {
        const newUploads = { ...prev };
        delete newUploads[itemId];
        return newUploads;
      });
      await loadItemsWithImages();
      setError(t('common.success'));
    } catch (e) {
      setError(e.error || t('common.error'));
    }
  };

  const setItemPrimaryImage = async (itemId, imageId) => {
    setError('');
    try {
      await api.setItemImagePrimary(itemId, imageId);
      await loadItemsWithImages();
      setError(t('common.success'));
    } catch (e) {
      setError(e.error || t('common.error'));
    }
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '1rem', background: '#F9FAFB' }}>
      {error && <div style={{ color: '#DC2626', marginBottom: '1rem' }}>{error}</div>}
      {loading && <div>{t('common.loading')}</div>}
      
      {!vendor && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('common.vendorName')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t('orders.city')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder={t('orders.country')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder={t('common.lat')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
            <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder={t('common.lng')} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
          </div>
          {/* eslint-disable-next-line no-undef */}
<button onClick={createSelf} style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem' }}>{t('common.createVendor')}</button>
        </div>
      )}
      
      {vendor && (
        <div>
          <div style={{ marginBottom: '1rem', fontWeight: 700 }}>{vendor.name}</div>
          
          {/* Branding Section - Logo and Cover */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#F3F4F6', borderRadius: '0.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{t('common.branding')}</div>
            
            {/* Logo Upload */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('common.logo')}</label>
              
              {uploadingBranding ? (
                <div>{t('common.loading')}...</div>
              ) : null}
              
              <input
                type="file"
                onChange={(e) => handleBrandingImageChange(e, 'logo')}
                accept="image/*,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                aria-label={t('common.upload')}
              />
              <button
                onClick={(e) => e.target.previousElementSibling.click()}
                style={{ 
                  border: '1px solid #D1D5DB', 
                  borderRadius: '0.375rem', 
                  padding: '0.5rem 1rem', 
                  background: uploadingBranding ? '#EF4444' : '#4F46E5', 
                  color: 'white', 
                  cursor: uploadingBranding ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
                disabled={uploadingBranding}
              >
                {uploadingBranding ? t('common.uploading') : t('common.uploadLogo')}
              </button>
            </div>
            
            {/* Logo Preview */}
            {branding.logo_url && (
              <div style={{ 
                width: '100%', 
                height: '150px', 
                margin: '0.5rem 0', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                borderRadius: '0.375rem',
                border: '1px solid #E5E7EB'
              }} 
                style={{ backgroundImage: `url('${branding.logo_url}')` }} />
            )}
            
            {/* Cover/Image Upload */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('common.coverImage')}</label>
              
              <input
                type="file"
                onChange={(e) => handleBrandingImageChange(e, 'cover')}
                accept="image/*,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                aria-label={t('common.upload')}
              />
              <button
                onClick={(e) => e.target.previousElementSibling.click()}
                style={{ 
                  border: '1px solid #D1D5DB', 
                  borderRadius: '0.375rem', 
                  padding: '0.5rem 1rem', 
                  background: uploadingBranding ? '#EF4444' : '#4F46E5', 
                  color: 'white', 
                  cursor: uploadingBranding ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
                disabled={uploadingBranding}
              >
                {uploadingBranding ? t('common.uploading') : t('common.uploadCover')}
              </button>
            </div>
            
            {/* Cover Preview */}
            {branding.cover_image_url && (
              <div style={{ 
                width: '100%', 
                height: '200px', 
                margin: '0.5rem 0', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                borderRadius: '0.375rem',
                border: '1px solid #E5E7EB'
              }} 
                style={{ backgroundImage: `url('${branding.cover_image_url}')` }} />
            )}
            
            {/* Action buttons for branding */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={updateBranding}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                disabled={uploadingBranding}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
          
          {/* Store Gallery Section */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#F3F4F6', borderRadius: '0.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{t('common.storeGallery')}</div>
            
            {uploadingGallery ? (
              <div>{t('common.loading')}...</div>
            ) : null}
            
            <div style={{ marginBottom: '1rem' }}>
              <label>{t('common.addGalleryImage')}</label>
              <input
                type="file"
                onChange={(e) => uploadGalleryImage(e.target.files[0], 'gallery')}
                accept="image/*,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
              />
              <button
                onClick={(e) => e.target.previousElementSibling.click()}
                style={{
                  border: '1px solid #3B82F6',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 1rem',
                  background: '#3B82F6',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {t('common.upload')}
              </button>
            </div>
            
            {storeGallery.length === 0 ? (
              <p style={{ color: '#6B7280', fontStyle: 'italic' }}>{t('common.noImagesYet')}</p>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                gap: '0.5rem'
              }}>
                {storeGallery.map(img => (
                  <div
                    key={img.id}
                    style={{
                      position: 'relative',
                      borderRadius: '0.375rem',
                      overflow: 'hidden',
                      background: '#F3F4F6'
                    }}
                  >
                    <img
                      src={img.image_url}
                      alt={t('common.galleryImage')}
                      style={{
                        width: '100%',
                        height: '80px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    {img.is_primary && (
                      <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#10B981',
                        color: 'white',
                        borderRadius: '9999px',
                        padding: '2px 6px',
                        fontSize: '0.65rem',
                        fontWeight: 600
                      }}>
                        {t('common.primary')}
                      </span>
                    )}
                    <button
                      onClick={() => deleteGalleryImage(img.id)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        borderRadius: '9999px',
                        padding: '2px 6px',
                        fontSize: '0.65rem'
                      }}
                      title={t('common.delete')}
                    >
                      ×
                    </button>
                    <button
                      onClick={() => setPrimaryGalleryImage(img.id)}
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        background: img.is_primary ? '#DC2626' : '#10B981',
                        color: 'white',
                        borderRadius: '9999px',
                        padding: '2px 6px',
                        fontSize: '0.65rem'
                      }}
                      title={img.is_primary ? t('common.removePrimary') : t('common.setAsPrimary')}
                    >
                      {img.is_primary ? t('common.remove') : t('common.setAsPrimary')}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Reorder functionality */}
            {storeGallery.length > 1 && (
              <div style={{ marginTop: '1rem' }}>
                <button
                  onClick={() => reorderGalleryImages(storeGallery.map(img => ({ id: img.id, display_order: img.display_order })))}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#8B5CF6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.reorder')}
                </button>
              </div>
            )}
          </div>
          
          {/* Per-Item Photo Manager */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#F3F4F6', borderRadius: '0.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{t('itemManagement')}</div>
            
            {/* Add new item */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder={t('common.itemName')}
                  style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
                <input
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  type="number"
                  placeholder={t('orders.price')}
                  style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
              </div>
              <button
                onClick={addItem}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#4F46E5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                {t('common.save')}
              </button>
            </div>
            
            {/* Items list with image management */}
            {items.map(it => (
              <div
                key={it.id}
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{it.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                  {typeof it.price === 'number' ? t('orders.price') : t('common.price')}: {typeof it.price === 'number' ? it.price.toFixed(2) : it.price}
                </div>
                
                {/* Item images gallery */}
                {it.images && it.images.length > 0 ? (
                  <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                    {it.images.map(img => (
                      <div
                        key={img.id}
                        style={{
                          position: 'relative',
                          borderRadius: '0.375rem',
                          overflow: 'hidden',
                          background: '#F3F4F6'
                        }}
                      >
                        <img
                          src={img.image_url}
                          alt={t('common.itemImage')}
                          style={{
                            width: '100%',
                            height: '60px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                        {img.is_primary && (
                          <span style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: '#10B981',
                            color: 'white',
                            borderRadius: '9999px',
                            padding: '1px 4px',
                            fontSize: '0.6rem',
                            fontWeight: 600
                          }}>
                            {t('common.primary')}
                          </span>
                        )}
                        <button
                          onClick={() => deleteItemImage(it.id, img.id)}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: '2px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            borderRadius: '9999px',
                            padding: '1px 4px',
                            fontSize: '0.6rem'
                          }}
                          title={t('common.delete')}
                        >
                          ×
                        </button>
                        <button
                          onClick={() => setItemPrimaryImage(it.id, img.id)}
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            background: img.is_primary ? '#DC2626' : '#10B981',
                            color: 'white',
                            borderRadius: '9999px',
                            padding: '1px 4px',
                            fontSize: '0.6rem'
                          }}
                          title={img.is_primary ? t('common.removePrimary') : t('common.setAsPrimary')}
                        >
                          {img.is_primary ? t('common.remove') : t('common.setAsPrimary')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#6B7280', fontStyle: 'italic', fontSize: '0.875rem' }}>{t('common.noImages')}</p>
                )}
                
                {/* Item image upload button */}
                <div style={{ marginTop: '0.5rem' }}>
                  <input
                    type="file"
                    onChange={(e) => handleItemImageChange(e, it.id)}
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                  />
                  <button
                    style={{
                      marginTop: '0.25rem',
                      padding: '0.375rem 0.75rem',
                      background: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.3125rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    {t('common.addImages')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}