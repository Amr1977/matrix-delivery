import { useState, useEffect, useCallback, useRef } from 'react';

const useTypingIndicator = (socket, orderId, currentUserId) => {
    const [typingUsers, setTypingUsers] = useState(new Set());
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    // Listen for typing events from other users
    useEffect(() => {
        if (!socket || !orderId) return;

        const handleUserTyping = (data) => {
            if (data.orderId === orderId && data.userId !== currentUserId) {
                setTypingUsers(prev => new Set([...prev, data.userId]));

                // Remove user from typing after 3 seconds of inactivity
                setTimeout(() => {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(data.userId);
                        return newSet;
                    });
                }, 3000);
            }
        };

        const handleUserStoppedTyping = (data) => {
            if (data.orderId === orderId && data.userId !== currentUserId) {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.userId);
                    return newSet;
                });
            }
        };

        // Socket.IO event listeners
        if (socket.on) {
            socket.on('user_typing', handleUserTyping);
            socket.on('user_stopped_typing', handleUserStoppedTyping);
        }

        return () => {
            if (socket.off) {
                socket.off('user_typing', handleUserTyping);
                socket.off('user_stopped_typing', handleUserStoppedTyping);
            }
        };
    }, [socket, orderId, currentUserId]);

    // Emit typing event
    const emitTyping = useCallback(() => {
        if (!socket || !orderId || !currentUserId) return;

        // Only emit if not already typing
        if (!isTypingRef.current) {
            isTypingRef.current = true;

            if (socket.emit) {
                socket.emit('typing', {
                    orderId,
                    userId: currentUserId
                });
            }
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            emitStoppedTyping();
        }, 2000);
    }, [socket, orderId, currentUserId]);

    // Emit stopped typing event
    const emitStoppedTyping = useCallback(() => {
        if (!socket || !orderId || !currentUserId) return;

        if (isTypingRef.current) {
            isTypingRef.current = false;

            if (socket.emit) {
                socket.emit('stopped_typing', {
                    orderId,
                    userId: currentUserId
                });
            }
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    }, [socket, orderId, currentUserId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            emitStoppedTyping();
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [emitStoppedTyping]);

    return {
        typingUsers: Array.from(typingUsers),
        isAnyoneTyping: typingUsers.size > 0,
        emitTyping,
        emitStoppedTyping
    };
};

export default useTypingIndicator;
