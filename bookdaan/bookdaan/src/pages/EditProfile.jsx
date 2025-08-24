import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EditProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [form, setForm] = useState({
    name: '',
    email: '',
    bio: '',
    location: '',
    interests: '',
    photo: '',
  });

  const [originalPhone, setOriginalPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/users/${id}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { name, email, bio, location, interests, phone, photo } = res.data;
        setForm({
          name,
          email,
          bio,
          location,
          interests: interests?.join(', ') || '',
          photo: photo || '',
        });
        setOriginalPhone(phone);
        setNewPhone(phone);
      } catch (err) {
        console.error('❌ Error fetching profile:', err);
        setMessage('Failed to load profile.');
      }
    };
    fetchProfile();
  }, [id]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setFirebaseUid(user.uid);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => console.log('reCAPTCHA solved'),
    });

    window.recaptchaVerifier.render().catch(console.error);
  };

  const handleSendOtp = async () => {
    if (!newPhone || newPhone === originalPhone) {
      return setMessage('⚠️ Please enter a new phone number.');
    }

    setupRecaptcha();

    try {
      const result = await signInWithPhoneNumber(auth, newPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setMessage(`✅ OTP sent to ${newPhone}`);

      // Start cooldown
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
      console.error('OTP error:', err);
      setMessage('❌ Failed to send OTP. Use format: +91XXXXXXXXXX');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return setMessage('⚠️ Enter the OTP.');

    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      setFirebaseUid(user.uid); // ✅ Capture the new UID after phone number is verified
      setOtpVerified(true);
      setMessage('✅ Phone number verified');
    } catch (err) {
      console.error('OTP verify error:', err);
      setMessage('❌ Invalid OTP or verification failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPhone !== originalPhone && !otpVerified) {
      return setMessage('⚠️ Please verify your new phone number.');
    }

    try {
      setLoading(true);

      let photoUrl = form.photo;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadRes = await axios.post(`${API_BASE}/api/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        photoUrl = uploadRes.data.imageUrl;
      }

      const payload = {
        ...form,
        phone: newPhone,
        firebaseUid,
        photo: photoUrl,
        interests: form.interests
          .split(',')
          .map((i) => i.trim())
          .filter(Boolean),
      };

      await axios.patch(`${API_BASE}/api/users/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate(`/profile/${id}`);
    } catch (err) {
      console.error('Submit error:', err);
      setMessage(err?.response?.data?.error || '❌ Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">✏️ Edit Profile</h1>

      {message && <p className="mb-4 text-sm text-blue-600">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {['name', 'email', 'bio', 'location', 'interests'].map((field) => (
          <div key={field}>
            <label className="block mb-1 font-semibold capitalize">{field}</label>
            <input
              type="text"
              name={field}
              value={form[field]}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        ))}

        {/* Profile Picture */}
        <div>
          <label className="block font-semibold mb-1">Profile Picture</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setSelectedFile(e.target.files[0]);
              setForm((prev) => ({ ...prev, photo: '' }));
            }}
          />
          <div className="mt-2 flex items-center gap-4">
            {selectedFile ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-full border"
              />
            ) : form.photo ? (
              <>
                <img
                  src={`${API_BASE}${form.photo}`}
                  alt="Current"
                  className="w-32 h-32 object-cover rounded-full border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, photo: '' }));
                    setSelectedFile(null);
                  }}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove Photo
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">No profile picture uploaded</p>
            )}
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block font-semibold mb-1">Phone</label>
          <input
            type="text"
            value={newPhone}
            onChange={(e) => {
              setNewPhone(e.target.value);
              setOtp('');
              setOtpVerified(false);
              setConfirmationResult(null);
            }}
            className="w-full border px-3 py-2 rounded"
          />
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={cooldown}
            className={`mt-2 px-4 py-1 rounded text-white ${
              cooldown ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
          >
            {cooldown ? `Wait ${timer}s` : 'Send OTP'}
          </button>
        </div>

        {/* OTP Verification */}
        {confirmationResult && !otpVerified && (
          <div>
            <label className="block mb-1 font-semibold">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              className="mt-2 bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
            >
              Verify OTP
            </button>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </form>

      <div id="recaptcha-container" />
    </div>
  );
};

export default EditProfile;
