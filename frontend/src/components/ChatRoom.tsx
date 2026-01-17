import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Message, SendMessageData } from '../types';

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [chatRoom, setChatRoom] = useState<string>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();
  const { sendMessage, onMessage, joinRoom, leaveRoom, connected } = useSocket();

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/messages/recent?chatRoom=${chatRoom}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    joinRoom(chatRoom);

    return () => {
      leaveRoom(chatRoom);
    };
  }, [chatRoom, joinRoom, leaveRoom]);

  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (message.chatRoom === chatRoom) {
        setMessages(prev => [...prev, message]);
      }
    };

    const removeListener = onMessage(handleNewMessage);
    return removeListener;
  }, [chatRoom, onMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const messageData: SendMessageData = {
      senderId: user?.id || '',
      content: newMessage.trim(),
      chatRoom
    };

    sendMessage(messageData);
    setNewMessage('');
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chat App</h1>
            <p className="text-gray-500 text-sm">Connected to {chatRoom} room</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Chat Rooms</h2>
          <div className="space-y-2">
            {['general', 'tech', 'random', 'support'].map(room => (
              <button
                key={room}
                onClick={() => setChatRoom(room)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  chatRoom === room
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                #{room}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Online Status</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm">Be the first to send a message!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${
                    message.sender._id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-lg ${
                      message.sender._id === user?.id
                        ? 'bg-primary-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <span className={`text-sm font-semibold ${
                        message.sender._id === user?.id ? 'text-primary-100' : 'text-gray-900'
                      }`}>
                        {message.sender.username}
                      </span>
                      <span className={`text-xs ${
                        message.sender._id === user?.id ? 'text-primary-200' : 'text-gray-500'
                      } ml-2`}>
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t p-4">
            <form onSubmit={handleSendMessage} className="flex space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={!connected}
              />
              <button
                type="submit"
                disabled={!connected || !newMessage.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
            {!connected && (
              <p className="text-sm text-red-600 mt-2">
                You're offline. Messages will be sent when you reconnect.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChatRoom;