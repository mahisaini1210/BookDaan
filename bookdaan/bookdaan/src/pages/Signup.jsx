import React, { useState, useEffect, useContext } from 'react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Signup = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    bio: '',
    location: '',
    interests: '',
  });

  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [timer, setTimer] = useState(60);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => console.log('reCAPTCHA verified'),
        'expired-callback': () => console.warn('reCAPTCHA expired'),
      });
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const sendOTP = async () => {
    const { name, phone, email } = form;

    if (!name.trim() || !email.trim()) {
      return setMessage('❗ Name and Email are required.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setMessage('❗ Enter a valid email address.');
    }

    if (!phone.startsWith('+') || phone.length < 10) {
      return setMessage('❗ Phone must include country code (e.g. +91).');
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setMessage('✅ OTP sent successfully!');

      // Start cooldown timer
      setCooldown(true);
      setTimer(60);
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCooldown(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('OTP send failed:', err);
      setMessage('❌ Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!confirmationResult || otp.length !== 6) {
      return setMessage('❗ Enter a valid 6-digit OTP.');
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;

      // ✅ Register user in backend DB
      const res = await axios.post(`${API_BASE}/api/auth/verify`, {
        ...form,
        firebaseUid: firebaseUser.uid,
        phone: firebaseUser.phoneNumber,
        mode: 'register',
      });

      login(res.data.token);
      setMessage('✅ Signed up successfully!');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      console.error('OTP verification failed:', err);
      setMessage('❌ OTP verification failed or user registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-center text-indigo-700 mb-6">
          📱 OTP Phone Sign-Up
        </h2>

        {['name', 'email', 'phone', 'bio', 'location', 'interests'].map((field) => (
          <div key={field} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </label>
            <input
              type="text"
              name={field}
              value={form[field]}
              onChange={handleChange}
              placeholder={field === 'phone' ? '+91XXXXXXXXXX' : `Enter ${field}`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}

        <button
          onClick={sendOTP}
          disabled={loading || cooldown}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold mb-6 transition-all disabled:opacity-50"
        >
          {cooldown ? `Wait ${timer}s` : loading ? 'Sending OTP...' : 'Send OTP'}
        </button>

        {confirmationResult && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={verifyOTP}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP & Complete Signup'}
            </button>
          </>
        )}

        {message && (
          <p
            className={`text-center mt-4 font-medium ${
              message.startsWith('✅') ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {message}
          </p>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default Signup;
