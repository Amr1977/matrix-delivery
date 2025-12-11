import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import MediaViewer from './MediaViewer';
import DragDropUpload from './DragDropUpload';
import useMessaging from '../../hooks/useMessaging';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import useMediaUpload from '../../hooks/useMediaUpload';
import useTypingIndicator from '../../hooks/useTypingIndicator';
import { AuthApi } from '../../services/api/auth';
import { useI18n } from '../../i18n/i18nContext';

const ChatPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();

    const {
        messages,
        loading,
        error: messagingError,
        sendMessage,
        fetchOrderMessages,
        markMessagesRead
    } = useMessaging();

    const {
        isRecording,
        recordingTime,
        audioBlob,
        audioUrl,
        startRecording,
        stopRecording,
        cancelRecording,
        clearRecording,
        formatTime
    } = useVoiceRecorder();

    const {
        uploading,
        uploadProgress,
        error: uploadError,
        preview,
        uploadImage,
        uploadVideo,
        uploadVoice,
        clearPreview
    } = useMediaUpload();

    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [orderDetails, setOrderDetails] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [recipientId, setRecipientId] = useState(null);
    const [showMediaOptions, setShowMediaOptions] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [viewerMessage, setViewerMessage] = useState(null);

    const { socket } = useMessaging();
    const { typingUsers, isAnyoneTyping, emitTyping, emitStoppedTyping } = useTypingIndicator(
        socket,
        orderId,
        currentUser?.userId
    );

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);

    // Fetch order details and messages on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get current user using AuthApi
                console.log('Fetching current user with AuthApi...');
                let user;
                try {
                    user = await AuthApi.getCurrentUser();
                    console.log('User fetched successfully:', user);
                } catch (authError) {
                    console.error('Auth API call failed:', {
                        error: authError,
                        message: authError.error || authError.message
                    });
                    // User is not authenticated - redirect to main page
                    console.warn('User not authenticated, redirecting to main page');
                    navigate('/');
                    return;
                }

                // API returns user object directly (not wrapped)
                const user = userResponse;
                console.log('Current user:', user);

                if (!user || !user.userId) {
                    console.error('No user found - user may not be logged in');
                    navigate('/');
                    return;
                }

                setCurrentUser(user);

                // Get order details
                console.log('Fetching order details for:', orderId);
                const orderResponse = await api.get(`/orders/${orderId}`);
                console.log('Order response:', orderResponse);
                setOrderDetails(orderResponse.order);

                // Determine recipient - handle both field name variations
                const order = orderResponse.order;
                const isCustomer = user.userId === order.customerId;

                // Debug: Log order structure to identify correct field names
                console.log('Order structure for chat:', {
                    orderId: order._id,
                    customerId: order.customerId,
                    assignedDriver: order.assignedDriver,
                    assignedDriverUserId: order.assignedDriverUserId,
                    driverId: order.driverId,
                    assigned_driver_user_id: order.assigned_driver_user_id,
                    status: order.status
                });

                // Try different field names for assigned driver
                const driverUserId = order.assignedDriverUserId ||
                    order.assignedDriver?.userId ||
                    order.assigned_driver_user_id ||
                    order.driverId;

                const recipientUserId = isCustomer ? driverUserId : order.customerId;

                console.log('Recipient determination:', {
                    isCustomer,
                    driverUserId,
                    recipientUserId,
                    currentUserId: user.userId
                });

                if (!recipientUserId) {
                    console.warn('No recipient found for chat - order may not have an assigned driver yet');
                    return;
                }

                setRecipientId(recipientUserId);

                // Fetch messages
                console.log('Fetching messages for order:', orderId);
                await fetchOrderMessages(orderId);

                console.log('Marking messages as read...');
                await markMessagesRead(orderId);

                console.log('Chat data loaded successfully');
            } catch (error) {
                console.error('Failed to fetch data:', {
                    error,
                    message: error.message,
                    stack: error.stack,
                    response: error.response
                });
            }
        };

        if (orderId) {
            fetchData();
        }
    }, [orderId, fetchOrderMessages, markMessagesRead]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if ((!newMessage.trim() && !audioBlob && !selectedMedia) || sending) return;

        // Validate recipient exists
        if (!recipientId) {
            console.error('Cannot send message: No recipient ID');
            return;
        }

        setSending(true);
        try {
            // Handle voice message
            if (audioBlob) {
                const uploadResult = await uploadVoice(orderId, audioBlob);
                await api.sendMediaMessage(orderId, recipientId, uploadResult, newMessage.trim());
                clearRecording();
                setNewMessage('');
            }
            // Handle media message
            else if (selectedMedia) {
                await api.sendMediaMessage(orderId, recipientId, selectedMedia, newMessage.trim());
                setSelectedMedia(null);
                clearPreview();
                setNewMessage('');
            }
            // Handle text message
            else {
                await sendMessage(orderId, recipientId, newMessage.trim());
                setNewMessage('');
            }

            await fetchOrderMessages(orderId);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleImageSelect = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        try {
            const result = await uploadImage(orderId, file);
            setSelectedMedia(result);
            setShowMediaOptions(false);
        } catch (error) {
            console.error('Failed to upload image:', error);
        }
    };

    const handleImageDrop = async (file) => {
        try {
            const result = await uploadImage(orderId, file);
            setSelectedMedia(result);
        } catch (error) {
            console.error('Failed to upload image:', error);
        }
    };

    const handleVideoDrop = async (file) => {
        try {
            const result = await uploadVideo(orderId, file);
            setSelectedMedia(result);
        } catch (error) {
            console.error('Failed to upload video:', error);
        }
    };

    const handleVideoSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const result = await uploadVideo(orderId, file);
            setSelectedMedia(result);
            setShowMediaOptions(false);
        } catch (error) {
            console.error('Failed to upload video:', error);
        }
    };

    const handleVoiceRecording = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
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

    if (loading && !orderDetails) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div>Loading chat...</div>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#F9FAFB'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid #E5E7EB',
                background: '#FFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0.5rem'
                        }}
                    >
                        ←
                    </button>

                    {orderDetails && (
                        <div style={{ flex: 1 }}>
                            <h2 style={{
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#1F2937',
                                margin: 0
                            }}>
                                Order #{orderDetails.orderNumber}
                            </h2>
                            <p style={{
                                fontSize: '0.875rem',
                                color: '#6B7280',
                                margin: '0.25rem 0 0 0'
                            }}>
                                {orderDetails.pickupAddress} → {orderDetails.deliveryAddress}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                background: '#F9FAFB'
            }}>
                {messages.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3rem 1rem',
                        textAlign: 'center',
                        color: '#6B7280'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💭</div>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    <div>
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

                                    <MessageBubble
                                        message={message}
                                        isOwnMessage={message.sender.id === currentUser?.userId}
                                        onMediaClick={setViewerMessage}
                                        onReact={(messageId, emoji) => {
                                            console.log('React:', messageId, emoji);
                                            // TODO: Implement reaction API
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Media Preview */}
            {(preview || audioUrl || selectedMedia) && (
                <div style={{
                    padding: '1rem',
                    borderTop: '1px solid #E5E7EB',
                    background: '#FFF'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem',
                        background: '#F3F4F6',
                        borderRadius: '0.5rem'
                    }}>
                        {audioUrl && (
                            <>
                                <audio controls src={audioUrl} style={{ flex: 1 }} />
                                <button
                                    onClick={cancelRecording}
                                    style={{
                                        background: '#EF4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        padding: '0.5rem 1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                        {preview && (
                            <>
                                <img
                                    src={preview}
                                    alt="Preview"
                                    style={{
                                        maxWidth: '100px',
                                        maxHeight: '100px',
                                        borderRadius: '0.375rem'
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        setSelectedMedia(null);
                                        clearPreview();
                                    }}
                                    style={{
                                        background: '#EF4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        padding: '0.5rem 1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Voice Recording Indicator */}
            {isRecording && (
                <div style={{
                    padding: '1rem',
                    borderTop: '1px solid #E5E7EB',
                    background: '#FEF2F2'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            background: '#EF4444',
                            borderRadius: '50%',
                            animation: 'pulse 1.5s infinite'
                        }} />
                        <span style={{ color: '#EF4444', fontWeight: '600' }}>
                            Recording: {formatTime(recordingTime)}
                        </span>
                    </div>
                </div>
            )}

            {/* Upload Progress */}
            {uploading && (
                <div style={{
                    padding: '1rem',
                    borderTop: '1px solid #E5E7EB',
                    background: '#FFF'
                }}>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                        Uploading... {Math.round(uploadProgress)}%
                    </div>
                    <div style={{
                        width: '100%',
                        height: '4px',
                        background: '#E5E7EB',
                        borderRadius: '9999px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${uploadProgress}%`,
                            height: '100%',
                            background: '#4F46E5',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                </div>
            )}

            {/* Input Area */}
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
                    {/* Media Options */}
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => setShowMediaOptions(!showMediaOptions)}
                            style={{
                                padding: '0.75rem',
                                background: '#F3F4F6',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '1.25rem'
                            }}
                            title="Attach media"
                        >
                            📎
                        </button>

                        {showMediaOptions && (
                            <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0,
                                marginBottom: '0.5rem',
                                background: 'white',
                                borderRadius: '0.5rem',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                padding: '0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                minWidth: '150px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        padding: '0.5rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        borderRadius: '0.375rem'
                                    }}
                                >
                                    🖼️ Image
                                </button>
                                <button
                                    type="button"
                                    onClick={() => videoInputRef.current?.click()}
                                    style={{
                                        padding: '0.5rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        borderRadius: '0.375rem'
                                    }}
                                >
                                    🎥 Video
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleVideoSelect}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Voice Recording Button */}
                    <button
                        type="button"
                        onClick={handleVoiceRecording}
                        style={{
                            padding: '0.75rem',
                            background: isRecording ? '#EF4444' : '#F3F4F6',
                            color: isRecording ? 'white' : '#1F2937',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '1.25rem'
                        }}
                        title={isRecording ? 'Stop recording' : 'Record voice'}
                    >
                        🎤
                    </button>

                    {/* Text Input */}
                    <div style={{ flex: 1 }}>
                        <textarea
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                emitTyping();
                            }}
                            onBlur={emitStoppedTyping}
                            placeholder="Type a message..."
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

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !audioBlob && !selectedMedia) || sending || uploading}
                        style={{
                            padding: '0.75rem',
                            background: '#4F46E5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            opacity: (!newMessage.trim() && !audioBlob && !selectedMedia) || sending || uploading ? 0.5 : 1,
                            fontSize: '1.25rem'
                        }}
                    >
                        {sending ? '...' : '📤'}
                    </button>
                </form>

                {(messagingError || uploadError) && (
                    <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                    }}>
                        {messagingError || uploadError}
                    </div>
                )}
            </div>

            {/* Typing Indicator */}
            {isAnyoneTyping && (
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '1rem',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span>Typing</span>
                    <span className="typing-dots">
                        <span>.</span><span>.</span><span>.</span>
                    </span>
                </div>
            )}

            {/* Media Viewer */}
            {viewerMessage && (
                <MediaViewer
                    message={viewerMessage}
                    messages={messages}
                    onClose={() => setViewerMessage(null)}
                />
            )}

            {/* Drag and Drop Upload */}
            <DragDropUpload
                onImageDrop={handleImageDrop}
                onVideoDrop={handleVideoDrop}
                disabled={uploading || sending}
            />

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .typing-dots span {
          animation: typing 1.4s infinite;
          opacity: 0;
        }
        .typing-dots span:nth-child(1) {
          animation-delay: 0s;
        }
        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%, 60%, 100% { opacity: 0; }
          30% { opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default ChatPage;
