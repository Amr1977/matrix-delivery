import React from 'react';
import { useI18n } from './i18n/i18nContext';

const LanguageSwitcher = ({ locale, changeLocale }) => {
  const { t } = useI18n();

  const languages = [
    { code: 'en', label: 'EN', nameKey: 'languages.english' },
    { code: 'es', label: 'ES', nameKey: 'languages.spanish' },
    { code: 'fr', label: 'FR', nameKey: 'languages.french' },
    { code: 'zh', label: '中文', nameKey: 'languages.chinese' },
    { code: 'de', label: 'DE', nameKey: 'languages.german' },
    { code: 'pt', label: 'PT', nameKey: 'languages.portuguese' },
    { code: 'ar', label: 'ع', nameKey: 'languages.arabic' },
    { code: 'ru', label: 'RU', nameKey: 'languages.russian' },
    { code: 'ja', label: 'JA', nameKey: 'languages.japanese' },
    { code: 'tr', label: 'TR', nameKey: 'languages.turkish' },
    { code: 'ur', label: 'UR', nameKey: 'languages.urdu' },
    { code: 'hi', label: 'HI', nameKey: 'languages.hindi' }
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
          title={t(lang.nameKey)}
          style={{
            background: '#000',
            color: '#30FF30'
          }}
        >
          {lang.label} - {t(lang.nameKey)}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
