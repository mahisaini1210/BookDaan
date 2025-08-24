import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Razorpay from 'razorpay';

import bookRoutes from './routes/books.js';
import uploadRoute from './routes/upload.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chat.js';

import Chat from './models/Chat.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ENV setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!MONGO_URI || !JWT_SECRET || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ Missing environment variables in .env or Render Environment tab');
  process.exit(1);
}

// ✅ Handle multiple origins
const allowedOrigins = CLIENT_ORIGIN.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked for origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
}));

// Express middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/health', (_, res) => {
  res.json({ status: 'UP' });
});

// Razorpay setup
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`
    });
    res.json(order);
  } catch (err) {
    console.error('Razorpay error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Routes
app.use('/api/upload', uploadRoute);
app.use('/api/books', bookRoutes); // 🟢 Must contain /search route
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

// Fallback for invalid API routes
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  next();
});

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ Socket.IO CORS blocked for: ${origin}`);
        callback(null, false);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('🔌 A user connected');

  socket.on('joinChat', async ({ bookId }) => {
    socket.join(bookId);
    try {
      const chat = await Chat.findOne({ book: bookId, active: true }).populate('messages.sender', 'name');
      const history = chat?.messages.map(m => ({
        senderId: m.sender._id,
        senderName: m.sender.name,
        text: m.text,
        createdAt: m.createdAt,
      })) || [];
      socket.emit('chatHistory', history);
    } catch (err) {
      console.error('Error fetching chat history:', err.message);
    }
  });

  socket.on('sendMessage', async ({ bookId, senderId, text }) => {
    try {
      const message = { sender: senderId, text, createdAt: new Date() };
      const chat = await Chat.findOneAndUpdate(
        { book: bookId, active: true },
        { $push: { messages: message } },
        { new: true, upsert: true }
      );
      const sender = await User.findById(senderId);
      const newMessage = {
        senderId: sender._id,
        senderName: sender.name,
        text,
        createdAt: message.createdAt,
      };
      io.to(bookId).emit('newMessage', newMessage);
    } catch (err) {
      console.error('Error sending message:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

// Connect to MongoDB and start server
mongoose.set('strictQuery', true);

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected');
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
