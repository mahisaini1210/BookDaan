import { useEffect, useState } from 'react';
import axios from 'axios';
import ChatWindow from '../components/ChatWindow';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MyChats = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const token = localStorage.getItem('token');

  let currentUserId;
  try {
    currentUserId = JSON.parse(atob(token.split('.')[1])).id;
  } catch {
    currentUserId = null;
  }

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sorted = [...res.data].sort((a, b) => {
        const aTime = a.messages?.at(-1)?.createdAt || a.updatedAt;
        const bTime = b.messages?.at(-1)?.createdAt || b.updatedAt;
        return new Date(bTime) - new Date(aTime);
      });

      setChats(sorted);
    } catch (err) {
      console.error('❌ Failed to fetch chats:', err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const handleChatClick = (chat) => {
    setSelectedChat(chat);
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Chat List */}
      <div className="bg-white shadow rounded p-4 col-span-1">
        <h2 className="text-xl font-semibold mb-4">📨 My Chats</h2>
        {chats.length === 0 ? (
          <p className="text-gray-500">No chats yet.</p>
        ) : (
          <ul className="space-y-2">
            {chats.map((chat) => {
              const otherUser = chat.participants.find(
                (p) => p._id !== currentUserId
              );
              const isTerminated = chat.terminated;

              return (
                <li
                  key={chat._id}
                  onClick={() => handleChatClick(chat)}
                  className={`cursor-pointer p-3 border rounded ${
                    isTerminated
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'hover:bg-gray-100'
                  } ${
                    selectedChat?._id === chat._id && !isTerminated
                      ? 'bg-gray-100'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-indigo-600">
                      {otherUser?.name || 'User'}
                    </span>
                    {isTerminated && (
                      <span className="text-xs text-red-500 ml-2">
                        (Terminated)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Regarding: <span className="italic">{chat.book?.title}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Chat Window */}
      <div className="col-span-2">
        {selectedChat ? (
          selectedChat.terminated ? (
            <div className="bg-white shadow rounded p-6 text-center text-gray-500">
              <h3 className="text-lg font-semibold text-red-500 mb-2">
                🚫 Chat Terminated
              </h3>
              <p className="text-sm">
                This conversation is closed. You must{' '}
                <strong>re-request the book</strong> to start a new chat.
              </p>
            </div>
          ) : (
            <ChatWindow chatId={selectedChat._id} />
          )
        ) : (
          <div className="bg-white shadow rounded p-6 text-gray-400 text-center">
            Select a chat to view conversation.
          </div>
        )}
      </div>
    </div>
  );
};

export default MyChats;
