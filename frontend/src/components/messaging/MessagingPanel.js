import React, { useState } from 'react';
import ConversationsList from './ConversationsList';
import ChatInterface from './ChatInterface';
import { useI18n } from '../../i18n/i18nContext';

const MessagingPanel = () => {
  const { t } = useI18n();
  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
  };

  return (
    <div style={{
      height: '600px',
      border: '1px solid #E5E7EB',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      background: '#FFF',
      display: 'flex'
    }}>
      {/* Conversations Sidebar */}
      <div style={{
        width: selectedConversation ? '0' : '320px',
        borderRight: selectedConversation ? 'none' : '1px solid #E5E7EB',
        transition: 'width 0.3s ease',
        overflow: 'hidden'
      }}>
        <ConversationsList onSelectConversation={handleSelectConversation} />
      </div>

      {/* Chat Interface */}
      <div style={{
        flex: 1,
        position: 'relative'
      }}>
        {selectedConversation && (
          <>
            {/* Back button for mobile */}
            <div style={{
              position: 'absolute',
              top: '0.5rem',
              left: '0.5rem',
              zIndex: 10,
              display: window.innerWidth < 768 ? 'block' : 'none'
            }}>
              <button
                onClick={handleBackToConversations}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                ← {t('messages.back')}
              </button>
            </div>

            <ChatInterface conversation={selectedConversation} />
          </>
        )}

        {!selectedConversation && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B7280'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: '0.5rem'
              }}>
                {t('messages.selectConversation')}
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
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
