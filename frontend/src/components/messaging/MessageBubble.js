import React from 'react';
import ReactPlayer from 'react-player';

const MessageBubble = ({ message, isOwnMessage, onMediaClick }) => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    const renderMediaContent = () => {
        if (!message.mediaUrl) return null;

        const fullMediaUrl = `${API_BASE_URL}${message.mediaUrl}`;
        const fullThumbnailUrl = message.thumbnailUrl ? `${API_BASE_URL}${message.thumbnailUrl}` : null;

        switch (message.mediaType) {
            case 'image':
                return (
                    <div
                        style={{
                            marginTop: message.content ? '0.5rem' : 0,
                            cursor: 'pointer',
                            borderRadius: '0.5rem',
                            overflow: 'hidden'
                        }}
                        onClick={() => onMediaClick && onMediaClick(message)}
                    >
                        <img
                            src={fullThumbnailUrl || fullMediaUrl}
                            alt="Shared image"
                            style={{
                                maxWidth: '300px',
                                maxHeight: '300px',
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                borderRadius: '0.5rem'
                            }}
                        />
                    </div>
                );

            case 'video':
                return (
                    <div
                        style={{
                            marginTop: message.content ? '0.5rem' : 0,
                            maxWidth: '300px',
                            borderRadius: '0.5rem',
                            overflow: 'hidden'
                        }}
                    >
                        <ReactPlayer
                            url={fullMediaUrl}
                            controls
                            width="100%"
                            height="auto"
                            style={{ borderRadius: '0.5rem' }}
                        />
                    </div>
                );

            case 'voice':
                return (
                    <div
                        style={{
                            marginTop: message.content ? '0.5rem' : 0,
                            width: '250px'
                        }}
                    >
                        <audio
                            controls
                            style={{
                                width: '100%',
                                height: '40px'
                            }}
                        >
                            <source src={fullMediaUrl} type="audio/webm" />
                            <source src={fullMediaUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                        </audio>
                        {message.mediaDuration && (
                            <div style={{
                                fontSize: '0.75rem',
                                opacity: 0.7,
                                marginTop: '0.25rem'
                            }}>
                                Duration: {Math.floor(message.mediaDuration / 60)}:{(message.mediaDuration % 60).toString().padStart(2, '0')}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
            marginBottom: '0.75rem'
        }}>
            <div style={{
                maxWidth: '70%',
                background: isOwnMessage ? '#4F46E5' : '#FFF',
                color: isOwnMessage ? '#FFF' : '#1F2937',
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                borderBottomLeftRadius: isOwnMessage ? '1rem' : '0.25rem',
                borderBottomRightRadius: isOwnMessage ? '0.25rem' : '1rem',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                position: 'relative'
            }}>
                {message.content && (
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        wordBreak: 'break-word'
                    }}>
                        {message.content}
                    </p>
                )}

                {renderMediaContent()}

                <div style={{
                    fontSize: '0.75rem',
                    opacity: 0.7,
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    justifyContent: 'flex-end'
                }}>
                    <span>{formatTime(message.createdAt)}</span>
                    {isOwnMessage && message.isRead && (
                        <span>✓✓</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
