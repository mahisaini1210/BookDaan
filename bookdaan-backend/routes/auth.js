import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// ⚠️ In-memory OTP store (use Redis or DB in production)
const otpStore = new Map();

/**
 * 🔐 Login/Register
 */
router.post('/verify', async (req, res) => {
  const {
    firebaseUid,
    phone,
    name = '',
    email = '',
    bio = '',
    location = '',
    interests = [],
    mode = 'login',
  } = req.body;

  if (!firebaseUid || !phone) {
    return res.status(400).json({ error: 'Missing firebaseUid or phone' });
  }

  try {
    let user = await User.findOne({ firebaseUid });

    if (!user && mode === 'login') {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    if (!user && mode === 'register') {
      user = await User.create({
        firebaseUid,
        phone,
        name,
        email,
        bio,
        location,
        interests: Array.isArray(interests)
          ? interests
          : interests.split(',').map(i => i.trim()),
      });
    }

    if (!user) {
      return res.status(500).json({ error: 'User creation or lookup failed' });
    }

    const token = jwt.sign(
      { id: user._id, firebaseUid: user.firebaseUid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token, user });
  } catch (err) {
    console.error('❌ Auth error:', err);
    return res.status(500).json({
      error: 'Authentication failed',
      details: err.message,
    });
  }
});

/**
 * 📲 Send OTP
 */
router.post('/send-otp', (req, res) => {
  const { phone, purpose = 'login' } = req.body;

  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresIn = 5 * 60 * 1000; // 5 minutes

  otpStore.set(`${phone}:${purpose}`, {
    otp,
    expires: Date.now() + expiresIn,
  });

  console.log(`📨 OTP for ${phone} [${purpose}]: ${otp}`);
  return res.json({ message: 'OTP sent successfully' });
});

/**
 * ✅ Verify OTP & optionally update phone/firebaseUid
 */
router.post('/verify-otp', async (req, res) => {
  const { phone, otp, purpose = 'login', firebaseUid } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

  const otpKey = `${phone}:${purpose}`;
  const record = otpStore.get(otpKey);

  if (!record || record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  if (Date.now() > record.expires) {
    otpStore.delete(otpKey);
    return res.status(400).json({ error: 'OTP expired' });
  }

  otpStore.delete(otpKey);

  if (purpose === 'update-phone') {
    if (!token) return res.status(401).json({ error: 'Token required to update phone' });
    if (!firebaseUid) return res.status(400).json({ error: 'Firebase UID required' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Check for duplicate firebaseUid
      const existingUser = await User.findOne({ firebaseUid });
      if (existingUser && existingUser._id.toString() !== decoded.id) {
        return res.status(400).json({ error: 'This Firebase UID is already in use by another user' });
      }

      await User.findByIdAndUpdate(decoded.id, {
        phone,
        firebaseUid,
      });

      return res.json({ success: true, message: 'Phone and Firebase UID updated' });
    } catch (err) {
      console.error('❌ Phone update error:', err);
      return res.status(500).json({
        error: 'Failed to update phone/Firebase UID',
        details: err.message,
      });
    }
  }

  return res.json({ success: true, message: 'OTP verified successfully' });
});

export default router;
