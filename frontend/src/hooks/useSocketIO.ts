/**
 * useSocketIO Hook
 * Socket.IO connection with automatic failover support
 */

import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";

type SocketType = ReturnType<typeof io>;

const DEFAULT_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY = 1000;

export interface UseSocketIOOptions {
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: any) => void;
}

export interface UseSocketIOReturn {
  socket: SocketType | null;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

export const useSocketIO = (
  serverUrl: string | null,
  token: string | null,
  userId: number | null,
  options: UseSocketIOOptions = {},
): UseSocketIOReturn => {
  const {
    reconnectAttempts = DEFAULT_RECONNECT_ATTEMPTS,
    reconnectDelay = DEFAULT_RECONNECT_DELAY,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const socketRef = useRef<SocketType | null>(null);
  const isConnectedRef = useRef(false);
  const serverUrlRef = useRef(serverUrl);

  const connect = useCallback(() => {
    if (!serverUrl || !token || !userId) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log(`🔌 Connecting to Socket.IO: ${serverUrl}`);

    const socket = io(serverUrl, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
    });

    socket.on("connect", () => {
      console.log("📡 Socket.IO connected");
      isConnectedRef.current = true;
      socket.emit("join_user_room", userId);
      console.log(`📡 Joined user room: user_${userId}`);
      onConnect?.();
    });

    socket.on("disconnect", (reason: string) => {
      console.log("📡 Socket.IO disconnected:", reason);
      isConnectedRef.current = false;
      onDisconnect?.(reason);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("📡 Socket.IO connection error:", error.message);
      onError?.(error);
    });

    socketRef.current = socket;
  }, [
    serverUrl,
    token,
    userId,
    reconnectAttempts,
    reconnectDelay,
    onConnect,
    onDisconnect,
    onError,
  ]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    serverUrlRef.current = serverUrl;
  }, [serverUrl]);

  useEffect(() => {
    if (serverUrl && token && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [serverUrl, token, userId, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    reconnect,
    disconnect,
  };
};

export default useSocketIO;
