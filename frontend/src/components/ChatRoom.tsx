import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Message, SendMessageData, User } from '../types';
import ProfileModal from './ProfileModal';

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [chatRoom, setChatRoom] = useState<string>('general');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, logout } = useAuth();
  const { sendMessage, onMessage, joinRoom, leaveRoom, connected, onUserStatusChange, onUserTyping, sendTyping, socket, deleteMessage, onMessageDeleted, markMessageAsRead, onMessageRead } = useSocket();

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/auth/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Handle room joining/leaving
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        // Construct the correct room ID for fetching recent messages
        let roomId = chatRoom;
        if (selectedUser && user) {
          roomId = [user.id, selectedUser.id].sort().join('-');
        }

        const response = await axios.get(`/api/messages/recent?chatRoom=${roomId}`, {
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

    if (selectedUser && user && socket) {
      // Private room logic
      const roomId = [user.id, selectedUser.id].sort().join('-');
      socket.emit('joinPrivateRoom', { userId: user.id, otherUserId: selectedUser.id });
      setChatRoom(roomId); // Update local state to match logic
    } else {
      joinRoom(chatRoom);
    }

    return () => {
      if (selectedUser && user) {
        const roomId = [user.id, selectedUser.id].sort().join('-');
        // We can use leaveRoom regarding of type if backend supports leaving by ID
        leaveRoom(roomId);
      } else {
        leaveRoom(chatRoom);
      }
    };
  }, [chatRoom, selectedUser, joinRoom, leaveRoom, user, socket]);

  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      // Check if message belongs to current room
      // For private chats, chatRoom is the sorted ID
      // For public chats, it's the room name
      let currentRoomId = chatRoom;
      if (selectedUser && user) {
        currentRoomId = [user.id, selectedUser.id].sort().join('-');
      }

      if (message.chatRoom === currentRoomId) {
        setMessages(prev => [...prev, message]);
      }
    };

    const removeListener = onMessage(handleNewMessage);
    return removeListener;
  }, [chatRoom, selectedUser, user, onMessage]);

  useEffect(() => {
    const handleUserStatusChange = (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isOnline) newSet.add(data.userId);
        else newSet.delete(data.userId);
        return newSet;
      });
    };
    const removeListener = onUserStatusChange(handleUserStatusChange);
    return removeListener;
  }, [onUserStatusChange]);

  useEffect(() => {
    const handleUserTyping = (data: { senderId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) newSet.add(data.senderId);
        else newSet.delete(data.senderId);
        return newSet;
      });
    };
    const removeListener = onUserTyping(handleUserTyping);
    return removeListener;
  }, [onUserTyping]);

  useEffect(() => {
    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
    };
    const removeListener = onMessageDeleted(handleMessageDeleted);
    return removeListener;
  }, [onMessageDeleted]);

  useEffect(() => {
    const handleMessageRead = (data: { messageId: string; userId: string }) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === data.messageId && !msg.readBy.includes(data.userId)) {
          return { ...msg, readBy: [...msg.readBy, data.userId] };
        }
        return msg;
      }));
    };
    const removeListener = onMessageRead(handleMessageRead);
    return removeListener;
  }, [onMessageRead]);

  useEffect(() => {
    scrollToBottom();
    
    // Mark all visible messages as read
    messages.forEach(message => {
      if (!message.readBy.includes(user?.id || '') && message.sender._id !== user?.id) {
        markMessageAsRead({
          messageId: message._id,
          userId: user?.id || ''
        });
      }
    });
  }, [messages, user?.id, markMessageAsRead]);

  const handleTyping = (isTyping: boolean) => {
    let currentRoomId = chatRoom;
    if (selectedUser && user) {
      currentRoomId = [user.id, selectedUser.id].sort().join('-');
    }
    sendTyping({ chatRoom: currentRoomId, isTyping });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping(e.target.value.trim().length > 0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Send message with attachment
      const messageData: SendMessageData = {
        senderId: user?.id || '',
        content: `Sent a file: ${file.name}`,
        attachment: {
          url: response.data.url,
          type: response.data.type
        }
      };

      if (selectedUser) {
        messageData.recipientId = selectedUser.id;
      } else {
        messageData.chatRoom = chatRoom;
      }

      sendMessage(messageData);
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData: SendMessageData = {
      senderId: user?.id || '',
      content: newMessage.trim()
    };

    if (selectedUser) {
      messageData.recipientId = selectedUser.id;
    } else {
      messageData.chatRoom = chatRoom;
    }

    sendMessage(messageData);
    setNewMessage('');
    handleTyping(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      let roomId = chatRoom;
      if (selectedUser && user) {
        roomId = [user.id, selectedUser.id].sort().join('-');
      }

      const response = await axios.get('/api/messages/search', {
        params: {
          chatRoom: roomId,
          query: searchQuery.trim(),
          limit: 50
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSearchResults(response.data.messages);
    } catch (error) {
      console.error('Failed to search messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleRoomSelect = (room: string) => {
    setSelectedUser(null);
    setChatRoom(room);
  };

  const handleUserSelect = (targetUser: User) => {
    setSelectedUser(targetUser);
    setChatRoom(''); // Will be dynamically set in useEffect
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedUser ? `Chat with ${selectedUser.username}` : `${chatRoom.charAt(0).toUpperCase() + chatRoom.slice(1)}`}
            </h1>
            <p className="text-gray-500 text-sm">
              {selectedUser ? (onlineUsers.has(selectedUser.id) ? 'Online' : 'Offline') : `Connected to ${chatRoom}`}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100"
              title="Search messages"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowProfileModal(true)}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-800">{user?.username}</p>
                <p className="text-xs text-gray-500 text-ellipsis overflow-hidden w-24 whitespace-nowrap">{user?.bio || 'No bio'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        {showSearch && (
          <form onSubmit={handleSearch} className="mt-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Rooms</h2>
            <div className="space-y-1">
              {['general', 'tech', 'random', 'support'].map(room => (
                <button
                  key={room}
                  onClick={() => handleRoomSelect(room)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center ${!selectedUser && chatRoom === room
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {room.charAt(0).toUpperCase() + room.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Direct Messages</h2>
            <div className="space-y-1">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleUserSelect(u)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-3 ${selectedUser?.id === u.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="relative">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {onlineUsers.has(u.id) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium truncate">{u.username}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-gray-50">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {showSearch && searchResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500">
                    Search Results ({searchResults.length})
                  </h3>
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Clear search
                  </button>
                </div>
                {searchResults.map((message) => {
                  const isMe = message.sender._id === user?.id;
                  return (
                    <div key={message._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                        {!isMe && (
                          <div className="flex-shrink-0 mb-1 mr-2">
                            {message.sender.avatar ? (
                              <img src={message.sender.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                                {message.sender.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}

                        <div className={`p-3 rounded-2xl ${isMe
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                          } relative`}>
                          {isMe && (
                            <button
                              onClick={() => {
                                let roomId = chatRoom;
                                if (selectedUser && user) {
                                  roomId = [user.id, selectedUser.id].sort().join('-');
                                }
                                deleteMessage({ messageId: message._id, chatRoom: roomId });
                              }}
                              className="absolute -top-2 -right-2 p-1 text-xs text-gray-400 hover:text-red-500 opacity-0 hover:opacity-100 transition-opacity"
                              title="Delete message"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          )}
                          {message.attachment && (
                            <div className="mb-2">
                              {message.attachment.type.startsWith('image/') ? (
                                <img src={message.attachment.url} alt="Attachment" className="max-w-full rounded-lg max-h-60 object-cover" />
                              ) : message.attachment.type.startsWith('video/') ? (
                                <video src={message.attachment.url} controls className="max-w-full rounded-lg max-h-60 object-cover" />
                              ) : (
                                <a href={message.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 bg-black/10 p-2 rounded hover:bg-black/20 transition">
                                  <span className="text-sm underline">View Attachment</span>
                                </a>
                              )}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                          <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : showSearch && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg font-medium mb-2">No results found</p>
                <p className="text-sm">Try a different search query</p>
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg font-medium mb-2">No messages here yet</p>
                <p className="text-sm">Say hello!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isMe = message.sender._id === user?.id;
                return (
                  <div key={message._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                      {!isMe && (
                        <div className="flex-shrink-0 mb-1 mr-2">
                          {message.sender.avatar ? (
                            <img src={message.sender.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                              {message.sender.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`p-3 rounded-2xl ${isMe
                          ? 'bg-primary-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                        } relative`}>
                        {isMe && (
                          <button
                            onClick={() => {
                              let roomId = chatRoom;
                              if (selectedUser && user) {
                                roomId = [user.id, selectedUser.id].sort().join('-');
                              }
                              deleteMessage({ messageId: message._id, chatRoom: roomId });
                            }}
                            className="absolute -top-2 -right-2 p-1 text-xs text-gray-400 hover:text-red-500 opacity-0 hover:opacity-100 transition-opacity"
                            title="Delete message"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                        {message.attachment && (
                          <div className="mb-2">
                            {message.attachment.type.startsWith('image/') ? (
                              <img src={message.attachment.url} alt="Attachment" className="max-w-full rounded-lg max-h-60 object-cover" />
                            ) : (
                              <a href={message.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 bg-black/10 p-2 rounded hover:bg-black/20 transition">
                                <span className="text-sm underline">View Attachment</span>
                              </a>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <p className={`text-[10px] ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                          {isMe && (
                            <div className="text-[10px]">
                              {message.readBy.length > 1 ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-blue-400">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-gray-400">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t p-4">
            {typingUsers.size > 0 && (
              <div className="text-xs text-gray-500 mb-2 italic ml-2">
                {Array.from(typingUsers)
                  .map(userId => users.find(u => u.id === userId)?.username || userId)
                  .join(', ')} is typing...
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex space-x-3 items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!connected || uploading}
                className="p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100"
                title="Attach file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 6.182l-6.47 6.479A3 3 0 0113.125 10.439l8.25-8.251" />
                </svg>
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder={uploading ? "Uploading..." : "Type a message..."}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                disabled={!connected || uploading}
              />
              <button
                type="submit"
                disabled={!connected || !newMessage.trim()}
                className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </main>
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
};

export default ChatRoom;
