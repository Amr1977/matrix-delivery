import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from './i18n/i18nContext';

const LanguageSwitcher = ({ locale, changeLocale }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  const current = languages.find(l => l.code === locale) || languages[0];

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        title={t('common.selectLanguage') || 'Select Language'}
        onClick={() => setOpen(!open)}
        style={{
          padding: '0.25rem 0.5rem',
          background: 'rgba(48, 255, 48, 0.1)',
          color: '#30FF30',
          border: '1px solid #30FF30',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '700',
          minWidth: '3rem',
          lineHeight: '1'
        }}
      >
        {current.label}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            background: '#0a0a0a',
            border: '1px solid #30FF30',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
            zIndex: 1000,
            minWidth: '12rem'
          }}
        >
          {languages.map((lang) => (
            <div
              key={lang.code}
              onClick={() => { changeLocale(lang.code); setOpen(false); }}
              style={{
                padding: '0.5rem 0.75rem',
                color: '#30FF30',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(48,255,48,0.08)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {t(lang.nameKey)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
