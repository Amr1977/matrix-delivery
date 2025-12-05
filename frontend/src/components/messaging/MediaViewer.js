import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';

const MediaViewer = ({ message, onClose, messages = [] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mediaMessages, setMediaMessages] = useState([]);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        // Filter messages that have media
        const mediaOnly = messages.filter(msg => msg.mediaUrl && msg.mediaType !== 'voice');
        setMediaMessages(mediaOnly);

        // Find current message index
        const index = mediaOnly.findIndex(msg => msg.id === message.id);
        setCurrentIndex(index >= 0 ? index : 0);
    }, [message, messages]);

    const currentMessage = mediaMessages[currentIndex] || message;

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < mediaMessages.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowLeft') {
            handlePrevious();
        } else if (e.key === 'ArrowRight') {
            handleNext();
        }
    };

    const handleDownload = () => {
        const fullMediaUrl = `${API_BASE_URL}${currentMessage.mediaUrl}`;
        const link = document.createElement('a');
        link.href = fullMediaUrl;
        link.download = `media_${currentMessage.id}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, mediaMessages.length]);

    const fullMediaUrl = `${API_BASE_URL}${currentMessage.mediaUrl}`;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onClick={onClose}
        >
            {/* Header */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                    zIndex: 10
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ color: 'white', fontSize: '1rem' }}>
                    {currentMessage.sender?.name || 'Unknown'} • {new Date(currentMessage.createdAt).toLocaleString()}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handleDownload}
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                        title="Download"
                    >
                        ⬇️ Download
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '1.5rem'
                        }}
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Media Content */}
            <div
                style={{
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {currentMessage.mediaType === 'image' ? (
                    <img
                        src={fullMediaUrl}
                        alt="Full size"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '80vh',
                            objectFit: 'contain',
                            borderRadius: '0.5rem'
                        }}
                    />
                ) : currentMessage.mediaType === 'video' ? (
                    <div style={{ width: '80vw', maxWidth: '1200px' }}>
                        <ReactPlayer
                            url={fullMediaUrl}
                            controls
                            width="100%"
                            height="auto"
                            playing
                            style={{ borderRadius: '0.5rem', overflow: 'hidden' }}
                        />
                    </div>
                ) : null}
            </div>

            {/* Caption */}
            {currentMessage.content && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '5rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '1rem 2rem',
                        borderRadius: '0.5rem',
                        maxWidth: '80vw',
                        textAlign: 'center'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {currentMessage.content}
                </div>
            )}

            {/* Navigation */}
            {mediaMessages.length > 1 && (
                <>
                    {/* Previous Button */}
                    {currentIndex > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevious();
                            }}
                            style={{
                                position: 'absolute',
                                left: '2rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                color: 'white',
                                padding: '1rem',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                fontSize: '2rem',
                                width: '60px',
                                height: '60px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Previous (←)"
                        >
                            ‹
                        </button>
                    )}

                    {/* Next Button */}
                    {currentIndex < mediaMessages.length - 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                            style={{
                                position: 'absolute',
                                right: '2rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                color: 'white',
                                padding: '1rem',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                fontSize: '2rem',
                                width: '60px',
                                height: '60px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Next (→)"
                        >
                            ›
                        </button>
                    )}

                    {/* Counter */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '2rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem'
                        }}
                    >
                        {currentIndex + 1} / {mediaMessages.length}
                    </div>
                </>
            )}
        </div>
    );
};

export default MediaViewer;
