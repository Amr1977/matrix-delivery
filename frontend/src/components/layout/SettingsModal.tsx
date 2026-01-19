import React from 'react';
import LanguageSwitcher from '../../LanguageSwitcher';
import { useI18n } from '../../i18n/i18nContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    locale: string;
    changeLocale: (locale: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    locale,
    changeLocale
}) => {
    const { t } = useI18n();
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div style={{
                background: '#000',
                border: '3px solid var(--matrix-bright-green)',
                borderRadius: '0.5rem',
                boxShadow: '0 0 20px var(--matrix-bright-green)',
                width: '100%',
                maxWidth: '32rem',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '2px solid var(--matrix-bright-green)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0, 17, 0, 0.8)'
                }}>
                    <h2 style={{
                        margin: 0,
                        color: 'var(--matrix-bright-green)',
                        fontSize: '1.5rem',
                        fontFamily: 'Consolas, Monaco, Courier New, monospace',
                        textShadow: '0 0 10px var(--matrix-bright-green)',
                        fontWeight: 'bold'
                    }}>
                        ⚙️ {t('settings.title')}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--matrix-bright-green)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '0.375rem',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontFamily: 'Consolas, Monaco, Courier New, monospace',
                            fontSize: '1rem',
                            boxShadow: '0 0 10px var(--matrix-bright-green)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 0 15px var(--matrix-bright-green)'}
                        onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 0 10px var(--matrix-bright-green)'}
                    >
                        ✕ {t('settings.close')}
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    flex: 1,
                    background: '#000'
                }}>
                    <div style={{
                        background: 'rgba(0, 17, 0, 0.6)',
                        border: '2px solid var(--matrix-bright-green)',
                        borderRadius: '0.5rem',
                        padding: '1.5rem',
                        marginBottom: '1rem'
                    }}>
                        <h3 style={{
                            margin: '0 0 1rem 0',
                            color: 'var(--matrix-bright-green)',
                            fontSize: '1.25rem',
                            fontFamily: 'Consolas, Monaco, Courier New, monospace',
                            textShadow: '0 0 8px var(--matrix-bright-green)',
                            fontWeight: 'bold'
                        }}>
                            🌐 {t('settings.languageSettings')}
                        </h3>
                        <p style={{
                            margin: '0 0 1rem 0',
                            color: '#9CA3AF',
                            fontSize: '0.875rem',
                            fontFamily: 'Consolas, Monaco, Courier New, monospace',
                            lineHeight: '1.5'
                        }}>
                            {t('settings.languageDesc')}
                        </p>
                        <div style={{
                            background: '#000',
                            border: '1px solid var(--matrix-bright-green)',
                            borderRadius: '0.375rem',
                            padding: '1rem',
                            boxShadow: 'inset 0 0 10px rgba(0, 255, 0, 0.1)'
                        }}>
                            <LanguageSwitcher
                                locale={locale}
                                changeLocale={changeLocale}
                            />
                        </div>
                    </div>

                    {/* Placeholder for future settings */}
                    <div style={{
                        background: 'rgba(0, 17, 0, 0.4)',
                        border: '1px solid var(--matrix-green)',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            margin: 0,
                            color: 'var(--matrix-green)',
                            fontSize: '0.875rem',
                            fontFamily: 'Consolas, Monaco, Courier New, monospace',
                            fontStyle: 'italic'
                        }}>
                            🔧 {t('settings.comingSoon')}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--matrix-green)',
                    background: 'rgba(0, 17, 0, 0.8)',
                    textAlign: 'center'
                }}>
                    <p style={{
                        margin: 0,
                        color: '#6B7280',
                        fontSize: '0.75rem',
                        fontFamily: 'Consolas, Monaco, Courier New, monospace'
                    }}>
                        {t('settings.footer')} • v1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
