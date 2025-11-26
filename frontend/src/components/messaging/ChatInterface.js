import React, { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../../hooks/useMessaging';
import { useI18n } from '../../i18n/i18nContext';

const ChatInterface = ({ conversation }) => {
  const { t } = useI18n();
  const {
    messages,
    loading,
    error,
    sendMessage,
    fetchOrderMessages,
    markMessagesRead,
    joinConversation,
    leaveConversation
  } = useMessaging();

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversation) {
      fetchOrderMessages(conversation.orderId);
      joinConversation(conversation.orderId);
      markMessagesRead(conversation.orderId);
    }

    return () => {
      if (conversation) {
        leaveConversation(conversation.orderId);
      }
    };
  }, [conversation, fetchOrderMessages, joinConversation, leaveConversation, markMessagesRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(conversation.orderId, conversation.customerName, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('common.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('common.yesterday');
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!conversation) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
          <p>{t('messages.selectConversation')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #E5E7EB',
        background: '#F9FAFB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#4F46E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.125rem',
            fontWeight: '600'
          }}>
            {conversation.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1F2937',
              margin: 0
            }}>
              {conversation.customerName}
            </h3>
            <p style={{
              fontSize: '0.75rem',
              color: '#6B7280',
              margin: '0.25rem 0 0 0'
            }}>
              {conversation.pickupAddress} → {conversation.deliveryAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        background: '#F9FAFB'
      }}>
        {loading && messages.length === 0 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem',
            color: '#6B7280'
          }}>
            {t('messages.loading')}
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💭</div>
            <p>{t('messages.noMessages')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {messages.map((message, index) => {
              const showDateSeparator = index === 0 ||
                formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);

              return (
                <React.Fragment key={message.id}>
                  {showDateSeparator && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      margin: '1rem 0'
                    }}>
                      <span style={{
                        background: '#E5E7EB',
                        color: '#6B7280',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: message.sender.name === conversation.customerName ? 'flex-start' : 'flex-end'
                  }}>
                    <div style={{
                      maxWidth: '70%',
                      background: message.sender.name === conversation.customerName ? '#FFF' : '#4F46E5',
                      color: message.sender.name === conversation.customerName ? '#1F2937' : '#FFF',
                      padding: '0.75rem 1rem',
                      borderRadius: '1rem',
                      borderBottomLeftRadius: message.sender.name === conversation.customerName ? '0.25rem' : '1rem',
                      borderBottomRightRadius: message.sender.name !== conversation.customerName ? '0.25rem' : '1rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      position: 'relative'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        lineHeight: '1.25'
                      }}>
                        {message.content}
                      </p>
                      <span style={{
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        marginTop: '0.25rem',
                        display: 'block'
                      }}>
                        {formatTime(message.createdAt)}
                        {message.isRead && message.sender.name !== conversation.customerName && (
                          <span style={{ marginLeft: '0.25rem' }}>✓✓</span>
                        )}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #E5E7EB',
        background: '#FFF'
      }}>
        <form onSubmit={handleSendMessage} style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: 1 }}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t('messages.typeMessage')}
              style={{
                width: '100%',
                minHeight: '40px',
                maxHeight: '120px',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                outline: 'none',
                resize: 'none',
                fontSize: '0.875rem',
                fontFamily: 'inherit'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            style={{
              padding: '0.75rem',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              opacity: !newMessage.trim() || sending ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {sending ? '...' : '📤'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
