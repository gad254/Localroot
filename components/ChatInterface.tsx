import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { Send, User as UserIcon } from 'lucide-react';

interface ChatInterfaceProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  onSendMessage: (receiverId: string, content: string) => void;
  initialSelectedUserId?: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentUser, users, messages, onSendMessage, initialSelectedUserId }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter contacts based on existing messages or all producers if user is consumer
  const contacts = users.filter(u => u.id !== currentUser.id && (
    currentUser.role === 'ADMIN' || 
    (currentUser.role === 'CONSUMER' && u.role === 'PRODUCER') ||
    (currentUser.role === 'PRODUCER' && messages.some(m => (m.senderId === u.id && m.receiverId === currentUser.id) || (m.senderId === currentUser.id && m.receiverId === u.id)))
  ));

  const currentMessages = messages.filter(
    m => (m.senderId === currentUser.id && m.receiverId === selectedUserId) ||
         (m.senderId === selectedUserId && m.receiverId === currentUser.id)
  ).sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, selectedUserId]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedUserId) return;
    onSendMessage(selectedUserId, inputText);
    setInputText('');
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {/* Sidebar Contacts */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
        </div>
        <ul>
          {contacts.map(contact => (
            <li 
              key={contact.id}
              onClick={() => setSelectedUserId(contact.id)}
              className={`p-4 flex items-center cursor-pointer hover:bg-leaf-50 transition-colors ${selectedUserId === contact.id ? 'bg-leaf-100' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-3">
                {contact.avatarUrl ? <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover"/> : <UserIcon className="text-gray-500 w-6 h-6" />}
              </div>
              <div>
                <p className="font-medium text-gray-900">{contact.name}</p>
                <p className="text-xs text-gray-500 capitalize">{contact.role.toLowerCase()}</p>
              </div>
            </li>
          ))}
          {contacts.length === 0 && (
            <li className="p-8 text-center text-gray-500 text-sm">
              No contacts yet. Start browsing to connect!
            </li>
          )}
        </ul>
      </div>

      {/* Chat Area */}
      <div className="w-2/3 flex flex-col">
        {selectedUserId ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between">
              <span className="font-semibold text-lg">{users.find(u => u.id === selectedUserId)?.name}</span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
              {currentMessages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-xl text-sm ${isMe ? 'bg-leaf-600 text-white rounded-br-none' : 'bg-white border border-gray-200 rounded-bl-none text-gray-800'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-leaf-500"
              />
              <button 
                onClick={handleSend}
                className="p-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-slate-50">
            <div className="text-center">
              <p className="mb-2 text-xl">Select a conversation</p>
              <p className="text-sm">Connect directly with your local food community.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;