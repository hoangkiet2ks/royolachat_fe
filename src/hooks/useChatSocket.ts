import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useChatSocket = (token: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL; // Lấy URL từ file .env

    // Kết nối Socket với namespace /chat
    const socketInstance = io(`${apiUrl}/chat`, {
      auth: { token: `Bearer ${token}` },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true,
    });

    socketInstance.on('connect', () => {
      console.log('Đã kết nối Socket thành công:', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Lỗi kết nối Socket:', err.message);
    });

    setSocket(socketInstance);

    // Cleanup khi component unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  return socket;
};