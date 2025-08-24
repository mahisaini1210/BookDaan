import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { MapPin, User2, BookText } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookCard = ({ book, currentUserId, onStatusChange }) => {
  const token = localStorage.getItem('token');

  const isOwner =
    currentUserId &&
    book.owner &&
    (book.owner._id === currentUserId || book.owner === currentUserId);

  const [requested, setRequested] = useState(false);

  useEffect(() => {
    console.log('📦 Book:', book);
    console.log('📋 Requests:', book.requests);

    const userRequest = book.requests?.find(
      (r) =>
        (r.user === currentUserId || r.user?._id === currentUserId) &&
        r.status === 'Pending'
    );
    setRequested(!!userRequest);
  }, [book, currentUserId]);

  const handleRequest = async () => {
    if (!token) return alert('Please login to perform this action.');
    try {
      await axios.post(`${API_BASE}/api/books/${book._id}/request`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequested(true);
      onStatusChange?.();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || '❌ Request failed');
    }
  };

  const handleWithdraw = async () => {
    if (!token) return alert('Please login to perform this action.');
    try {
      await axios.post(`${API_BASE}/api/books/${book._id}/withdraw`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequested(false);
      onStatusChange?.();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || '❌ Withdraw failed');
    }
  };

  const handleAction = async (action, targetId) => {
    if (!token) return alert('Please login to perform this action.');
    try {
      await axios.post(`${API_BASE}/api/books/${book._id}/${action}/${targetId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onStatusChange?.();
    } catch (err) {
      console.error(`${action} Error:`, err);
      alert(err.response?.data?.error || `❌ Failed to ${action} request`);
    }
  };

  const handlePayment = async () => {
    if (!token) return alert('Please login to perform this action.');

    try {
      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: book.price || 100 }), // fallback ₹100
      });

      const order = await res.json();

      const options = {
  key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: order.currency,
  name: "BookBazaar",
  description: `Payment for "${book.title}"`,
  order_id: order.id,
  handler: function (response) {
    alert("✅ Payment Successful!");
    console.log("Razorpay Response:", response);
  },
  prefill: {
    name: "Demo User",
    email: "demo@example.com",
    contact: "9999999999",
  },
  theme: {
    color: "#2563eb",
  },
  method: {
    upi: true,
    card: false,
    netbanking: false,
    wallet: false,
    emi: false,
  },
  method_options: {
    upi: {
      flow: "collect", // 'intent' also works for GPay etc
    }
  },
  config: {
    display: {
      blocks: {
        upi: {
          name: "Pay using UPI",
          instruments: [
            {
              method: "upi"
            }
          ]
        }
      },
      sequence: ["upi"],
      preferences: {
        show_default_blocks: false
      }
    }
  }
};



      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('❌ Razorpay Error:', err);
      alert('❌ Payment failed');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-300 p-6 flex flex-col justify-between">
      <div>
        <h3 className="text-2xl font-bold text-[#1e293b] mb-2 hover:text-[#2563eb] transition">
          <Link to={`/book/${book._id}`}>{book.title}</Link>
        </h3>

        <p className="flex items-center text-sm text-[#475569] mb-1">
          <User2 size={16} className="mr-2 text-[#94a3b8]" />
          {book.author}
        </p>

        <p className="flex items-center text-sm text-[#475569] mb-1">
          <MapPin size={16} className="mr-2 text-[#94a3b8]" />
          {book.location}
        </p>

        {book.subject && (
          <p className="flex items-center text-sm text-[#475569]">
            <BookText size={16} className="mr-2 text-[#94a3b8]" />
            {book.subject}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2 flex-wrap items-center">
        <Link
          to={`/book/${book._id}`}
          className="text-sm px-4 py-2 bg-[#2563eb] text-white rounded-xl hover:bg-[#1e40af] transition"
        >
          View Details
        </Link>

        {!isOwner && token && book.status !== 'Donated' && (
          <>
            {!requested ? (
              <button
                onClick={handleRequest}
                className="text-sm px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
              >
                Request Book
              </button>
            ) : (
              <button
                onClick={handleWithdraw}
                className="text-sm px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
              >
                Withdraw Request
              </button>
            )}

            <button
              onClick={handlePayment}
              className="text-sm px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
            >
              Pay Now
            </button>
          </>
        )}

        {isOwner && book.status !== 'Donated' && book.requests?.length > 0 && (
          <div className="flex flex-col gap-2">
            {book.requests.map((req) =>
              req.status === 'Pending' ? (
                <div key={req._id} className="flex gap-3 items-center">
                  {typeof req.user === 'object' && req.user ? (
                    <div className="flex items-center gap-2">
                      {req.user.photo ? (
                        <img
                          src={
                            req.user.photo.startsWith('http')
                              ? req.user.photo
                              : `${API_BASE}${req.user.photo}`
                          }
                          alt={req.user.name || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-gray-700">
                          👤 {req.user.name || 'User'}
                        </span>
                      )}
                      {req.user.photo && (
                        <span className="text-sm text-gray-800">{req.user.name}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm italic text-gray-500">Unknown User</span>
                  )}

                  <button
                    onClick={() => handleAction('accept', req._id)}
                    className="text-sm px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleAction('reject', req.user?._id || req.user)}
                    className="text-sm px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Reject
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}

        {book.status === 'Donated' && (
          <span className="text-sm italic text-gray-500">
            ✅ Already Donated
          </span>
        )}
      </div>
    </div>
  );
};

export default BookCard;
