import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Navbar = () => {
  const { userToken, logout } = useContext(AuthContext);
  const [userId, setUserId] = useState(null);
  const [unseenCount, setUnseenCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Decode user from token
  useEffect(() => {
    if (userToken) {
      try {
        const decoded = jwtDecode(userToken);
        const id = decoded?.id || decoded?.firebaseUid || null;
        setUserId(id);
      } catch (err) {
        console.error('Token decode error:', err);
        logout();
      }
    } else {
      setUserId(null);
    }
  }, [userToken]);

  // Fetch unseen notifications
  useEffect(() => {
    const fetchUnseenNotifications = async () => {
      if (!userToken) return;

      try {
        const res = await axios.get(`${API_BASE}/api/users/notifications`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });

        const unseen = Array.isArray(res.data)
          ? res.data.filter((n) => !n.seen).length
          : 0;

        setUnseenCount(unseen);
      } catch (err) {
        console.error('🔔 Notification fetch error:', err?.message || err);
      }
    };

    fetchUnseenNotifications();
  }, [userToken, location.pathname, userId]); // triggers on route or identity change

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-[#c0cad9] shadow-md rounded-xl mb-6">
      {/* 🔗 Left: Navigation */}
      <div className="flex gap-8 text-lg font-semibold text-[#2e3a59]">
        <Link to="/" className="hover:text-[#1f2a44] hover:underline underline-offset-4 transition">
          🏠 Home
        </Link>
        <Link to="/add" className="hover:text-[#1f2a44] hover:underline underline-offset-4 transition">
          ➕ Add Book
        </Link>
        {userId && (
          <>
            <Link to={`/profile/${userId}`} className="hover:text-[#1f2a44] hover:underline underline-offset-4 transition">
              🙍 Profile
            </Link>
            <Link to="/notifications" className="relative hover:text-[#1f2a44] transition">
              <span className="text-xl">🔔</span>
              {unseenCount > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                </>
              )}
            </Link>
          </>
        )}
      </div>

      {/* 👤 Right: Auth Controls */}
      <div className="flex gap-6 text-md font-medium text-[#2e3a59]">
        {!userId ? (
          <>
            <Link to="/login" className="hover:text-[#1f2a44] hover:underline underline-offset-4 transition">
              🔑 Login
            </Link>
            <Link to="/signup" className="hover:text-[#1f2a44] hover:underline underline-offset-4 transition">
              📝 Signup
            </Link>
          </>
        ) : (
          <button
            onClick={handleLogout}
            className="hover:text-[#1f2a44] hover:underline underline-offset-4 transition"
          >
            🚪 Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
