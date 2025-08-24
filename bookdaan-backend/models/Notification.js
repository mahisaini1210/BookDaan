import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'book-request',
      'book-withdraw',
      'book-accepted',
      'book-rejected',
      'chat-started'
    ],
    required: true,
  },
  message: { 
    type: String, 
    required: true 
  },
  book: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Book', 
    required: true 
  },
  from: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  requestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Book.requests', 
    // only present on book-request notifications
  },
  chat: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  seen: { 
    type: Boolean, 
    default: false 
  },
});

// No model export here—this schema gets embedded in User.notifications
export default notificationSchema;
