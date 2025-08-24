import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

const chatSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true,
  },
  participants: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    validate: [
      (arr) => arr.length === 2,
      'Chat must have exactly 2 participants',
    ],
    index: true,
  },
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      text: {
        type: String,
        required: true,
        trim: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  active: {
    type: Boolean,
    default: true,
  },
  terminated: {
    type: Boolean,
    default: false,
  },
  terminatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// 🔄 Normalize participant order for consistent indexing
chatSchema.pre('save', function (next) {
  if (this.participants?.length === 2) {
    this.participants = this.participants
      .map(id => id.toString())
      .sort()
      .map(id => new ObjectId(id));
  }
  next();
});

// ✅ Unique index on active chats only — avoids duplication
chatSchema.index(
  { book: 1, participants: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

export default mongoose.model('Chat', chatSchema);
