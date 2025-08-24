import mongoose from 'mongoose';
import notificationSchema from './Notification.js'; // 🔔 Reusable notification schema

const userSchema = new mongoose.Schema({
  firebaseUid:  { type: String, unique: true, sparse: true },
  phone:        { type: String, unique: true, sparse: true, trim: true },
  name:         { type: String, required: true, trim: true, default: '' },
  email:        { type: String, unique: true, sparse: true, trim: true, default: '' },
  password:     { type: String, default: '' }, // Optional: Used only if email/password login allowed

  bio:          { type: String, default: '' },
  location:     { type: String, trim: true, default: '' },
  interests:    { type: [String], default: [] },

  photo:        { type: String, default: '' },

  following:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  followers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],

  donatedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: [] }],

  notifications: { type: [notificationSchema], default: [] } // 🛎️ In-app notifications
}, { timestamps: true });

export default mongoose.model('User', userSchema);
