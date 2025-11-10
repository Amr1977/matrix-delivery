import React from 'react';

const LanguageSwitcher = ({ locale, changeLocale }) => {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button
        onClick={() => changeLocale('en')}
        style={{
          padding: '0.5rem 0.75rem',
          background: locale === 'en' ? '#4F46E5' : 'rgba(48, 255, 48, 0.1)',
          color: locale === 'en' ? 'white' : '#30FF30',
          border: '1px solid #30FF30',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}
      >
        EN
      </button>
      <button
        onClick={() => changeLocale('ar')}
        style={{
          padding: '0.5rem 0.75rem',
          background: locale === 'ar' ? '#4F46E5' : 'rgba(48, 255, 48, 0.1)',
          color: locale === 'ar' ? 'white' : '#30FF30',
          border: '1px solid #30FF30',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}
      >
        ع
      </button>
    </div>
  );
};

export default LanguageSwitcher;
