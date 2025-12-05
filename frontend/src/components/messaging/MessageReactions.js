import React, { useState } from 'react';

const MessageReactions = ({ messageId, reactions = {}, onReact, isOwnMessage }) => {
    const [showPicker, setShowPicker] = useState(false);

    const availableEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    // Convert reactions object to array with counts
    const reactionsList = Object.entries(reactions).map(([emoji, users]) => ({
        emoji,
        count: Array.isArray(users) ? users.length : 0,
        users: Array.isArray(users) ? users : []
    })).filter(r => r.count > 0);

    const handleReact = (emoji) => {
        onReact?.(messageId, emoji);
        setShowPicker(false);
    };

    return (
        <div style={{
            position: 'relative',
            marginTop: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            flexWrap: 'wrap'
        }}>
            {/* Existing Reactions */}
            {reactionsList.map(({ emoji, count, users }) => (
                <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    style={{
                        background: 'rgba(0, 0, 0, 0.05)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '9999px',
                        padding: '0.125rem 0.5rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s'
                    }}
                    title={users.join(', ')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                    }}
                >
                    <span>{emoji}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{count}</span>
                </button>
            ))}

            {/* Add Reaction Button */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    style={{
                        background: 'rgba(0, 0, 0, 0.05)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    title="Add reaction"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                    }}
                >
                    +
                </button>

                {/* Emoji Picker */}
                {showPicker && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            [isOwnMessage ? 'right' : 'left']: 0,
                            marginBottom: '0.5rem',
                            background: 'white',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            padding: '0.5rem',
                            display: 'flex',
                            gap: '0.25rem',
                            zIndex: 10
                        }}
                    >
                        {availableEmojis.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleReact(emoji)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    borderRadius: '0.25rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                                    e.currentTarget.style.transform = 'scale(1.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'none';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Click outside to close picker */}
            {showPicker && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9
                    }}
                    onClick={() => setShowPicker(false)}
                />
            )}
        </div>
    );
};

export default MessageReactions;
