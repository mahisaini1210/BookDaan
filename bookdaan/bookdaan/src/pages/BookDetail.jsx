import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [book, setBook] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUserId(decoded.id || decoded._id || decoded.firebaseUid);
      } catch {
        setCurrentUserId(null);
      }
    }
  }, [token]);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/books/${id}`);
        setBook(res.data);
      } catch (err) {
        console.error('Error loading book:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  const isOwner = currentUserId && book?.owner?._id === currentUserId;
  const isRequestedByCurrentUser = book?.requestedBy?._id === currentUserId;

  const secureAction = async (endpoint, confirmMsg) => {
    if (!token) return alert('❗ Please log in first.');
    if (confirmMsg && !window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      await axios.post(`${API_BASE}/api/books/${id}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await axios.get(`${API_BASE}/api/books/${id}`);
      setBook(res.data);
    } catch (err) {
      alert(err?.response?.data?.error || `❌ ${endpoint} failed`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API_BASE}/api/books/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('✅ Book deleted successfully.');
      navigate('/');
    } catch (err) {
      alert('❌ Failed to delete the book.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <p className="text-center text-gray-600">Loading...</p>;
  if (!book) return <p className="text-center text-red-500">Book not found.</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold text-indigo-600 mb-4">{book.title}</h2>

      {book.cover && (
        <img
          src={`${API_BASE}${book.cover}`}
          alt={book.title}
          className="w-48 h-auto mb-4 rounded-lg border"
        />
      )}

      <div className="space-y-2 text-gray-800 mb-4">
        <p><strong>Author:</strong> {book.author}</p>
        <p><strong>Subject:</strong> {book.subject}</p>
        <p><strong>Class:</strong> {book.classLevel}</p>
        <p><strong>Genre:</strong> {book.genre}</p>
        <p><strong>Language:</strong> {book.bookLanguage}</p>
        <p><strong>Condition:</strong> {book.condition}</p>
        <p><strong>Status:</strong> <span className="font-semibold text-indigo-600">{book.status}</span></p>
        <p><strong>Location:</strong> {book.location}</p>
        <p><strong>Contact Info:</strong> {book.contact}</p>
        {book.owner && (
          <p>
            <strong>Owner:</strong>{' '}
            <Link to={`/profile/${book.owner._id}`} className="text-blue-600 hover:underline">
              {book.owner.name}
            </Link>
          </p>
        )}
        {book.donatedTo && (
          <p><strong>Donated To:</strong> {book.donatedTo.name}</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <Link
          to="/"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition"
        >
          ⬅️ Back
        </Link>

        {isOwner && (
          <>
            <Link
              to={`/edit/${book._id}`}
              className="bg-yellow-400 hover:bg-yellow-500 text-white font-medium py-2 px-4 rounded-md transition"
            >
              ✏️ Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50"
            >
              🗑️ Delete
            </button>
          </>
        )}

        {!isOwner && token && book.status === 'Available' && !isRequestedByCurrentUser && (
          <button
            onClick={() => secureAction('request')}
            disabled={actionLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50"
          >
            📥 Request Book 
          </button>
        )}

        {!isOwner && isRequestedByCurrentUser && book.status === 'Requested' && (
          <button
            onClick={() => secureAction('withdraw', 'Withdraw your request?')}
            disabled={actionLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50"
          >
            ↩️ Withdraw Request
          </button>
        )}

        {book.status === 'Donated' && (
          <span className="text-gray-500 italic">📦 This book has been donated.</span>
        )}
      </div>

      {/* Owner approval actions */}
      {isOwner && book.status === 'Requested' && book.requestedBy && (
        <div className="mt-8 border-t pt-4">
          <h4 className="text-lg font-semibold mb-3">📋 Pending Request</h4>
          <p>
            <strong>Requested By:</strong>{' '}
            {book.requestedBy.name || book.requestedBy.email || book.requestedBy._id}
          </p>
          <div className="space-x-2 mt-2">
            <button
              onClick={() => secureAction('mark-donated')}
              disabled={actionLoading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              ✅ Mark as Donated
            </button>
            <button
              onClick={() => secureAction('reject')}
              disabled={actionLoading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              ❌ Reject Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetail;
