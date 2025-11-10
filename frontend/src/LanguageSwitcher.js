import React from 'react';

const LanguageSwitcher = ({ locale, changeLocale }) => {
  const languages = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'es', label: 'ES', name: 'Español' },
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'zh', label: '中文', name: '中文' },
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'pt', label: 'PT', name: 'Português' },
    { code: 'ar', label: 'ع', name: 'العربية' }
  ];

  return (
    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLocale(lang.code)}
          title={lang.name}
          style={{
            padding: '0.5rem 0.75rem',
            background: locale === lang.code ? '#4F46E5' : 'rgba(48, 255, 48, 0.1)',
            color: locale === lang.code ? 'white' : '#30FF30',
            border: '1px solid #30FF30',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            minWidth: '2.5rem'
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
