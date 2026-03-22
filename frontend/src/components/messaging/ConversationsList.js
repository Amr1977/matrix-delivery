import React, { useEffect } from 'react';
import useMessaging from '../../hooks/useMessaging';
import { useI18n } from '../../i18n/i18nContext';

const ConversationsList = ({ onSelectConversation }) => {
  const { t } = useI18n();
  const {
    conversations,
    currentConversation,
    loading,
    error,
    fetchConversations,
    unreadCount
  } = useMessaging();

  // Matrix theme colors
  const theme = {
    bg: '#001100',
    text: '#00FF00',
    dimText: '#00AA00',
    border: '#00AA00',
    accent: '#00FF00',
    inputBg: '#003300',
    hoverBg: '#002200',
    selectedBg: '#003300'
  };

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading && conversations.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: theme.dimText
      }}>
        {t('messages.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1rem',
        background: '#330000',
        color: '#FF6666',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        border: '1px solid #FF0000'
      }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: theme.bg
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: `1px solid ${theme.border}`,
        background: theme.bg
      }}>
        <h2 style={{
          fontSize: isMobile ? '1rem' : '1.125rem',
          fontWeight: '600',
          color: theme.text,
          margin: 0
        }}>
          {t('messages.conversations')}
          {unreadCount > 0 && (
            <span style={{
              background: '#FF0000',
              color: 'white',
              borderRadius: '9999px',
              padding: '0.125rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              marginLeft: '0.5rem'
            }}>
              {unreadCount}
            </span>
          )}
        </h2>
      </div>

      {/* Conversations List */}
      <div style={{
        flex: 1,
        overflowY: 'auto'
      }}>
        {conversations.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1rem',
            textAlign: 'center',
            color: theme.dimText
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: theme.dimText }}>💬</div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: theme.text,
              marginBottom: '0.5rem'
            }}>
              {t('messages.noConversations')}
            </h3>
            <p style={{ fontSize: '0.875rem', color: theme.dimText }}>
              {t('messages.startConversation')}
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.orderId}
              onClick={() => onSelectConversation(conversation)}
              style={{
                padding: isMobile ? '0.75rem' : '1rem',
                borderBottom: `1px solid ${theme.border}`,
                cursor: 'pointer',
                background: currentConversation?.orderId === conversation.orderId
                  ? theme.selectedBg
                  : theme.bg,
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (currentConversation?.orderId !== conversation.orderId) {
                  e.target.style.background = theme.hoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (currentConversation?.orderId !== conversation.orderId) {
                  e.target.style.background = theme.bg;
                }
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}>
                  {conversation.customerName}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: theme.dimText,
                  marginLeft: '0.5rem'
                }}>
                  {formatTime(conversation.lastMessageAt)}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'end'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: theme.dimText,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  marginRight: '0.5rem'
                }}>
                  {conversation.lastMessageContent ?
                    truncateMessage(conversation.lastMessageContent) :
                    t('messages.noMessages')
                  }
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {conversation.unreadCount > 0 && (
                    <span style={{
                      background: '#FF0000',
                      color: 'white',
                      borderRadius: '9999px',
                      padding: '0.125rem 0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      minWidth: '1.25rem',
                      textAlign: 'center'
                    }}>
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.75rem',
                    color: theme.dimText,
                    textTransform: 'capitalize'
                  }}>
                    {conversation.orderStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationsList;
