import React from 'react';

// ============ MODAL COMPONENT FOR SUCCESS/ERROR MESSAGES ============
export const MessageModal = ({ isOpen, onClose, title, message, type }) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #000000 0%, #001100 100%)',
        border: `2px solid ${isSuccess ? '#00AA00' : '#DC2626'}`,
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: `0 10px 30px rgba(${isSuccess ? '0, 170, 0' : '220, 38, 38'}, 0.5)`
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem'
        }}>
          {isSuccess ? '🎉' : '⚠️'}
        </div>

        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#30FF30',
          marginBottom: '1rem',
          textShadow: '0 0 10px #30FF30'
        }}>
          {title}
        </h2>

        <p style={{
          color: '#E5E7EB',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          {message}
        </p>

        <button
          data-testid="modal-close-button"
          onClick={onClose}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #00AA00 0%, #30FF30 50%, #00AA00 100%)',
            color: '#30FF30',
            border: '2px solid #00AA00',
            borderRadius: '0.375rem',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: 'Consolas, Monaco, Courier New, monospace'
          }}
          onMouseOver={(e) => {
            e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.boxShadow = 'none';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          {isSuccess ? '🎯 Got it!' : '❌ Try Again'}
        </button>
      </div>
    </div>
  );
};
