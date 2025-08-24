import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import BookCard from '../components/BookCard';

const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { id } = useParams();
  const token = localStorage.getItem('token');

  const [profile, setProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (token) {
      const decoded = decodeJWT(token);
      setCurrentUserId(decoded.id || decoded._id || decoded.firebaseUid || null);
    }
  }, [token]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/users/${id}/profile`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setProfile(res.data);
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id, token]);

  useEffect(() => {
    if (profile && currentUserId) {
      setIsFollowing(
        profile.followers?.some((f) => f._id === currentUserId)
      );
    }
  }, [profile, currentUserId]);

  const handleFollowToggle = async () => {
    if (!token) return alert('Please login first');

    try {
      const action = isFollowing ? 'unfollow' : 'follow';
      await axios.post(
        `${API_BASE}/api/users/${id}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile((prev) => ({
        ...prev,
        followers: isFollowing
          ? prev.followers.filter((f) => f._id !== currentUserId)
          : [...prev.followers, { _id: currentUserId }],
      }));
    } catch (err) {
      console.error('Follow/unfollow error:', err);
    }
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading profile...</p>;
  if (!profile) return <p className="text-center mt-10 text-red-500">Failed to load profile.</p>;

  const profileImage = profile.photo
    ? `${API_BASE}${profile.photo}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="relative bg-indigo-100 h-44 rounded-xl mb-24 shadow-sm"></div>

      <div className="bg-white rounded-xl shadow-lg px-8 py-6 -mt-36 relative z-10 border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <img
              src={profileImage}
              alt="avatar"
              className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
            />
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                {profile.name || 'Unnamed User'}
              </h1>
              <p className="text-gray-500">{profile.email || 'No email provided'}</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-0">
            {currentUserId === id ? (
              <Link
                to={`/profile/${id}/edit`}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
              >
                ✏️ Edit Profile
              </Link>
            ) : (
              currentUserId && (
                <button
                  onClick={handleFollowToggle}
                  className={`px-4 py-2 text-white rounded transition ${
                    isFollowing
                      ? 'bg-gray-500 hover:bg-gray-600'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center mb-6">
          {[
            ['Followers', profile.followers?.length || 0],
            ['Following', profile.following?.length || 0],
            ['Donated', profile.donatedBooks?.length || 0],
            ['Requested', profile.requestedBooks?.length || 0],
          ].map(([label, count]) => (
            <div key={label}>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-gray-500 text-sm">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-4">
          {['overview', 'donated', 'requested'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 font-medium capitalize transition-all ${
                tab === t
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-indigo-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="text-sm text-gray-700">
          {tab === 'overview' && (
            <div className="space-y-3">
              <p><strong>📞 Phone:</strong> {profile.phone || 'N/A'}</p>
              <p><strong>📍 Location:</strong> {profile.location || 'N/A'}</p>
              <p><strong>📝 Bio:</strong> {profile.bio || 'No bio provided'}</p>
              <p><strong>🎯 Interests:</strong> {profile.interests?.join(', ') || 'None'}</p>

              <div className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500">🏅</span>
                  <h3 className="font-semibold text-gray-800">Badges</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {profile.badges?.length > 0 ? (
                    profile.badges.map((badge, i) => (
                      <span
                        key={i}
                        className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {badge}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">No badges yet</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'donated' && (
            <div className="grid gap-4 mt-4">
              {profile.donatedBooks.length > 0 ? (
                profile.donatedBooks.map((book) => (
                  <BookCard key={book._id} book={book} currentUserId={currentUserId} />
                ))
              ) : (
                <p className="text-gray-500">No donated books.</p>
              )}
            </div>
          )}

          {tab === 'requested' && (
            <div className="grid gap-4 mt-4">
              {profile.requestedBooks.length > 0 ? (
                profile.requestedBooks.map((book) => (
                  <BookCard key={book._id} book={book} currentUserId={currentUserId} />
                ))
              ) : (
                <p className="text-gray-500">No requested books.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
