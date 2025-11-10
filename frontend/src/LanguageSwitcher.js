import React from 'react';

const LanguageSwitcher = ({ locale, changeLocale }) => {
  const languages = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'es', label: 'ES', name: 'Español' },
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'zh', label: '中文', name: '中文' },
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'pt', label: 'PT', name: 'Português' },
    { code: 'ar', label: 'ع', name: 'العربية' },
    { code: 'ru', label: 'RU', name: 'Русский' },
    { code: 'ja', label: 'JA', name: '日本語' },
    { code: 'tr', label: 'TR', name: 'Türkçe' }
  ];

  return (
    <select
      value={locale}
      onChange={(e) => changeLocale(e.target.value)}
      title="Select Language"
      style={{
        padding: '0.5rem 0.75rem',
        background: 'rgba(48, 255, 48, 0.1)',
        color: '#30FF30',
        border: '1px solid #30FF30',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '600',
        minWidth: '4rem'
      }}
    >
      {languages.map((lang) => (
        <option
          key={lang.code}
          value={lang.code}
          title={lang.name}
          style={{
            background: '#000',
            color: '#30FF30'
          }}
        >
          {lang.label} - {lang.name}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
