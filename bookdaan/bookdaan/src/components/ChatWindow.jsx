import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ChatWindow = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chat, setChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  let currentUserId;
  try {
    currentUserId = JSON.parse(atob(token.split('.')[1])).id;
  } catch {
    currentUserId = null;
  }

  const fetchChat = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const currentChat = res.data.find((c) => c._id === chatId);
      setChat(currentChat || null);
    } catch (err) {
      console.error('❌ Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat || !chat.active) return;

    try {
      const res = await axios.post(
        `${API_BASE}/api/chat/${chatId}/message`,
        { text: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChat(res.data);
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('❌ Failed to send message:', err);
      alert(err?.response?.data?.error || 'Failed to send message');
    }
  };

  const terminateChat = async () => {
    try {
      await axios.post(
        `${API_BASE}/api/chat/${chatId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('✅ Chat terminated. You can now request this book again.');
      await fetchChat();
    } catch (err) {
      console.error('❌ Failed to close chat:', err);
      alert('Failed to terminate chat.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchChat();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  if (loading) return <div className="p-4">Loading chat...</div>;
  if (!chat) return <div className="p-4 text-red-500">Chat not found</div>;

  const isTerminated = chat.terminated;
  const terminatedByYou = chat.terminatedBy === currentUserId;

  return (
    <div className="max-w-md mx-auto bg-white shadow-md rounded-md p-4 flex flex-col h-[70vh]">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="flex items-center gap-1 text-emerald-600 hover:text-white font-medium px-3 py-1 rounded-md border border-emerald-300 hover:border-emerald-600 bg-emerald-50 hover:bg-emerald-600 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>


          <h2 className="text-lg font-semibold text-indigo-700">
            Chat about "{chat.book?.title || 'Untitled'}"
          </h2>
        </div>
        {!isTerminated && (
          <button
              onClick={terminateChat}
              className="text-red-600 hover:text-white font-medium px-3 py-1 rounded-md border border-red-300 hover:border-red-600 bg-red-50 hover:bg-red-600 transition"
            >
              Close
            </button>

        )}
      </div>

      <div className="flex-1 overflow-y-auto border p-2 rounded-md mb-3 bg-gray-50">
        {chat.messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 mt-10">
            No messages yet.
          </div>
        )}
        {chat.messages.map((msg) => (
          <div
            key={msg._id || Math.random()}
            className={`my-2 p-2 rounded-md max-w-xs ${
              msg.sender === currentUserId
                ? 'bg-indigo-100 ml-auto text-right'
                : 'bg-gray-200'
            }`}
          >
            <div className="text-sm">{msg.text}</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {isTerminated && (
          <div className="text-center text-red-500 mt-4 text-sm italic">
            Chat terminated {terminatedByYou ? 'by you' : 'by the other user'}.<br />
            To reopen this chat, you must re-request the book and get accepted.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border rounded-md px-3 py-1"
          placeholder={
            isTerminated
              ? 'Chat is terminated. You cannot send messages.'
              : 'Type your message...'
          }
          disabled={isTerminated}
        />
        <button
          onClick={sendMessage}
          disabled={isTerminated || !newMessage.trim()}
          className={`px-4 py-1 rounded text-white ${
            isTerminated
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
