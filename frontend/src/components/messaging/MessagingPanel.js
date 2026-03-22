import React, { useState, useEffect } from 'react';
import ConversationsList from './ConversationsList';
import ChatInterface from './ChatInterface';
import { useI18n } from '../../i18n/i18nContext';

const MessagingPanel = () => {
  const { t } = useI18n();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Matrix theme colors
  const theme = {
    bg: '#001100',
    text: '#00FF00',
    dimText: '#00AA00',
    border: '#00AA00',
    accent: '#00FF00',
    inputBg: '#003300'
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
  };

  return (
    <div style={{
      height: isMobile ? 'calc(100vh - 120px)' : '600px',
      border: `1px solid ${theme.border}`,
      borderRadius: '0.5rem',
      overflow: 'hidden',
      background: theme.bg,
      display: 'flex'
    }}>
      {/* Conversations Sidebar */}
      <div style={{
        width: selectedConversation ? (isMobile ? '0' : '280px') : (isMobile ? '100%' : '320px'),
        borderRight: selectedConversation ? 'none' : `1px solid ${theme.border}`,
        transition: 'width 0.3s ease',
        overflow: 'hidden'
      }}>
        <ConversationsList onSelectConversation={handleSelectConversation} />
      </div>

      {/* Chat Interface */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: selectedConversation ? 'flex' : (isMobile ? 'none' : 'flex'),
        flexDirection: 'column'
      }}>
        {selectedConversation && (
          <>
            {/* Back button for mobile */}
            {isMobile && (
              <div style={{
                position: 'absolute',
                top: '0.5rem',
                left: '0.5rem',
                zIndex: 10
              }}>
                <button
                  onClick={handleBackToConversations}
                  style={{
                    background: theme.inputBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: theme.accent
                  }}
                >
                  ← {t('messages.back')}
                </button>
              </div>
            )}

            <ChatInterface conversation={selectedConversation} />
          </>
        )}

        {!selectedConversation && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.dimText
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', color: theme.dimText }}>💬</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '0.5rem'
              }}>
                {t('messages.selectConversation')}
              </h3>
              <p style={{ fontSize: '0.875rem', color: theme.dimText }}>
                {t('messages.chooseConversation')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingPanel;
