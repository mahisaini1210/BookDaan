import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const userId = token ? JSON.parse(atob(token.split('.')[1]))?.id : null;

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/users/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('❌ Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (action, bookId, idToSend, notificationId) => {
    try {
      setProcessingId(notificationId);
      await axios.post(
        `${API_BASE}/api/books/${bookId}/${action}/${idToSend}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await markAsSeen(notificationId);
      fetchNotifications();
    } catch (err) {
      console.error(`❌ Failed to ${action} request:`, err);
      alert(err?.response?.data?.error || `Failed to ${action} request.`);
    } finally {
      setProcessingId(null);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_BASE}/api/users/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (err) {
      console.error('❌ Failed to delete notification:', err);
    }
  };

  const markAsSeen = async (notificationId) => {
    try {
      await axios.patch(
        `${API_BASE}/api/users/notifications/${notificationId}/seen`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, seen: true } : n))
      );
    } catch (err) {
      console.error('❌ Failed to mark as seen:', err);
    }
  };

  const navigateToChat = async (bookId, otherUserId, notificationId, existingChatId = null) => {
    try {
      setProcessingId(notificationId);

      if (existingChatId) {
        await markAsSeen(notificationId);
        return navigate(`/chat/${existingChatId}`);
      }

      const res = await axios.post(
        `${API_BASE}/api/chat/init`,
        { bookId, userId: otherUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const chatId = res.data?._id;
      if (!chatId) throw new Error('Chat ID missing from response');

      await markAsSeen(notificationId);
      navigate(`/chat/${chatId}`);
    } catch (err) {
      console.error('❌ Failed to navigate to chat:', err);
      const msg = err?.response?.data?.error || 'Chat could not be opened. Please try again later.';
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  // ✅ Bulk delete inactive (seen) notifications
  const clearInactiveNotifications = async () => {
    const inactiveCount = notifications.filter(n => n.seen).length;

    if (inactiveCount === 0) {
      return alert("No inactive notifications to delete.");
    }

    if (!confirm(`Delete ${inactiveCount} inactive notification(s)?`)) return;

    try {
      await axios.delete(`${API_BASE}/api/users/notifications/clear/inactive`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications((prev) => prev.filter((n) => !n.seen));
    } catch (err) {
      console.error('❌ Failed to clear inactive notifications:', err);
      alert("Failed to delete inactive notifications. Check console for details.");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'book-request': return '📘';
      case 'book-accepted': return '✅';
      case 'book-rejected': return '❌';
      case 'chat-started': return '💬';
      case 'book-withdraw': return '↩️';
      default: return '🔔';
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading notifications...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-md rounded-xl">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">🔔 Notifications</h2>

      {notifications.filter(n => n.seen).length > 0 && (
        <button
          onClick={clearInactiveNotifications}
          className="mb-4 text-sm px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200"
        >
          Clear All Inactive Notifications
        </button>
      )}

      {notifications.length === 0 ? (
        <p className="text-gray-500">You have no notifications yet.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={`border p-4 rounded-md transition-all relative ${
                n.seen ? 'bg-gray-100' : 'bg-yellow-50'
              }`}
            >
              <div className="text-sm text-gray-800">
                {getNotificationIcon(n.type)} {n.message}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Unknown time'}
              </div>

              {n.type === 'book-request' && n.book && n.from && n.requestId && !n.seen && (
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={processingId === n._id}
                    onClick={() =>
                      respondToRequest('accept', n.book._id, n.requestId, n._id)
                    }
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    disabled={processingId === n._id}
                    onClick={() =>
                      respondToRequest('reject', n.book._id, n.from._id, n._id)
                    }
                    className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}

              {['book-accepted', 'chat-started'].includes(n.type) && n.book && n.from && (
                <div className="mt-2">
                  <button
                    disabled={processingId === n._id}
                    onClick={() =>
                      navigateToChat(n.book._id, n.from._id, n._id, n.chat?._id)
                    }
                    className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Go to Chat
                  </button>
                </div>
              )}

              {n.type !== 'book-request' &&
                !['book-accepted', 'chat-started'].includes(n.type) && (
                  <div className="mt-2 text-xs italic text-gray-400">
                    No action needed
                  </div>
                )}

              <button
                onClick={() => deleteNotification(n._id)}
                className="absolute top-2 right-2 text-xs text-gray-400 hover:text-red-600"
                title="Clear notification"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
