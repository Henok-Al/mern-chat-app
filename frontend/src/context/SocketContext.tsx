import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Message, SendMessageData } from '../types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinRoom: (chatRoom: string) => void;
  leaveRoom: (chatRoom: string) => void;
  sendMessage: (data: SendMessageData) => void;
  onMessage: (callback: (message: Message) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
  user: User | null;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, user }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const joinRoom = (chatRoom: string): void => {
    if (socket) {
      socket.emit('joinRoom', { chatRoom });
    }
  };

  const leaveRoom = (chatRoom: string): void => {
    if (socket) {
      socket.emit('leaveRoom', { chatRoom });
    }
  };

  const sendMessage = (data: SendMessageData): void => {
    if (socket) {
      socket.emit('sendMessage', data);
    }
  };

  const onMessage = (callback: (message: Message) => void): (() => void) => {
    if (socket) {
      socket.on('newMessage', callback);
      return () => socket.off('newMessage', callback);
    }
    return () => {};
  };

  const value: SocketContextType = {
    socket,
    connected,
    joinRoom,
    leaveRoom,
    sendMessage,
    onMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};