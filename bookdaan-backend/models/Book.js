import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Withdrawn'],
    default: 'Pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: String,
  subject: String,
  classLevel: String,
  location: String,
  contact: String,
  cover: String,
  isbn: String,
  genre: String,

  bookLanguage: String, // ✅ RENAMED from "language" to avoid MongoDB issue

  condition: {
    type: String,
    enum: ['New', 'Good', 'Acceptable'],
    default: 'Good'
  },

  status: {
    type: String,
    enum: ['Available', 'Requested', 'Donated'],
    default: 'Available'
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  requests: [requestSchema],

  acceptedRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  donatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

bookSchema.index({
  title: 'text',
  author: 'text',
  isbn: 'text',
  subject: 'text'
});

export default mongoose.model('Book', bookSchema);
